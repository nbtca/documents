import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

export function scanDir(dirname: string) {
  const dirpath = path.resolve(__dirname, '..', dirname)
  const files = readdirSync(dirpath).filter(name => name.endsWith('.md'))

  return files.map(filename => ({
    filename,
    link: `/${dirname}/${filename.replace(/\.md$/, '')}`,
  }))
}

export function getTitle(filepath: string): string {
  try {
    const content = readFileSync(filepath, 'utf-8')
    const match = content.match(/^# (.+)$/m)
    if (match)
      return match[1]
  }
  catch {}
  return path.basename(filepath, '.md')
}
