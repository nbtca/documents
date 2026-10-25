import type { App } from 'vue'
import { stripFrontmatter } from '../../../utils/markdown'
import { previewSources, publishedAssetMap } from '../../../utils/published-asset'
import { renderMarkdown } from '../../../utils/render-markdown'
import { components } from '../components'

export interface Preview {
  update: (markdown: string) => void
  close: () => void
}

const DOC = '.vp-doc'
const MERMAID = 'pre > code[class~="language-mermaid" i], pre > code[class~="language-mmd" i]'
let previewNumber = 0

function errorText(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  return text.split('\n')[0] ?? '无法解析图表'
}

function diagramError(source: HTMLPreElement, error: unknown): HTMLElement {
  const box = document.createElement('div')
  box.className = 'nb-mermaid-error'
  box.setAttribute('role', 'alert')

  const title = document.createElement('strong')
  title.textContent = 'Mermaid 图表语法错误'
  const detail = document.createElement('p')
  detail.textContent = errorText(error)

  const more = document.createElement('details')
  const summary = document.createElement('summary')
  summary.textContent = '查看图表源码'
  const copy = source.cloneNode(true) as HTMLPreElement
  copy.removeAttribute('aria-busy')
  copy.classList.remove('nb-mermaid-source')
  more.append(summary, copy)
  box.append(title, detail, more)
  return box
}

async function renderMermaid(
  host: HTMLElement,
  current: () => boolean,
  number: number,
): Promise<void> {
  const blocks = [...host.querySelectorAll<HTMLElement>(MERMAID)]
  if (!blocks.length)
    return

  const mermaid = (await import('mermaid')).default
  if (!current())
    return

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
  })

  for (const [index, code] of blocks.entries()) {
    if (!current() || !code.isConnected)
      return
    const source = code.closest('pre') as HTMLPreElement | null
    if (!source)
      continue
    source.classList.add('nb-mermaid-source')
    source.setAttribute('aria-busy', 'true')

    try {
      const definition = code.textContent ?? ''
      await mermaid.parse(definition)
      if (!current() || !source.isConnected)
        return
      const { svg } = await mermaid.render(`nb-mermaid-${number}-${index}`, definition)
      if (!current() || !source.isConnected)
        return
      const figure = document.createElement('figure')
      figure.className = 'nb-mermaid'
      figure.setAttribute('role', 'img')
      figure.setAttribute('aria-label', 'Mermaid 图表')
      figure.innerHTML = svg
      source.replaceWith(figure)
    }
    catch (error) {
      if (!current() || !source.isConnected)
        return
      source.replaceWith(diagramError(source, error))
    }
  }
}

export async function openPreview(
  markdown: string,
  pending: Map<string, string> = new Map(),
): Promise<Preview | undefined> {
  const article = document.querySelector<HTMLElement>(DOC)
  if (!article)
    return undefined

  const [{ compile }, vue] = await Promise.all([
    import('@vue/compiler-dom'),
    import('vue'),
  ])

  const host = document.createElement('div')
  host.className = 'vp-doc nb-preview'
  article.after(host)
  article.style.display = 'none'

  const instance = ++previewNumber
  let generation = 0
  let closed = false
  let app: App | undefined

  // The built page already resolved ./assets/name.webp to a hashed URL.
  // Recompiling the source would ask for /about/assets/name.webp, which was
  // never deployed. Pictures added in this session are not on that page yet.
  const published = publishedAssetMap(
    [...article.querySelectorAll('img')].flatMap((img) => {
      const src = img.getAttribute('src')
      return src ? [src] : []
    }),
  )

  const render = (source: string) => {
    app?.unmount()
    const run = ++generation
    const html = previewSources(renderMarkdown(stripFrontmatter(source)), published, pending)
    const { code } = compile(`<div>${html}</div>`, {
      mode: 'function',
      hoistStatic: true,
      onError: () => {},
      onWarn: () => {},
    })
    // eslint-disable-next-line no-new-func
    const renderFn = new Function('Vue', code)(vue)
    app = vue.createApp({ render: renderFn })
    for (const [name, component] of Object.entries(components))
      app.component(name, component)
    app.config.warnHandler = () => {}
    app.mount(host)
    void renderMermaid(host, () => !closed && run === generation, instance * 1000 + run)
  }

  render(markdown)
  window.scrollTo({ top: 0 })

  return {
    update: render,
    close() {
      closed = true
      generation++
      app?.unmount()
      host.remove()
      article.style.display = ''
    },
  }
}
