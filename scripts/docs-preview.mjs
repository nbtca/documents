import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import process from 'node:process'

const previewEntry = '.vitepress/dist/404.html'

if (!existsSync(previewEntry)) {
  console.error(`Cannot preview docs because ${previewEntry} does not exist.`)
  console.error('Run `pnpm docs:build` first, then retry `pnpm docs:preview`.')
  process.exit(1)
}

const args = process.argv.slice(2)

if (args[0] === '--') {
  args.shift()
}

const child = spawn('vitepress', ['preview', ...args], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('error', (error) => {
  console.error(error.message)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
