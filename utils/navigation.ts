import type { DefaultTheme } from 'vitepress'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type SidebarItem = DefaultTheme.SidebarItem

export interface MarkdownFile {
  filename: string
  filepath: string
  stem: string
}

export interface ListMarkdownOptions {
  includeIndex?: boolean
}

export interface ScanDirOptions extends ListMarkdownOptions {
  linkBase?: string
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function contentDir(...segments: string[]): string {
  return path.resolve(rootDir, ...segments)
}

export function resolveContentDir(dirname: string): string {
  return path.isAbsolute(dirname) ? dirname : contentDir(dirname)
}

export function markdownStem(filename: string): string {
  return path.basename(filename, '.md')
}

export function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}/` : '/'
}

export function joinBasePath(basePath: string, ...segments: string[]): string {
  const parts = [basePath, ...segments]
    .map(part => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)

  return normalizeBasePath(parts.join('/'))
}

export function pageLink(basePath: string, filenameOrSlug: string): string {
  return `${normalizeBasePath(basePath)}${markdownStem(filenameOrSlug)}`
}

export function relativePageLink(filenameOrSlug: string): string {
  return markdownStem(filenameOrSlug)
}

export function page(text: string, link: string): SidebarItem {
  return { text, link }
}

export function pageInSection(
  text: string,
  basePath: string,
  filenameOrSlug: string,
): SidebarItem {
  return page(text, pageLink(basePath, filenameOrSlug))
}

export function pageInGroup(text: string, filenameOrSlug: string): SidebarItem {
  return page(text, relativePageLink(filenameOrSlug))
}

export function group(options: {
  text: string
  items: SidebarItem[]
  base?: string
  collapsed?: boolean
}): SidebarItem {
  return options
}

export function listMarkdownFiles(
  dirname: string,
  options: ListMarkdownOptions = {},
): MarkdownFile[] {
  const dirpath = resolveContentDir(dirname)

  return readdirSync(dirpath)
    .filter((filename) => {
      if (!filename.endsWith('.md'))
        return false

      return options.includeIndex === true || filename !== 'index.md'
    })
    .sort()
    .map(filename => ({
      filename,
      filepath: path.join(dirpath, filename),
      stem: markdownStem(filename),
    }))
}

export function listDirectories(dirname: string): string[] {
  const dirpath = resolveContentDir(dirname)

  return readdirSync(dirpath)
    .filter((filename) => {
      try {
        return !filename.startsWith('.')
          && statSync(path.join(dirpath, filename)).isDirectory()
      }
      catch {
        return false
      }
    })
    .sort()
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

export function scanDir(
  dirname: string,
  options: ScanDirOptions = {},
): Array<{ filename: string, link: string }> {
  const linkBase = options.linkBase ?? normalizeBasePath(dirname)

  return listMarkdownFiles(dirname, options).map(({ filename }) => ({
    filename,
    link: pageLink(linkBase, filename),
  }))
}
