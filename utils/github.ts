const API = 'https://api.github.com'
const FORK_ATTEMPTS = 20
const FORK_INTERVAL_MS = 1500

export interface Repo {
  owner: string
  name: string
}

export interface User {
  login: string
  avatarUrl?: string
}

export interface FileAtRef {
  content: string
  sha: string
}

export interface OpenedPull {
  number: number
  url: string
  branch: string
}

export interface FileChange {
  path: string
  content: string
  base64?: boolean
}

export class GitHubError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'GitHubError'
  }
}

// GitHub's own wording is JSON aimed at whoever wrote the request. Say what
// happened and what to do about it; the body goes to the console for us.
const SAID: Record<number, string> = {
  403: '这次操作被 GitHub 拒绝了，可能是短时间内提交太多。等几分钟再试。',
  404: '找不到这个位置，可能刚被人改动过。刷新页面重新打开，再提交一次。',
  409: '这一页刚被别人改过。刷新页面重新打开，把改动重做一遍再提交。',
  422: 'GitHub 没有接受这次改动，可能同一处已经有人改了。刷新页面再试一次。',
}

function said(status: number): string {
  return SAID[status] ?? `提交没有成功（GitHub 返回 ${status}）。稍后重试，仍旧不行就把这句话告诉维护者。`
}

async function call<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    console.error(`GitHub ${response.status} ${init?.method ?? 'GET'} ${path}`, await response.text())
    throw new GitHubError(response.status, said(response.status))
  }

  return response.json() as Promise<T>
}

// btoa is byte-oriented; this markdown is CJK.
export function encodeContent(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function decodeContent(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// Flattened: an all-CJK filename would leave an empty ref component.
export function branchNameFor(path: string, now = new Date()): string {
  const slug = path
    .replace(/\.md$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  // To the second: a minute-precision stamp collides when the same page is
  // submitted twice in a row, and GitHub refuses the second branch.
  const stamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '')
  return `edit/${slug || 'page'}-${stamp}`
}

export async function getFile(token: string, repo: Repo, path: string, ref = 'main'): Promise<FileAtRef> {
  const file = await call<{ content: string, sha: string }>(
    token,
    `/repos/${repo.owner}/${repo.name}/contents/${encodeURI(path)}?ref=${encodeURIComponent(ref)}`,
  )
  return { content: decodeContent(file.content), sha: file.sha }
}

export async function currentUser(token: string): Promise<User> {
  const user = await call<{ login: string, avatar_url?: string }>(token, '/user')
  return { login: user.login, avatarUrl: user.avatar_url }
}

export async function headSha(token: string, repo: Repo, branch = 'main'): Promise<string> {
  const ref = await call<{ object: { sha: string } }>(
    token,
    `/repos/${repo.owner}/${repo.name}/git/ref/heads/${branch}`,
  )
  return ref.object.sha
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

// A repository of the same name that is not a fork of this one is someone
// else's work; forking gives it a name of GitHub's choosing instead.
async function existingFork(token: string, repo: Repo, login: string): Promise<Repo | undefined> {
  try {
    const mine = await call<{ fork: boolean, parent?: { full_name: string } }>(
      token,
      `/repos/${login}/${repo.name}`,
    )
    // GitHub treats owner and repository names case-insensitively.
    const parent = mine.parent?.full_name.toLowerCase()
    return mine.fork && parent === `${repo.owner}/${repo.name}`.toLowerCase()
      ? { owner: login, name: repo.name }
      : undefined
  }
  catch (error) {
    if (error instanceof GitHubError && error.status === 404)
      return undefined
    throw error
  }
}

// A stale fork 404s a ref pointing at an object it does not hold yet, though
// blob, tree and commit all write. Best effort: the branch cuts from upstream.
async function syncFork(token: string, fork: Repo): Promise<void> {
  try {
    await call(token, `/repos/${fork.owner}/${fork.name}/merge-upstream`, {
      method: 'POST',
      body: JSON.stringify({ branch: 'main' }),
    })
  }
  catch (error) {
    if (!(error instanceof GitHubError))
      throw error
  }
}

export async function ensureFork(
  token: string,
  repo: Repo,
  wait: (ms: number) => Promise<unknown> = sleep,
): Promise<Repo> {
  // POST /forks on an existing fork queues a sync, and ref writes 404 until it
  // finishes. Asking whether it exists costs one GET and starts nothing.
  const { login } = await currentUser(token)
  const already = await existingFork(token, repo, login)
  if (already) {
    await syncFork(token, already)
    return already
  }

  const created = await call<{ owner: { login: string }, name: string }>(
    token,
    `/repos/${repo.owner}/${repo.name}/forks`,
    { method: 'POST' },
  )
  const fork = { owner: created.owner.login, name: created.name }

  // Forking is queued, so a first-time fork 404s for a few seconds.
  for (let attempt = 0; attempt < FORK_ATTEMPTS; attempt++) {
    try {
      await call(token, `/repos/${fork.owner}/${fork.name}/git/ref/heads/main`)
      return fork
    }
    catch (error) {
      if (!(error instanceof GitHubError) || error.status !== 404)
        throw error
      await wait(FORK_INTERVAL_MS)
    }
  }

  throw new GitHubError(202, 'GitHub 还在创建你名下的仓库副本。等半分钟再点一次提交。')
}

// A fork refuses ref writes for a few seconds after the job that created it,
// while objects write fine throughout. This is the one call that waits it out.
async function createRef(
  token: string,
  mine: string,
  ref: string,
  sha: string,
  wait: (ms: number) => Promise<unknown>,
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await call(token, `${mine}/git/refs`, { method: 'POST', body: JSON.stringify({ ref, sha }) })
      return
    }
    catch (error) {
      if (!(error instanceof GitHubError) || error.status !== 404 || attempt >= FORK_ATTEMPTS - 1)
        throw error
      await wait(FORK_INTERVAL_MS)
    }
  }
}

export async function openPullRequest(
  token: string,
  repo: Repo,
  fork: Repo,
  edit: { files: FileChange[], title: string, body: string, branch: string, base?: string },
  wait: (ms: number) => Promise<unknown> = sleep,
): Promise<OpenedPull> {
  const upstream = `/repos/${repo.owner}/${repo.name}`
  const mine = `/repos/${fork.owner}/${fork.name}`

  // Branch from where the writing started, not from wherever main has moved
  // to since. Cutting from the tip would rewrite whatever landed in between
  // as a clean single-file diff, and nothing would report a conflict.
  const base = edit.base
    ?? (await call<{ object: { sha: string } }>(token, `${upstream}/git/ref/heads/main`)).object.sha
  const commit = await call<{ tree: { sha: string } }>(token, `${upstream}/git/commits/${base}`)

  const tree = await Promise.all(edit.files.map(async (file) => {
    const blob = await call<{ sha: string }>(token, `${mine}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: file.content, encoding: file.base64 ? 'base64' : 'utf-8' }),
    })
    return { path: file.path, mode: '100644', type: 'blob', sha: blob.sha }
  }))

  const written = await call<{ sha: string }>(token, `${mine}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: commit.tree.sha, tree }),
  })

  const made = await call<{ sha: string }>(token, `${mine}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message: edit.title, tree: written.sha, parents: [base] }),
  })

  await createRef(token, mine, `refs/heads/${edit.branch}`, made.sha, wait)

  const pull = await call<{ number: number, html_url: string }>(token, `${upstream}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: edit.title,
      head: `${fork.owner}:${edit.branch}`,
      base: 'main',
      body: edit.body,
      maintainer_can_modify: true,
    }),
  })

  return { number: pull.number, url: pull.html_url, branch: edit.branch }
}
