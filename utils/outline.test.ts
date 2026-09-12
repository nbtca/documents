import { getHeaders, resolveHeaders, useActiveAnchor } from 'vitepress/dist/client/theme-default/composables/outline.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Exercise the installed VitePress engine, not a second implementation. These
// contracts protect the CSS-only rendering extension when VitePress changes.
const hooks = vi.hoisted(() => ({
  mounted: [] as Array<() => void>,
  updated: [] as Array<() => void>,
  unmounted: [] as Array<() => void>,
  aside: { value: true },
}))
vi.mock('vue', () => ({
  onMounted: (fn: () => void) => hooks.mounted.push(fn),
  onUpdated: (fn: () => void) => hooks.updated.push(fn),
  onUnmounted: (fn: () => void) => hooks.unmounted.push(fn),
}))
vi.mock('vitepress', () => ({ getScrollOffset: () => 100 }))
vi.mock('vitepress/dist/client/theme-default/composables/aside', () => ({
  useAside: () => ({ isAsideEnabled: hooks.aside }),
}))
vi.mock('vitepress/dist/client/theme-default/composables/data', () => ({ useData: vi.fn() }))

const body = { offsetHeight: 2000 }
let scroll: () => void
let windowMock: { scrollY: number, innerHeight: number, addEventListener: ReturnType<typeof vi.fn>, removeEventListener: ReturnType<typeof vi.fn> }

function heading(level: number, title: string, top = 200, ignored = false) {
  return {
    level,
    title,
    link: `#${title}`,
    element: {
      id: title,
      tagName: `H${level}`,
      hasChildNodes: () => true,
      childNodes: [{ nodeType: 3, textContent: title }],
      classList: { contains: () => ignored },
      get offsetTop() { return top },
      offsetParent: body,
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  hooks.mounted.length = hooks.updated.length = hooks.unmounted.length = 0
  hooks.aside.value = true
  windowMock = {
    scrollY: 0,
    innerHeight: 800,
    addEventListener: vi.fn((event, callback) => {
      if (event === 'scroll')
        scroll = callback
    }),
    removeEventListener: vi.fn(),
  }
  vi.stubGlobal('window', windowMock)
  vi.stubGlobal('document', { body })
  vi.stubGlobal('location', { hash: '' })
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    callback()
    return 1
  })
})

afterEach(() => {
  hooks.unmounted.forEach(fn => fn())
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('native outline tree contracts', () => {
  it('keeps skipped levels and ignores the whole ignored subtree', () => {
    const tree = resolveHeaders([
      heading(2, 'first'),
      heading(4, 'skipped'),
      heading(2, 'ignored', 400, true),
      heading(3, 'ignored-child'),
      heading(2, 'last'),
      heading(3, 'last-child'),
    ], [2, 4])
    expect(tree.map(item => item.title)).toEqual(['first', 'last'])
    expect(tree[0].children.map(item => item.title)).toEqual(['skipped'])
    expect(tree[1].children.map(item => item.title)).toEqual(['last-child'])
  })

  it('honours disabled outlines and page-specific levels', () => {
    const headers = [heading(2, 'section'), heading(3, 'child'), heading(4, 'detail')]
    expect(resolveHeaders(headers, false)).toEqual([])
    expect(resolveHeaders(headers, { level: [3, 4] })[0].title).toBe('child')
    expect(resolveHeaders(headers, 2)[0].children).toEqual([])
  })

  it('uses native title serialization for badges, footnotes and anchors', () => {
    const h = heading(2, 'Title')
    const nodes = ['VPBadge', 'footnote-ref', 'header-anchor', 'ignore-header']
      .map(className => ({ nodeType: 1, className, textContent: 'omit' }))
    Object.assign(h.element, { childNodes: [...h.element.childNodes, ...nodes] })
    vi.stubGlobal('document', { body, querySelectorAll: () => [h.element] })
    expect(getHeaders([2, 4])[0].title).toBe('Title')
  })
})

function mountOutline() {
  const last = heading(4, 'last', 1850)
  const readTop = vi.spyOn(last.element, 'offsetTop', 'get')
  resolveHeaders([heading(2, 'first'), heading(3, 'parent', 1750), last], [2, 4])
  const links = new Map(['first', 'parent', 'last'].map((id, index) => [id, {
    classList: { add: vi.fn(), remove: vi.fn() },
    offsetTop: index * 32,
  }]))
  const marker = { style: { top: '', opacity: '' } }
  const container = { querySelector: vi.fn((selector: string) => links.get(selector.match(/#([^"\]]+)/)?.[1] ?? '')) }
  useActiveAnchor({ value: container }, { value: marker })
  hooks.mounted.forEach(fn => fn())
  return { links, marker, container, readTop }
}

describe('native active-anchor contracts', () => {
  it('activates the final heading at the bottom and positions the separate marker', () => {
    const { links, marker } = mountOutline()
    windowMock.scrollY = 1200
    scroll()
    expect(links.get('last')!.classList.add).toHaveBeenCalledWith('active')
    expect(marker.style).toEqual({ top: '103px', opacity: '1' })
  })

  it('does no heading measurements while the aside is hidden', () => {
    hooks.aside.value = false
    const { readTop } = mountOutline()
    windowMock.scrollY = 1200
    scroll()
    vi.advanceTimersByTime(100)
    expect(readTop).not.toHaveBeenCalled()
  })

  it('throttles rapid scrolling and processes its trailing update after 100ms', () => {
    const { readTop, links } = mountOutline()
    readTop.mockClear()
    windowMock.scrollY = 300
    scroll()
    windowMock.scrollY = 1200
    for (let i = 0; i < 20; i++) scroll()
    expect(readTop).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(99)
    expect(links.get('last')!.classList.add).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(readTop).toHaveBeenCalledTimes(2)
    expect(links.get('last')!.classList.add).toHaveBeenCalledWith('active')
  })

  it('clears the marker at the top and removes its scroll listener on unmount', () => {
    const { marker } = mountOutline()
    expect(marker.style.opacity).toBe('0')
    hooks.unmounted.forEach(fn => fn())
    hooks.unmounted.length = 0
    expect(windowMock.removeEventListener).toHaveBeenCalledWith('scroll', scroll)
  })
})
