import type LogtoClient from '@logto/browser'

const endpoint = import.meta.env.VITE_LOGTO_ENDPOINT
const appId = import.meta.env.VITE_LOGTO_APP_ID

export const editorConfigured = Boolean(endpoint && appId)

export const CALLBACK_PATH = '/callback'
const RETURN_KEY = 'nb-editor-return'

let client: LogtoClient | undefined

async function getClient(): Promise<LogtoClient> {
  if (!client) {
    const { default: Logto } = await import('@logto/browser')
    client = new Logto({
      endpoint,
      appId,
      scopes: ['openid', 'offline_access', 'identities', 'profile'],
    })
  }
  return client
}

export async function isSignedIn(): Promise<boolean> {
  if (!editorConfigured)
    return false
  return (await getClient()).isAuthenticated
}

export async function signIn(returnTo: string): Promise<void> {
  sessionStorage.setItem(RETURN_KEY, returnTo)
  await (await getClient()).signIn({
    redirectUri: import.meta.env.VITE_LOGTO_CALLBACK_URL || `${location.origin}${CALLBACK_PATH}`,
    postRedirectUri: returnTo,
  })
}

export async function completeSignIn(): Promise<string> {
  await (await getClient()).handleSignInCallback(location.href)
  const returnTo = sessionStorage.getItem(RETURN_KEY)
  sessionStorage.removeItem(RETURN_KEY)
  return returnTo || '/'
}

export async function signOut(): Promise<void> {
  await (await getClient()).signOut(location.origin)
}

export interface Member {
  name: string
  picture?: string
}

export async function currentMember(): Promise<Member | undefined> {
  const claims = await (await getClient()).getIdTokenClaims()
  if (!claims)
    return undefined
  return { name: claims.username ?? claims.name ?? claims.sub, picture: claims.picture ?? undefined }
}

export class NotLinkedError extends Error {}

// Needs token storage on the connector, with public_repo among its scopes.
export async function githubToken(): Promise<string> {
  const accessToken = await (await getClient()).getAccessToken()
  const response = await fetch(`${endpoint}/api/my-account/identities/github/access-token`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (response.status === 404)
    throw new NotLinkedError('尚未绑定 GitHub，或连接器未开启令牌存储')

  if (!response.ok)
    throw new Error(`Logto ${response.status}: ${(await response.text()).slice(0, 200)}`)

  return (await response.json()).access_token
}
