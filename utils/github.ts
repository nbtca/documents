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
    const body = await response.text()
    throw new GitHubError(response.status, body.slice(0, 300))
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
  const stamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, '')
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

export async function ensureFork(
  token: string,
  repo: Repo,
  wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
): Promise<Repo> {
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

  throw new GitHubError(202, 'GitHub 还在创建你的仓库副本，请稍后重试。')
}

export async function openPullRequest(
  token: string,
  repo: Repo,
  fork: Repo,
  edit: { files: FileChange[], title: string, body: string, branch: string },
): Promise<OpenedPull> {
  const upstream = `/repos/${repo.owner}/${repo.name}`
  const mine = `/repos/${fork.owner}/${fork.name}`

  // Forks share the object store, so a stale fork needs no sync first.
  const head = await call<{ object: { sha: string } }>(token, `${upstream}/git/ref/heads/main`)
  const commit = await call<{ tree: { sha: string } }>(token, `${upstream}/git/commits/${head.object.sha}`)

  const tree = await Promise.all(edit.files.map(async (file) => {
    const blob = await call<{ sha: string }>(token, `${mine}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify(
        file.base64
          ? { content: file.content, encoding: 'base64' }
          : { content: file.content, encoding: 'utf-8' },
      ),
    })
    return { path: file.path, mode: '100644', type: 'blob', sha: blob.sha }
  }))

  const written = await call<{ sha: string }>(token, `${mine}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: commit.tree.sha, tree }),
  })

  const made = await call<{ sha: string }>(token, `${mine}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message: edit.title, tree: written.sha, parents: [head.object.sha] }),
  })

  await call(token, `${mine}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${edit.branch}`, sha: made.sha }),
  })

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
