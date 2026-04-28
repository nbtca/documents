import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const SUBDIR_LABELS: Record<string, string> = {
  meetings: '会议纪要',
  developer: '开发组',
}

const archivedDir = path.resolve(__dirname)

function getTitle(filepath: string): string {
  try {
    const content = readFileSync(filepath, 'utf-8')
    const match = content.match(/^# (.+)$/m)
    if (match)
      return match[1]
  }
  catch {}
  return path.basename(filepath, '.md')
}

function listMdFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'index.md')
    .sort()
}

function listDirs(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => {
      try {
        return statSync(path.join(dir, f)).isDirectory() && !f.startsWith('.')
      }
      catch { return false }
    })
    .sort()
}

function buildYearItems(dir: string, urlBase: string) {
  const files = listMdFiles(dir)
  const subdirs = listDirs(dir)
  const items: Record<string, unknown>[] = []

  for (const f of files) {
    items.push({
      text: getTitle(path.join(dir, f)),
      link: `${urlBase}${f.replace(/\.md$/, '')}`,
    })
  }

  for (const sub of subdirs) {
    const subFiles = listMdFiles(path.join(dir, sub))
    if (subFiles.length === 0)
      continue
    items.push({
      text: SUBDIR_LABELS[sub] || sub,
      base: `${urlBase}${sub}/`,
      items: subFiles.map(f => ({
        text: getTitle(path.join(dir, sub, f)),
        link: f.replace(/\.md$/, ''),
      })),
    })
  }

  return items
}

const allDirs = listDirs(archivedDir)
const years = allDirs.filter(d => /^\d{4}$/.test(d)).sort((a, b) => +b - +a)

export const sidebar = [
  { text: '简介', link: '/archived/index' },

  ...(allDirs.includes('manual')
    ? [{
        text: '手册',
        collapsed: false,
        base: '/archived/manual/',
        items: [{
          text: '计算机协会手册',
          items: listMdFiles(path.join(archivedDir, 'manual')).map(f => ({
            text: getTitle(path.join(archivedDir, 'manual', f)),
            link: f.replace(/\.md$/, ''),
          })),
        }],
      }]
    : []),

  ...years.map((year, i) => ({
    text: year,
    collapsed: i > 0,
    items: buildYearItems(path.join(archivedDir, year), `/archived/${year}/`),
  })),
]
