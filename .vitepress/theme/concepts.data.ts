import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractSummary, extractTitle, frontmatterValue } from '../../utils/markdown'

export interface PagePreview {
  path: string
  title: string
  summary: string
}

declare const data: PagePreview[]
export { data }

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const contentDirs = ['about', 'process', 'repair', 'tutorial', 'concepts', 'archived']

function toUrlPath(relativePath: string): string {
  const stem = relativePath.replace(/\\/g, '/').replace(/\.md$/, '')
  return stem.endsWith('/index') ? `/${stem.slice(0, -'index'.length)}` : `/${stem}`
}

export default {
  watch: contentDirs.map(dir => path.join(rootDir, dir, '**/*.md')),
  load(): PagePreview[] {
    return fs.globSync(`{${contentDirs.join(',')}}/**/*.md`, { cwd: rootDir })
      .map((relativePath) => {
        const src = fs.readFileSync(path.join(rootDir, relativePath), 'utf-8')
        return {
          path: toUrlPath(relativePath),
          // Headingless archived files fall back to the filename, as the sidebar does.
          title: extractTitle(src) ?? path.basename(relativePath, '.md'),
          summary: frontmatterValue(src, 'summary') ?? extractSummary(src),
        }
      })
  },
}
