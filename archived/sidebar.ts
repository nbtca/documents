import type { SidebarItem } from '../utils/navigation'
import path from 'node:path'
import {
  contentDir,
  getTitle,
  joinBasePath,
  listDirectories,
  listMarkdownFiles,
  pageInSection,
  pageLink,
  relativePageLink,
} from '../utils/navigation'

const SUBDIR_LABELS: Record<string, string> = {
  meetings: '会议纪要',
  developer: '开发组',
}

const archivedDir = contentDir('archived')

function buildYearItems(dir: string, urlBase: string): SidebarItem[] {
  const files = listMarkdownFiles(dir)
  const subdirs = listDirectories(dir)
  const items: SidebarItem[] = []

  for (const file of files) {
    items.push({
      text: getTitle(file.filepath),
      link: pageLink(urlBase, file.filename),
    })
  }

  for (const sub of subdirs) {
    const subFiles = listMarkdownFiles(path.join(dir, sub))
    if (subFiles.length === 0)
      continue
    items.push({
      text: SUBDIR_LABELS[sub] || sub,
      base: joinBasePath(urlBase, sub),
      items: subFiles.map(file => ({
        text: getTitle(file.filepath),
        link: relativePageLink(file.filename),
      })),
    })
  }

  return items
}

const allDirs = listDirectories(archivedDir)
const years = allDirs.filter(d => /^\d{4}$/.test(d)).sort((a, b) => +b - +a)

export const sidebar = [
  pageInSection('简介', 'archived', 'index'),

  ...(allDirs.includes('manual')
    ? [{
        text: '手册',
        collapsed: false,
        base: '/archived/manual/',
        items: [{
          text: '计算机协会手册',
          items: listMarkdownFiles(path.join(archivedDir, 'manual')).map(file => ({
            text: getTitle(file.filepath),
            link: relativePageLink(file.filename),
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
