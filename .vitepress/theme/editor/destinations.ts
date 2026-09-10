export interface Destination {
  id: string
  label: string
  dir: string
  what: string
  how: string
  // Only where the section has a shape to offer; elsewhere the page is one
  // piece of prose and a skeleton would be an empty gesture.
  outline?: string
  // No sidebar, so a page here is an orphan until the section index links it.
  hub?: boolean
}

// Only what .vitepress/sidebars/ scans; elsewhere a page never reaches nav.
export const DESTINATIONS: Destination[] = [
  {
    id: 'about',
    label: '关于',
    dir: 'about',
    what: '协会本身：我们是谁、怎么加入、有哪些项目',
    how: '开头一段要能独立读懂，悬停卡会直接引用它',
  },
  {
    id: 'tutorial',
    label: '指南 · 教程',
    dir: 'tutorial',
    what: '一项技术的原理与术语，写给想弄明白的人，不写操作步骤',
    how: '每个结论链到规范条款或官方手册；命令给出 macOS、Linux、Windows 三种写法',
    outline: '# \n\n## 概览\n',
  },
  {
    id: 'manual',
    label: '指南 · 手册',
    dir: 'tutorial/manual',
    what: '解决一件事的完整流程，别人照着能做成',
    how: '每步写清敲什么、看到什么算成功；原理链到教程，不在这里展开',
    outline: '# \n\n## 第一步\n',
  },
  {
    id: 'process',
    label: '指南 · 流程',
    dir: 'process/2025',
    what: '协会内部办事：报销、借教室、申请学分',
    how: '先说清楚谁在什么时候要办这件事，再按顺序写步骤',
    outline: '# \n\n## 谁在什么时候要办\n\n## 步骤\n',
  },
  {
    id: 'concepts',
    label: '概念库',
    dir: 'concepts',
    hub: true,
    what: '解释一个站内反复出现的名词，一条一个词',
    how: '第一段就是完整定义，不铺垫；查不到官方说法的地方写「待核实」，不编',
  },
  {
    id: 'repair',
    label: '维修',
    dir: 'repair',
    hub: true,
    what: '维修队相关：怎么修、怎么办维修日、用什么工具',
    how: '开头一段要能独立读懂',
  },
]

export function draftSlug(now = new Date()): string {
  return `draft-${now.toISOString().slice(0, 10).replace(/-/g, '')}`
}

export function pathFor(destination: Destination, slug: string): string {
  return `${destination.dir}/${slug}.md`
}

export function routeFor(destination: Destination, slug: string): string {
  return `/${destination.dir}/${slug}`
}

export function frontmatterFor(login: string, now = new Date()): string {
  const since = now.toISOString().slice(0, 7)
  // Local development has no GitHub identity; leave something people notice.
  const user = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(login) ? login : 'your-github-login'
  return `---\nmaintainers:\n  - user: ${user}\n    since: ${since}\n---\n\n`
}

export function placeholderFor(destination: Destination): string {
  return `以一行「# 标题」开头，然后写正文。${destination.how}。`
}

export function checklistFor(destination: Destination, slug: string): string[] {
  const items: string[] = []

  if (slug.startsWith('draft-'))
    items.push(`确认文件名：\`${slug}\` 是自动生成的，网址是长期承诺，请改成一个稳定的名字`)

  if (destination.hub)
    items.push(`「${destination.label}」没有边栏，请在 \`${destination.dir}/index.md\` 里链上这一页，否则它是孤岛`)

  return items
}
