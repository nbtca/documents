import type { App } from 'vue'
import { stripFrontmatter } from '../../../utils/markdown'
import { renderMarkdown } from '../../../utils/render-markdown'
import { components } from '../components'

export interface Preview {
  update: (markdown: string) => void
  close: () => void
}

const DOC = '.vp-doc'

export async function openPreview(markdown: string): Promise<Preview | undefined> {
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

  let app: App | undefined

  const render = (source: string) => {
    app?.unmount()
    const { code } = compile(`<div>${renderMarkdown(stripFrontmatter(source))}</div>`, {
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
  }

  render(markdown)
  window.scrollTo({ top: 0 })

  return {
    update: render,
    close() {
      app?.unmount()
      host.remove()
      article.style.display = ''
    },
  }
}
