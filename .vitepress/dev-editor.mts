import type { Plugin } from 'vite'
import { Buffer } from 'node:buffer'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

// Only markdown, only inside the repo: a dev server still answers the network.
const WRITABLE = /\.(?:md|json|webp)$/

function resolveInRepo(candidate: unknown): string {
  if (typeof candidate !== 'string' || !WRITABLE.test(candidate))
    throw new Error('not a writable path')

  const absolute = path.resolve(ROOT, candidate)
  if (absolute !== path.normalize(absolute) || !absolute.startsWith(`${ROOT}${path.sep}`))
    throw new Error('outside the repository')

  return absolute
}

function body(request: { on: (event: string, fn: (chunk?: Buffer) => void) => void }): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    request.on('data', chunk => chunks.push(chunk as Buffer))
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

export function devEditor(): Plugin {
  return {
    name: 'nb-dev-editor',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__edit', async (request, response, next) => {
        const send = (status: number, payload: unknown) => {
          response.statusCode = status
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify(payload))
        }

        try {
          if (request.method === 'GET') {
            const asked = new URL(request.url ?? '', 'http://localhost').searchParams.get('path')
            const file = resolveInRepo(asked)
            send(200, { content: await readFile(file, 'utf8'), sha: 'local' })
            return
          }

          if (request.method === 'PUT') {
            const payload = JSON.parse(await body(request))
            const files = payload.files ?? [{ path: payload.path, content: payload.content }]
            for (const file of files) {
              const target = resolveInRepo(file.path)
              await mkdir(path.dirname(target), { recursive: true })
              await writeFile(target, file.base64 ? Buffer.from(file.content, 'base64') : file.content)
            }
            send(200, { ok: true })
            return
          }

          next()
        }
        catch (error) {
          send(400, { message: (error as Error).message })
        }
      })
    },
  }
}
