import { currentUser } from '../../../utils/github'

const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID

export const editorConfigured = Boolean(clientId)

export const CALLBACK_PATH = '/callback'
const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const EXCHANGE_PATH = '/api/auth/github'

const RETURN_KEY = 'nb-editor-return'
const STATE_KEY = 'nb-editor-state'
const TOKEN_KEY = 'nb-editor-token'

export interface Member {
  name: string
  picture?: string
}

let member: Member | undefined

export async function isSignedIn(): Promise<boolean> {
  return editorConfigured && Boolean(sessionStorage.getItem(TOKEN_KEY))
}

export async function signIn(returnTo: string): Promise<void> {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(RETURN_KEY, returnTo)

  const authorize = new URL(AUTHORIZE_URL)
  authorize.searchParams.set('client_id', clientId)
  authorize.searchParams.set('redirect_uri', `${location.origin}${CALLBACK_PATH}`)
  authorize.searchParams.set('scope', 'public_repo')
  authorize.searchParams.set('state', state)
  location.assign(authorize.toString())
}

export async function completeSignIn(): Promise<string> {
  const params = new URLSearchParams(location.search)
  const expected = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)

  const denied = params.get('error')
  if (denied)
    throw new Error(params.get('error_description') ?? denied)

  const code = params.get('code')
  if (!code || !expected || params.get('state') !== expected)
    throw new Error('登录回调无效，请回到页面重新登录。')

  const response = await fetch(EXCHANGE_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  const body = await response.json() as { access_token?: string, error?: string, error_description?: string }
  if (!response.ok || !body.access_token)
    throw new Error(body.error_description || body.error || `登录失败（${response.status}）`)

  sessionStorage.setItem(TOKEN_KEY, body.access_token)

  const returnTo = sessionStorage.getItem(RETURN_KEY)
  sessionStorage.removeItem(RETURN_KEY)
  return returnTo || '/'
}

export function forgetToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  member = undefined
}

export async function signOut(): Promise<void> {
  forgetToken()
  location.assign('/')
}

export async function githubToken(): Promise<string> {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (!token)
    throw new Error('尚未登录。')
  return token
}

export async function currentMember(): Promise<Member | undefined> {
  if (member)
    return member

  const user = await currentUser(await githubToken())
  member = { name: user.login, picture: user.avatarUrl }
  return member
}
