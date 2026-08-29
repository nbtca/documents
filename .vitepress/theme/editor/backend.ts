import type { Manifest } from '../../../utils/asset-manifest'
import type { FileChange } from '../../../utils/github'
import { addAsset } from '../../../utils/asset-manifest'
import { branchNameFor, canPush, getFile, openPullRequest } from '../../../utils/github'
import { currentMember, editorConfigured, githubToken, NotLinkedError } from './auth'

const REPO = { owner: 'nbtca', name: 'documents' }
const REGISTRY = 'checks/asset-registry.json'

export const localMode = import.meta.env.DEV && !editorConfigured

export const editorAvailable = editorConfigured || localMode

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

export async function whoAmI(): Promise<string> {
  if (localMode)
    return '本地开发'
  return (await currentMember())?.name ?? ''
}

export async function load(path: string): Promise<Loaded> {
  if (localMode)
    return local<Loaded>(`/__edit?path=${encodeURIComponent(path)}`)

  let token: string
  try {
    token = await githubToken()
  }
  catch (error) {
    throw error instanceof NotLinkedError
      ? new EditorError('登录时没有授权 GitHub。请退出后重新登录，并选择「Continue with GitHub」。')
      : error
  }

  if (!(await canPush(token, REPO)))
    throw new EditorError('你的 GitHub 账号还没有本仓库的写入权限，请联系社长加入协作者。')

  return getFile(token, REPO, path)
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
  const files: FileChange[] = [{ path, content }]
  if (registry)
    files.push(registry)
  for (const image of images)
    files.push({ path: image.path, content: image.base64, base64: true })
  return files
}

export async function submit(
  path: string,
  edit: { content: string, summary: string, author: string, images: PendingImage[] },
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

  const token = await githubToken()
  const registry = edit.images.length ? await registryWith(token, edit.images) : undefined

  const pull = await openPullRequest(token, REPO, {
    files: changesFor(path, edit.content, edit.images, registry),
    title: `docs: ${edit.summary}`,
    body: `${edit.summary}\n\n由 ${edit.author} 在 docs.nbtca.space 上编辑。`,
    branch: branchNameFor(path),
  })

  return { label: `已提交 #${pull.number}`, url: pull.url }
}
