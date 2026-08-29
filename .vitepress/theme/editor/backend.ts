import { branchNameFor, canPush, getFile, openPullRequest } from '../../../utils/github'
import { currentMember, editorConfigured, githubToken, NotLinkedError } from './auth'

const REPO = { owner: 'nbtca', name: 'documents' }

// Locally the editor writes the file it is showing, so a save re-renders
// through HMR. Deployed, it opens a pull request instead.
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

export async function submit(
  path: string,
  edit: { content: string, sha: string, summary: string, author: string },
): Promise<Submitted> {
  if (localMode) {
    await local(`/__edit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content: edit.content }),
    })
    return { label: '已写入本地文件，页面稍后自动刷新' }
  }

  const pull = await openPullRequest(await githubToken(), REPO, {
    path,
    content: edit.content,
    sha: edit.sha,
    title: `docs: ${edit.summary}`,
    body: `${edit.summary}\n\n由 ${edit.author} 在 docs.nbtca.space 上编辑。`,
    branch: branchNameFor(path),
  })

  return { label: `已提交 #${pull.number}`, url: pull.url }
}
