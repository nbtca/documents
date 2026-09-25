import type { Manifest } from '../../../utils/asset-manifest'
import type { FileChange } from '../../../utils/github'
import { addAsset } from '../../../utils/asset-manifest'
import { branchNameFor, ensureFork, getFile, GitHubError, headSha, openPullRequest } from '../../../utils/github'
import { tidyBody } from '../../../utils/markdown'
import { isRemoteAsset, placeRemoteImages, referencedImages } from '../../../utils/remote-asset'
import { currentMember, forgetToken, githubToken } from './auth'

const REPO = { owner: 'nbtca', name: 'documents' }
const REGISTRY = 'checks/asset-registry.json'

export const localMode = import.meta.env.DEV

export interface Loaded {
  content: string
  sha: string
}

export interface Submitted {
  label: string
  url?: string
}

export interface PendingImage {
  path: string
  base64: string
}

export class EditorError extends Error {}

async function local<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  if (!response.ok)
    throw new EditorError(await response.text())
  return response.json() as Promise<T>
}

export interface Me {
  name: string
  picture?: string
}

export async function me(): Promise<Me> {
  if (localMode)
    return { name: '本地开发' }
  return (await currentMember()) ?? { name: '' }
}

// A spent or revoked token only shows up on the first call that uses it.
async function withToken<T>(use: (token: string) => Promise<T>): Promise<T> {
  try {
    return await use(await githubToken())
  }
  catch (error) {
    if (error instanceof GitHubError && error.status === 401) {
      forgetToken()
      throw new EditorError('登录已失效，请重新登录。')
    }
    throw error
  }
}

export async function load(path: string): Promise<Loaded> {
  if (localMode)
    return local<Loaded>(`/__edit?path=${encodeURIComponent(path)}`)

  return withToken(token => getFile(token, REPO, path))
}

// Recorded when the sheet opens, so the branch can be cut from what the
// writer actually read rather than from wherever main has moved to since.
export async function startedAt(): Promise<string | undefined> {
  if (localMode)
    return undefined
  return withToken(token => headSha(token, REPO))
}

// A new page is written blind; an occupied path must be refused, not taken.
export async function taken(path: string): Promise<boolean> {
  if (localMode) {
    return local<Loaded>(`/__edit?path=${encodeURIComponent(path)}`)
      .then(() => true)
      .catch(() => false)
  }

  return withToken(token => getFile(token, REPO, path)
    .then(() => true)
    .catch((error) => {
      if (error instanceof GitHubError && error.status === 404)
        return false
      throw error
    }))
}

async function registryWith(token: string | undefined, images: PendingImage[]): Promise<FileChange> {
  const raw = token
    ? (await getFile(token, REPO, REGISTRY)).content
    : (await local<Loaded>(`/__edit?path=${encodeURIComponent(REGISTRY)}`)).content

  let manifest = JSON.parse(raw) as Manifest
  for (const image of images)
    manifest = addAsset(manifest, image.path)

  return { path: REGISTRY, content: `${JSON.stringify(manifest, null, 2)}\n` }
}

function changesFor(
  path: string,
  content: string,
  images: PendingImage[],
  registry: FileChange | undefined,
): FileChange[] {
  const files: FileChange[] = [{ path, content: tidyBody(content) }]
  if (registry)
    files.push(registry)
  for (const image of images)
    files.push({ path: image.path, content: image.base64, base64: true })
  return files
}

const SITE = 'https://docs.nbtca.space'

function bodyFor(edit: { summary: string, author: string, checklist?: string[], uploaded?: string[] }): string {
  const opening = `${edit.summary}\n\n由 ${edit.author} 在 docs.nbtca.space 上编辑。`
  const uploaded = edit.uploaded?.length
    ? `\n\n图片已上传，合并前即可打开：\n\n${edit.uploaded.map(url => `- ${SITE}${url}`).join('\n')}`
    : ''
  const checklist = edit.checklist?.length
    ? `\n\n合并前请确认：\n\n${edit.checklist.map(item => `- [ ] ${item}`).join('\n')}`
    : ''
  return opening + uploaded + checklist
}

// The draft cites a repo path until submit. Uploading then, and only then,
// keeps an abandoned edit out of the bucket. The bytes go as JSON so the
// request is not a raw image body, which the Pages runtime can drop.
async function uploadImage(token: string, image: PendingImage): Promise<string> {
  const response = await fetch('/api/assets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base64: image.base64 }),
  })

  const body = await response.json().catch(() => undefined) as { url?: string, message?: string } | undefined
  if (response.status === 401) {
    forgetToken()
    throw new EditorError('登录已失效，请重新登录。')
  }
  if (!response.ok || !body?.url || !isRemoteAsset(body.url))
    throw new EditorError(body?.message || '图片上传失败，稍后再试。')
  return body.url
}

export async function submit(
  path: string,
  edit: {
    content: string
    summary: string
    author: string
    images: PendingImage[]
    checklist?: string[]
    base?: string
  },
  onStep: (step: string) => void = () => {},
): Promise<Submitted> {
  if (localMode) {
    const registry = edit.images.length ? await registryWith(undefined, edit.images) : undefined
    await local(`/__edit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: changesFor(path, edit.content, edit.images, registry) }),
    })
    return { label: '已写入本地文件，页面稍后自动刷新' }
  }

  return withToken(async (token) => {
    // Images go to R2. The pull request carries the page, not the bytes, so
    // the repository stops growing with every picture.
    let content = edit.content
    let uploaded: string[] | undefined
    if (referencedImages(content, edit.images).length) {
      onStep('正在上传图片……')
      const placed = await placeRemoteImages(content, edit.images, image => uploadImage(token, image))
      content = placed.content
      uploaded = placed.urls
    }

    // A first-time fork is queued and can take half a minute; say so.
    onStep('正在准备你名下的仓库副本……')
    const fork = await ensureFork(token, REPO)

    onStep('正在开 Pull Request……')
    const pull = await openPullRequest(token, REPO, fork, {
      files: changesFor(path, content, [], undefined),
      title: `docs: ${edit.summary}`,
      body: bodyFor({ ...edit, uploaded }),
      branch: branchNameFor(path),
      base: edit.base,
    })

    return { label: `已提交 #${pull.number}`, url: pull.url }
  })
}
