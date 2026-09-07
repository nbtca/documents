interface Env {
  GITHUB_CLIENT_SECRET: string
}

const TOKEN_URL = 'https://github.com/login/oauth/access_token'
const CLIENT_ID = 'Ov23liLyXZEIgI9vKNV6'

interface Exchange {
  access_token?: string
  error?: string
  error_description?: string
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export async function onRequestPost(
  { request, env }: { request: Request, env: Env },
): Promise<Response> {
  if (!env.GITHUB_CLIENT_SECRET)
    return json({ error: 'not_configured' }, 503)

  const { code } = await request.json() as { code?: string }
  if (!code)
    return json({ error: 'missing_code' }, 400)

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })

  // GitHub answers 200 with an error body when the code is spent or forged.
  const body = await response.json() as Exchange
  if (!body.access_token)
    return json({ error: body.error ?? 'exchange_failed', error_description: body.error_description }, 400)

  return json({ access_token: body.access_token })
}
