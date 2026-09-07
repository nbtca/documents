export interface Destination {
  id: string
  label: string
  dir: string
  what: string
  how: string
  // No sidebar: reached by inline links and search, so a new page here is an
  // orphan until a maintainer links it from the section index.
  hub?: boolean
}

// Only directories a generated sidebar actually scans (.vitepress/sidebars/).
// A page anywhere else in these trees would never appear in navigation.
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
    dir: 'tutorial/2025',
    what: '怎么做成一件具体的事',
    how: '一篇只解决一件事；先说清楚这篇要解决什么问题，再写步骤',
  },
  {
    id: 'manual',
    label: '指南 · 手册',
    dir: 'tutorial/manual',
    what: '长期有效的操作手册，不绑定某一年',
    how: '开头说明适用范围；内容要经得起放两三年',
  },
  {
    id: 'process',
    label: '指南 · 流程',
    dir: 'process/2025',
    what: '协会内部办事：报销、借教室、申请学分',
    how: '先说清楚谁在什么时候要办这件事，再按顺序写步骤',
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
  return `---\nmaintainers:\n  - user: ${login}\n    since: ${since}\n---\n`
}

export function templateFor(destination: Destination): string {
  return `\n# \n\n（${destination.how}）\n`
}

export function checklistFor(destination: Destination, slug: string): string[] {
  const items: string[] = []

  if (slug.startsWith('draft-'))
    items.push(`确认文件名：\`${slug}\` 是自动生成的，网址是长期承诺，请改成一个稳定的名字`)

  if (destination.hub)
    items.push(`「${destination.label}」没有边栏，请在 \`${destination.dir}/index.md\` 里链上这一页，否则它是孤岛`)

  return items
}
