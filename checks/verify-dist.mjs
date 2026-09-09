// The vitest suite reads markdown; these defects only exist once it renders.
import { existsSync, globSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const distDir = '.vitepress/dist'

if (!existsSync(distDir)) {
  console.error(`Cannot verify because ${distDir} does not exist.`)
  console.error('Run `pnpm docs:build` first, then retry `pnpm ci:verify`.')
  process.exit(1)
}

const ENTITIES = { 'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', '#39': '\'', 'nbsp': ' ' }
const ASSET = /\.(?:webp|png|jpe?g|svg|gif|ico|docx?|xlsx?|pdf|txt|xml|json|css|js|woff2?)$/i

function unescape(value) {
  return value.replace(/&(#\d+|[a-z]+);/gi, (whole, name) => {
    if (name.startsWith('#'))
      return String.fromCodePoint(Number(name.slice(1)))
    return ENTITIES[name.toLowerCase()] ?? whole
  })
}

function articleOf(html) {
  const marker = html.indexOf('class="vp-doc')
  if (marker === -1)
    return ''
  const open = html.lastIndexOf('<div', marker)
  const close = html.indexOf('</main>', marker)
  return html.slice(open === -1 ? marker : open, close === -1 ? html.length : close)
}

function stripTags(text) {
  let previous
  let result = text
  do {
    previous = result
    result = result.replace(/<[^>]*>/g, '')
  } while (result !== previous)
  return result.replace(/[<>]/g, '')
}

function proseOf(html) {
  return unescape(
    stripTags(
      html
        .replace(/<pre[\s\S]*?<\/pre>/g, '')
        .replace(/<code[\s\S]*?<\/code>/g, ''),
    ),
  )
}

function resolveTarget(page, rawPath) {
  let target = rawPath || page
  if (target.endsWith('/'))
    target += 'index.html'
  else if (!target.endsWith('.html'))
    target += '.html'
  return decodeURIComponent(target)
}

const pages = new Map(
  globSync('**/*.html', { cwd: distDir })
    .map(file => [`/${file}`, readFileSync(path.join(distDir, file), 'utf8')]),
)

const problems = []
const report = (check, page, detail) => problems.push({ check, page, detail })

for (const [page, html] of pages) {
  const article = articleOf(html)
  if (!article)
    continue

  const prose = proseOf(article)
  for (const token of ['**', '\\_']) {
    if (prose.includes(token)) {
      const line = prose.split('\n').find(candidate => candidate.includes(token)) ?? ''
      report('markdown rendered literally', page, `${token} in "${line.trim().slice(0, 60)}"`)
    }
  }

  const headings = article.match(/<h1[\s>]/g) ?? []
  if (headings.length > 1)
    report('more than one h1', page, `${headings.length} found`)

  // A class-less <pre> is indented code: no scroll wrapper, so it overflows.
  const bare = (article.match(/<pre\b[^>]*>/g) ?? []).filter(tag => !tag.includes('class='))
  if (bare.length)
    report('code block without scroll container', page, `${bare.length} indented block(s)`)

  for (const box of html.matchAll(/<aside class="nb-archive-meta[^"]*"[^>]*>([\s\S]*?)<\/aside>/g)) {
    const text = unescape(stripTags(box[1]))
    for (const token of ['**', '](']) {
      if (text.includes(token))
        report('markdown written into a frontmatter field', page, token)
    }
  }

  if (html.includes('VPDocFooter')) {
    const updated = html.match(/class="VPLastUpdated"[^>]*>[^<]*<time[^>]*>([^<]*)<\/time>/)
    if (!updated?.[1].trim())
      report('last-updated date missing from the server output', page, '')
  }

  for (const match of article.matchAll(/href="([^"#]*#[^"]+)"/g)) {
    const href = unescape(match[1])
    if (/^(?:https?:|mailto:)/.test(href))
      continue
    const [rawPath, fragment] = href.split('#')
    const target = pages.get(resolveTarget(page, rawPath))
    if (!target)
      report('anchor targets a missing page', page, href)
    else if (!target.includes(`id="${decodeURIComponent(fragment)}"`))
      report('anchor targets no heading', page, href)
  }
}

for (const [page, html] of pages) {
  for (const match of unescape(html).matchAll(/(?:src|href)="(\/[^"?#]+)"/g)) {
    const asset = decodeURIComponent(match[1])
    if (ASSET.test(asset) && !existsSync(path.join(distDir, asset)))
      report('referenced file was not emitted', page, asset)
  }
}

if (problems.length === 0) {
  console.log(`verify-dist: ${pages.size} pages, no problems.`)
  process.exit(0)
}

const grouped = new Map()
for (const problem of problems)
  grouped.set(problem.check, [...(grouped.get(problem.check) ?? []), problem])

for (const [check, list] of grouped) {
  console.error(`\n${check} (${list.length})`)
  for (const problem of list.slice(0, 20))
    console.error(`  ${problem.page}  ${problem.detail}`)
  if (list.length > 20)
    console.error(`  ...and ${list.length - 20} more`)
}

console.error(`\nverify-dist: ${problems.length} problems across ${pages.size} pages.`)
process.exit(1)
