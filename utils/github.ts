const API = 'https://api.github.com'

export interface Repo {
  owner: string
  name: string
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

// btoa is byte-oriented; markdown here is full-width CJK.
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

// Flattened, so an all-CJK filename cannot leave an empty ref component.
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

export async function currentLogin(token: string): Promise<string> {
  const user = await call<{ login: string }>(token, '/user')
  return user.login
}

export async function canPush(token: string, repo: Repo): Promise<boolean> {
  try {
    const meta = await call<{ permissions?: { push?: boolean } }>(token, `/repos/${repo.owner}/${repo.name}`)
    return meta.permissions?.push === true
  }
  catch {
    return false
  }
}

export async function openPullRequest(
  token: string,
  repo: Repo,
  edit: { path: string, content: string, sha: string, title: string, body: string, branch: string },
): Promise<OpenedPull> {
  const base = await call<{ object: { sha: string } }>(
    token,
    `/repos/${repo.owner}/${repo.name}/git/ref/heads/main`,
  )

  await call(token, `/repos/${repo.owner}/${repo.name}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${edit.branch}`, sha: base.object.sha }),
  })

  await call(token, `/repos/${repo.owner}/${repo.name}/contents/${encodeURI(edit.path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: edit.title,
      content: encodeContent(edit.content),
      sha: edit.sha,
      branch: edit.branch,
    }),
  })

  const pull = await call<{ number: number, html_url: string }>(
    token,
    `/repos/${repo.owner}/${repo.name}/pulls`,
    {
      method: 'POST',
      body: JSON.stringify({ title: edit.title, head: edit.branch, base: 'main', body: edit.body }),
    },
  )

  return { number: pull.number, url: pull.html_url, branch: edit.branch }
}
