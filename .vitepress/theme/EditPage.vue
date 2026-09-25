<script setup lang="ts">
import type { Component } from 'vue'
import type { Me, PendingImage } from './editor/backend'
import type { Format } from './editor/codemirror'
import type { Destination } from './editor/destinations'
import {
  Bold,
  Code2,
  Eye,
  FileDiff,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  RotateCcw,
  Trash2,
} from '@lucide/vue'
import { useData } from 'vitepress'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { extractH1, splitFrontmatter } from '../../utils/markdown'
import { reviewNoteFor, transcribedFrom } from './editor/archive'
import { isSignedIn, signIn, signOut } from './editor/auth'
import { load, localMode, submit as send, startedAt, taken, me as whoami } from './editor/backend'
import {
  checklistFor,
  DESTINATIONS,
  draftSlug,
  frontmatterFor,
  pathFor,
  placeholderFor,
  routeFor,
  slugProblem,
} from './editor/destinations'
import { forget, keep, recall } from './editor/drafts'

type Stage = 'closed' | 'choosing' | 'loading' | 'editing' | 'previewing' | 'submitting' | 'failed'

const { page } = useData()

const stage = ref<Stage>('closed')
const signedIn = ref(false)
const member = ref<Me>()
const progress = ref('')
const armed = ref(false)
const leaving = ref(false)
const draft = ref('')
const original = ref('')
const base = ref<string>()
const summary = ref('')
const head = ref('')
const problem = ref('')
const result = ref<{ label: string, url?: string } | undefined>()
const host = ref<HTMLElement>()
const editSheet = ref<HTMLElement>()
const toolbar = ref<HTMLElement>()
const toolbarStuck = ref(false)
const saveOpen = ref(false)
let editor: { destroy: () => void } | undefined
let preview: { update: (md: string) => void, close: () => void } | undefined
let insertAt: ((snippet: string, caret?: number) => void) | undefined
let showDiff: ((original: string | undefined) => void) | undefined
let applyFormat: ((kind: Format) => void) | undefined
let replaceAll: ((text: string) => void) | undefined

const diffing = ref(false)

const images = ref<PendingImage[]>([])
const pendingUrls = new Map<string, string>()
const picker = ref<HTMLInputElement>()
const accepts = ref('image/*')
const pending = ref<{ file: File, alt: string, caption: string } | undefined>()
const busy = ref(false)

const restored = ref(false)

watch(stage, (current) => {
  if (current === 'closed')
    toolbarStuck.value = false
})

function updateToolbarStuck() {
  const sheet = editSheet.value
  const bar = toolbar.value
  if (!sheet || !bar) {
    toolbarStuck.value = false
    return
  }
  toolbarStuck.value = sheet.scrollTop > 0
    && bar.getBoundingClientRect().top <= sheet.getBoundingClientRect().top + 0.5
}

const destination = ref<Destination>()
const slug = ref('')
const slugTaken = ref('')

const target = computed(() => destination.value
  ? { path: pathFor(destination.value, slug.value), route: routeFor(destination.value, slug.value) }
  : { path: page.value.filePath, route: '' })

const titled = computed(() => Boolean(extractH1(draft.value)?.trim()))
const slugBad = computed(() => destination.value ? slugProblem(destination.value, slug.value) : '')

const heading = computed(() => {
  if (stage.value === 'choosing')
    return { title: '新建文档', path: '' }
  return destination.value
    ? { title: '新建文档', path: target.value.path }
    : { title: page.value.title, path: page.value.filePath }
})

const changed = computed(() => draft.value !== original.value && draft.value.trim().length > 0)

// Said next to the address field rather than in the footer, which is a whole
// document away from the input that has to change.
const slugIssue = computed(() => {
  if (!destination.value)
    return ''
  if (slugTaken.value)
    return `${slugTaken.value} 已经有人了，换一个名字`
  return slugBad.value
})

const contentBlocker = computed(() => {
  if (!changed.value)
    return '还没有改动'
  if (destination.value && !titled.value)
    return '正文第一行写 # 标题，它同时是页面标题和边栏上的名字'
  return ''
})

const blocker = computed(() => {
  if (contentBlocker.value)
    return contentBlocker.value
  if (!summary.value.trim())
    return destination.value ? '写一句话说明这一页讲什么' : '写一句话说明这次改了什么'
  return ''
})

const canSubmit = computed(() => !blocker.value && !slugIssue.value)
const canOpenSave = computed(() => !contentBlocker.value && !slugIssue.value)

const armedLead = computed(() => {
  return leaving.value ? '退出登录会放弃这些修改。' : '现在退出会放弃这些修改。'
})

watch([draft, slug, summary], () => {
  problem.value = ''
  armed.value = false
  leaving.value = false
})

watch(slug, () => (slugTaken.value = ''))

const draftKey = computed(() => destination.value ? 'new' : page.value.filePath)
let saving: ReturnType<typeof setTimeout> | undefined

watch([draft, summary, slug, images], () => {
  clearTimeout(saving)
  if (stage.value !== 'editing')
    return
  const key = draftKey.value
  saving = setTimeout(() => {
    if (!changed.value)
      return forget(key)
    keep(key, {
      draft: draft.value,
      summary: summary.value,
      base: base.value,
      destination: destination.value?.id,
      slug: slug.value,
      images: images.value,
    })
  }, 400)
}, { deep: true })

function restore(key: string): boolean {
  const saved = recall(key)
  if (!saved || saved.draft === original.value)
    return false
  draft.value = saved.draft
  summary.value = saved.summary
  base.value = saved.base ?? base.value
  images.value = saved.images
  for (const image of saved.images)
    pendingUrls.set(`/${image.path}`, `data:image/webp;base64,${image.base64}`)
  restored.value = true
  return true
}

function startOver() {
  forget(draftKey.value)
  restored.value = false
  images.value = []
  pendingUrls.clear()
  summary.value = ''
  replaceAll?.(original.value)
}

// Only a page that transcribes an original is held to the original; a record
// this association wrote itself is just a page, wherever it is filed.
const transcribed = computed(() => transcribedFrom(page.value.frontmatter))

const checklist = computed(() => {
  if (destination.value)
    return checklistFor(destination.value, slug.value)
  return transcribed.value ? [reviewNoteFor(transcribed.value)] : undefined
})

watch([() => stage.value, host], async ([current, element]) => {
  if (current !== 'editing' || !element || editor)
    return
  await nextTick()
  const { mountEditor } = await import('./editor/codemirror')
  const view = mountEditor(element, draft.value, value => (draft.value = value), () => {
    openSave()
  }, onFiles, destination.value && placeholderFor(destination.value))
  view.focus()
  const { format, setDiff } = await import('./editor/codemirror')
  showDiff = original => setDiff(view, original)
  applyFormat = kind => format(view, kind)
  replaceAll = (text) => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
    view.focus()
  }
  insertAt = (snippet, caret) => {
    const at = view.state.selection.main.head
    view.dispatch({ changes: { from: at, insert: snippet }, selection: { anchor: at + (caret ?? snippet.length) } })
    view.focus()
  }
  editor = { destroy: () => view.destroy() }
})

function teardown() {
  editor?.destroy()
  editor = undefined
  preview?.close()
  preview = undefined
}

function toggleDiff() {
  diffing.value = !diffing.value
  showDiff?.(diffing.value ? original.value : undefined)
}

function openSave() {
  if (!canOpenSave.value || stage.value === 'submitting')
    return
  armed.value = false
  leaving.value = false
  problem.value = ''
  saveOpen.value = true
}

async function pick(kind: string) {
  accepts.value = kind
  await nextTick()
  picker.value?.click()
}

function onPicked(event: Event) {
  onFiles([...(event.target as HTMLInputElement).files ?? []])
  ;(event.target as HTMLInputElement).value = ''
}

function onFiles(files: File[]) {
  const [image, ...more] = files.filter(file => file.type.startsWith('image/'))
  const text = files.find(file => /\.(?:md|markdown|txt)$/i.test(file.name) || file.type.startsWith('text/'))
  // Decoding happens before the resize, so a huge original can stall the tab.
  if (image && image.size > 20e6) {
    problem.value = `${image.name} 超过 20 MB，先缩小再插`
  }
  else if (image) {
    pending.value = { file: image, alt: '', caption: '' }
    if (more.length)
      problem.value = `一次插一张：先给 ${image.name} 写说明，其余的再拖一次`
  }
  else if (text) {
    importText(text)
  }
  else if (files.length) {
    problem.value = `${files[0].name} 既不是图片也不是 Markdown，放不进来`
  }
}

async function importText(file: File) {
  const text = splitFrontmatter((await file.text()).replace(/\r\n?/g, '\n')).body.replace(/^\s+/, '')
  const titledText = destination.value && !extractH1(text)
    ? `# ${file.name.replace(/\.[^.]+$/, '')}\n\n${text}`
    : text
  if (draft.value.trim())
    insertAt?.(`\n${titledText}\n`)
  else
    replaceAll?.(titledText)
}

async function insertImage() {
  const choice = pending.value
  if (!choice || !choice.alt.trim())
    return

  busy.value = true
  try {
    const { toWebp } = await import('./editor/image')
    const image = await toWebp(choice.file)
    const dir = `${target.value.path.split('/')[0]}/assets`
    const path = `/${dir}/${image.name}`
    images.value.push({ path: `${dir}/${image.name}`, base64: image.base64 })
    pendingUrls.set(path, image.url)
    const caption = choice.caption.trim() ? ` caption="${choice.caption.trim()}"` : ''
    insertAt?.(`\n<Figure src="${path}" alt="${choice.alt.trim()}"${caption} />\n`)
    pending.value = undefined
  }
  catch (error) {
    problem.value = (error as Error).message
  }
  finally {
    busy.value = false
  }
}

async function showPreview() {
  const { openPreview } = await import('./editor/preview')
  preview = await openPreview(draft.value, pendingUrls)
  if (preview)
    stage.value = 'previewing'
}

function backToEditing() {
  preview?.close()
  preview = undefined
  stage.value = 'editing'
}

function onKey(event: KeyboardEvent) {
  if (event.key !== 'Escape')
    return
  if (saveOpen.value) {
    saveOpen.value = false
  }
  else if (pending.value) {
    pending.value = undefined
  }
  else if (stage.value === 'previewing') {
    backToEditing()
  }
  else if (armed.value) {
    armed.value = false
    leaving.value = false
  }
  // Escaping out of unsaved work would throw the draft away without asking.
  else if (stage.value !== 'closed' && !changed.value) {
    close()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

onBeforeUnmount(teardown)

onMounted(async () => {
  signedIn.value = localMode || await isSignedIn()
  if (signedIn.value)
    member.value = await whoami()
})

// Filled after mount: the server renders for no particular keyboard, and
// CodeMirror's Mod-s is ⌘ on a Mac and Ctrl everywhere else.
const mod = ref('')
onMounted(() => {
  mod.value = /mac|iphone|ipad/i.test(navigator.userAgent) ? '⌘' : 'Ctrl+'
})
// VitePress uses this variable to move its fixed navigation and sidebars below
// anything mounted in the layout-top slot.
watch(stage, async (current) => {
  if (current !== 'previewing') {
    document.documentElement.style.removeProperty('--vp-layout-top-height')
    return
  }
  await nextTick()
  const bar = document.querySelector<HTMLElement>('#nb-preview-top .nb-preview-bar')
  if (bar)
    document.documentElement.style.setProperty('--vp-layout-top-height', `${bar.offsetHeight}px`)
})

onBeforeUnmount(() => document.documentElement.style.removeProperty('--vp-layout-top-height'))

function reset() {
  restored.value = false
  images.value = []
  pendingUrls.clear()
  problem.value = ''
  result.value = undefined
  summary.value = ''
  destination.value = undefined
  head.value = ''
  base.value = undefined
  saveOpen.value = false
  pending.value = undefined
}

// The editor mounts once per sheet; a second choice needs a fresh one.
function chooseAgain() {
  teardown()
  stage.value = 'choosing'
}

async function startNew() {
  if (!signedIn.value) {
    await signIn(location.pathname)
    return
  }
  reset()
  slug.value = ''
  original.value = ''
  draft.value = ''
  const saved = recall('new')
  const was = DESTINATIONS.find(d => d.id === saved?.destination)
  if (was && restore('new')) {
    destination.value = was
    slug.value = saved!.slug ?? draftSlug(was)
    stage.value = 'editing'
    base.value = await startedAt().catch(() => undefined)
    return
  }
  chooseAgain()
}

async function chose(choice: Destination) {
  if (!destination.value || slug.value === draftSlug(destination.value))
    slug.value = draftSlug(choice)
  destination.value = choice
  stage.value = 'editing'
  base.value = await startedAt().catch(() => undefined)
}

async function open() {
  if (!signedIn.value) {
    await signIn(location.pathname)
    return
  }

  reset()
  stage.value = 'loading'
  try {
    const [file, from] = await Promise.all([load(page.value.filePath), startedAt()])
    const parts = splitFrontmatter(file.content)
    head.value = parts.head
    original.value = parts.body
    draft.value = parts.body
    base.value = from
    restore(page.value.filePath)
    stage.value = 'editing'
  }
  catch (error) {
    problem.value = (error as Error).message
    stage.value = 'failed'
  }
}

async function submit() {
  armed.value = false
  leaving.value = false
  stage.value = 'submitting'
  progress.value = ''
  try {
    const at = destination.value
    if (at)
      progress.value = '正在检查这个网址是否可用……'
    if (at && await taken(target.value.path)) {
      slugTaken.value = target.value.route
      stage.value = 'editing'
      return
    }

    const front = at
      ? frontmatterFor(at, { login: member.value?.name ?? '', slug: slug.value, summary: summary.value.trim() })
      : head.value
    result.value = await send(target.value.path, {
      content: front + draft.value,
      summary: summary.value.trim(),
      author: member.value?.name ?? '',
      images: images.value,
      base: base.value,
      checklist: checklist.value,
    }, step => (progress.value = step))
    forget(draftKey.value)
    for (const url of pendingUrls.values())
      URL.revokeObjectURL(url)
    pendingUrls.clear()
    images.value = []
    saveOpen.value = false
    teardown()
    stage.value = 'closed'
  }
  catch (error) {
    // Recoverable — the draft has to survive, and a slug collision is fixed
    // right here. Only a failed load is terminal.
    problem.value = (error as Error).message
    stage.value = 'editing'
  }
  finally {
    progress.value = ''
  }
}

// Signing out closes the sheet too, so it goes through the same confirmation
// rather than taking the draft with it unannounced.
function close(andSignOut = false) {
  if (changed.value && !armed.value) {
    armed.value = true
    leaving.value = andSignOut
    return
  }
  discard()
}

function discard() {
  forget(draftKey.value)
  const out = leaving.value
  teardown()
  armed.value = false
  leaving.value = false
  saveOpen.value = false
  pending.value = undefined
  progress.value = ''
  stage.value = 'closed'
  result.value = undefined
  if (out)
    signOut()
}

const TOOLS: { kind: Format, icon: Component, name: string, key?: string }[] = [
  { kind: 'h1', icon: Heading1, name: '标题' },
  { kind: 'h2', icon: Heading2, name: '小标题' },
  { kind: 'bold', icon: Bold, name: '加粗', key: 'B' },
  { kind: 'italic', icon: Italic, name: '斜体', key: 'I' },
  { kind: 'code', icon: Code2, name: '代码', key: 'E' },
  { kind: 'link', icon: Link, name: '链接', key: 'K' },
  { kind: 'list', icon: List, name: '列表', key: '⇧8' },
  { kind: 'ordered', icon: ListOrdered, name: '编号列表', key: '⇧7' },
  { kind: 'quote', icon: Quote, name: '引用', key: '⇧.' },
]

function insertOutline() {
  const outline = destination.value?.outline
  if (!outline)
    return
  // Land on the empty heading, which is the first thing to fill in.
  insertAt?.(outline, outline.indexOf('\n'))
}
</script>

<template>
  <div class="nb-edit">
    <p v-if="result" class="nb-edit-result">
      <a v-if="result.url" :href="result.url" target="_blank" rel="noreferrer">{{ result.label }}</a>
      <span v-else>{{ result.label }}</span>
    </p>
    <button type="button" class="nb-edit-open" @click="open">
      {{ signedIn ? '在本页编辑' : '登录后在本页编辑' }}
    </button>
    <button type="button" class="nb-edit-open is-secondary" @click="startNew">
      {{ signedIn ? '新建一页' : '登录后新建一页' }}
    </button>

    <!-- The rail's containing block traps position: fixed. -->
    <Teleport to="body">
      <div
        v-if="stage !== 'closed'"
        ref="editSheet"
        class="nb-edit-sheet"
        :class="{ 'is-away': stage === 'previewing' }"
        role="dialog"
        aria-modal="true"
        aria-label="编辑页面"
        @scroll.passive="updateToolbarStuck"
      >
        <div class="nb-edit-inner">
          <header class="nb-edit-head">
            <div class="nb-edit-who">
              <span class="nb-edit-title">{{ heading.title }}</span>
              <span v-if="heading.path" class="nb-edit-path">{{ heading.path }}</span>
            </div>
            <div class="nb-edit-who-right">
              <span v-if="member?.name" class="nb-edit-member">
                <img
                  v-if="member.picture"
                  class="nb-edit-avatar"
                  :src="member.picture"
                  alt=""
                  width="20"
                  height="20"
                >
                {{ member.name }}
              </span>
              <button v-if="!localMode && member?.name" type="button" class="nb-edit-signout" @click="close(true)">
                退出登录
              </button>
            </div>
          </header>

          <p v-if="transcribed && stage !== 'choosing'" class="nb-edit-origin">
            这一页照录自「{{ transcribed }}」。原文的笔误是有意留着的，改动请只用来修正转写本身的错误。
          </p>

          <div v-if="stage === 'choosing'" class="nb-pick">
            <p class="nb-pick-lead">
              这篇放哪里？每一栏收的东西和写法都不一样。
            </p>
            <ul class="nb-pick-list">
              <li v-for="option in DESTINATIONS" :key="option.id">
                <button type="button" class="nb-pick-option" @click="chose(option)">
                  <span class="nb-pick-label">{{ option.label }}</span>
                  <span class="nb-pick-what">{{ option.what }}</span>
                  <span class="nb-pick-how">{{ option.how }}</span>
                </button>
              </li>
            </ul>
          </div>

          <div v-if="destination && stage !== 'choosing'" class="nb-new-bar">
            <button type="button" class="nb-new-where" @click="chooseAgain">
              {{ destination.label }}
            </button>
            <label class="nb-new-slug">
              网址
              <input v-model="slug" spellcheck="false" placeholder="edu-email">
            </label>
            <span class="nb-new-route" :class="{ 'is-bad': slugBad }">{{ target.route }}</span>
            <span v-if="slugIssue" class="nb-new-issue">{{ slugIssue }}</span>
          </div>

          <p v-if="stage === 'loading'" class="nb-edit-note">
            正在读取原文……
          </p>

          <template v-if="stage !== 'choosing' && stage !== 'loading' && stage !== 'failed'">
            <div
              ref="toolbar"
              class="nb-edit-toolbar-shell"
              :class="{ 'is-stuck': toolbarStuck }"
            >
              <div class="nb-edit-toolbar" role="toolbar" aria-label="编辑工具">
                <span class="nb-edit-tools" role="toolbar" aria-label="格式">
                  <button
                    v-for="tool in TOOLS"
                    :key="tool.kind"
                    type="button"
                    class="nb-edit-tool"
                    :aria-label="tool.name"
                    :title="tool.key && mod ? `${tool.name}（${mod}${tool.key}）` : tool.name"
                    @click="applyFormat?.(tool.kind)"
                  >
                    <component
                      :is="tool.icon"
                      :size="tool.kind === 'h1' || tool.kind === 'h2' ? 20 : 18"
                      :stroke-width="1.8"
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    class="nb-edit-tool"
                    aria-label="插入图片"
                    title="插入图片"
                    :disabled="stage === 'submitting'"
                    @click="pick('image/*')"
                  >
                    <ImagePlus :size="18" :stroke-width="1.8" aria-hidden="true" />
                  </button>
                  <button
                    v-if="!draft.trim() && destination?.outline"
                    type="button"
                    class="nb-edit-tool is-wide"
                    title="插入文档结构"
                    @click="insertOutline"
                  >
                    结构
                  </button>
                </span>
                <span class="nb-edit-toolbar-actions">
                  <span class="nb-edit-toolbar-space" />
                  <span v-if="restored" class="nb-edit-restored" role="status">
                    <span>已恢复上次的草稿。</span>
                    <button
                      type="button"
                      :aria-label="destination ? '清空草稿' : '恢复原文'"
                      :title="destination ? '清空草稿' : '恢复原文'"
                      @click="startOver"
                    >
                      <Trash2 v-if="destination" :size="16" :stroke-width="1.8" aria-hidden="true" />
                      <RotateCcw v-else :size="16" :stroke-width="1.8" aria-hidden="true" />
                      <span class="nb-edit-restored-action-label">
                        {{ destination ? '清空草稿' : '恢复原文' }}
                      </span>
                    </button>
                  </span>
                  <button type="button" class="nb-edit-action" :disabled="stage === 'submitting'" @click="showPreview">
                    <Eye :size="17" :stroke-width="1.8" aria-hidden="true" />
                    预览
                  </button>
                  <button
                    v-if="!destination"
                    type="button"
                    class="nb-edit-action"
                    :class="{ 'is-on': diffing }"
                    :disabled="!changed || stage === 'submitting'"
                    @click="toggleDiff"
                  >
                    <FileDiff :size="17" :stroke-width="1.8" aria-hidden="true" />
                    变更
                  </button>
                  <span class="nb-edit-separator" aria-hidden="true" />
                  <button type="button" class="nb-edit-action" :disabled="stage === 'submitting'" @click="close()">
                    取消
                  </button>
                  <button
                    type="button"
                    class="nb-edit-submit"
                    :disabled="!canOpenSave || stage === 'submitting'"
                    @click="openSave"
                  >
                    {{ localMode ? '保存' : '提交' }}
                  </button>
                </span>
              </div>
            </div>

            <p v-if="problem" class="nb-edit-why is-bad">
              {{ problem }}
            </p>
            <div ref="host" class="nb-edit-area" :class="{ 'is-busy': stage === 'submitting' }" />
            <input ref="picker" type="file" :accept="accepts" hidden @change="onPicked">
          </template>

          <div v-if="stage === 'failed'" class="nb-edit-failed">
            <p class="nb-edit-problem">
              {{ problem }}
            </p>
            <button type="button" class="nb-edit-ghost" @click="open">
              重试
            </button>
          </div>
        </div>
      </div>

      <div v-if="pending" class="nb-edit-modal" role="presentation">
        <form class="nb-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="nb-image-title" @submit.prevent="insertImage">
          <div>
            <h2 id="nb-image-title" class="nb-edit-dialog-title">
              插入图片
            </h2>
            <p class="nb-edit-dialog-note">
              {{ pending.file.name }}
            </p>
          </div>
          <label class="nb-edit-field">
            <span>图片描述 <small>必填</small></span>
            <input v-model="pending.alt" class="nb-edit-summary" placeholder="图里是什么？" autofocus>
            <small>帮助看不见图片的读者理解内容。</small>
          </label>
          <label class="nb-edit-field">
            <span>图注 <small>可选</small></span>
            <input v-model="pending.caption" class="nb-edit-summary" placeholder="显示在图片下方">
          </label>
          <div class="nb-edit-dialog-actions">
            <button type="button" class="nb-edit-ghost" :disabled="busy" @click="pending = undefined">
              取消
            </button>
            <button type="submit" class="nb-edit-submit" :disabled="!pending.alt.trim() || busy">
              {{ busy ? '转换中……' : '插入图片' }}
            </button>
          </div>
        </form>
      </div>

      <div v-if="saveOpen" class="nb-edit-modal" role="presentation">
        <form class="nb-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="nb-save-title" @submit.prevent="canSubmit && submit()">
          <div>
            <h2 id="nb-save-title" class="nb-edit-dialog-title">
              {{ localMode
                ? (destination ? '保存新页面' : '保存修改')
                : (destination ? '提交新页面' : '提交修改') }}
            </h2>
            <p v-if="!localMode" class="nb-edit-dialog-note">
              维护者会先审阅；通过后才会更新线上页面。
            </p>
          </div>
          <label class="nb-edit-field">
            <span>{{ destination ? '页面摘要' : '修改说明' }}</span>
            <input
              v-model="summary"
              class="nb-edit-summary"
              :placeholder="destination?.dated ? '简要说明这次记录的内容' : destination ? '简要说明这一页的内容' : '简要说明这次修改'"
              :disabled="stage === 'submitting'"
              autofocus
            >
          </label>
          <p v-if="problem || progress" class="nb-edit-dialog-status" :class="{ 'is-bad': problem }">
            {{ problem || progress }}
          </p>
          <div class="nb-edit-dialog-actions">
            <button type="button" class="nb-edit-ghost" :disabled="stage === 'submitting'" @click="saveOpen = false">
              取消
            </button>
            <button type="submit" class="nb-edit-submit" :disabled="!canSubmit || stage === 'submitting'">
              {{ stage === 'submitting'
                ? (localMode ? '保存中……' : '提交中……')
                : localMode
                  ? (destination ? '保存页面' : '保存修改')
                  : (destination ? '提交页面' : '提交修改') }}
            </button>
          </div>
        </form>
      </div>

      <div v-if="armed" class="nb-edit-modal" role="presentation">
        <div class="nb-edit-dialog" role="alertdialog" aria-modal="true" aria-labelledby="nb-discard-title">
          <div>
            <h2 id="nb-discard-title" class="nb-edit-dialog-title">
              修改尚未保存
            </h2>
            <p class="nb-edit-dialog-note">
              {{ armedLead }}
            </p>
          </div>
          <div class="nb-edit-dialog-actions">
            <button type="button" class="nb-edit-ghost" @click="armed = false; leaving = false">
              继续编辑
            </button>
            <button type="button" class="nb-edit-ghost is-danger" @click="discard">
              放弃修改
            </button>
          </div>
        </div>
      </div>

      <Teleport v-if="stage === 'previewing'" to="#nb-preview-top">
        <div class="nb-preview-bar">
          <span class="nb-preview-mode">
            <Eye :size="18" :stroke-width="1.8" aria-hidden="true" />
            预览模式
          </span>
          <button type="button" class="nb-edit-ghost" @click="backToEditing">
            继续编辑
          </button>
          <button type="button" class="nb-edit-submit" :disabled="!canOpenSave" @click="openSave">
            {{ localMode ? '保存' : '提交' }}
          </button>
        </div>
      </Teleport>
    </Teleport>
  </div>
</template>

<style scoped>
.nb-edit {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: baseline;
}

.nb-edit-result {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.nb-edit-open {
  color: var(--vp-c-brand-1);
  font: inherit;
  transition: color 0.2s;
}

.nb-edit-open.is-secondary {
  color: var(--vp-c-text-3);
}

.nb-edit-open:hover {
  color: var(--vp-c-brand-2);
}

.nb-edit-sheet.is-away {
  display: none;
}

.nb-edit-sheet {
  position: fixed;
  inset: 0;
  z-index: 60;
  padding: 0 21px 21px;
  overflow-y: auto;
  background: var(--vp-c-bg);
  animation: nb-sheet-in 180ms cubic-bezier(0.2, 0, 0.2, 1);

  /* The published page's measure; writing and its chrome share one axis. */
  --nb-measure: 43rem;
}

/* A full-screen takeover that just appears reads as a glitch. */
@keyframes nb-sheet-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nb-edit-sheet {
    animation: none;
  }
}

.nb-edit-inner {
  display: flex;
  flex-direction: column;
  gap: 13px;
  width: 100%;
  max-width: 76rem;
  min-height: 100%;
  margin: 0 auto;
}

.nb-edit-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 21px;
  padding: 21px 8px 0;
}

.nb-edit-title {
  font-size: 16px;
  font-weight: 600;
}

.nb-edit-path {
  margin-left: 13px;
  font-family: var(--nb-mono);
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.nb-edit-who-right {
  display: flex;
  gap: 13px;
  align-items: center;
  flex-shrink: 0;
}

.nb-edit-member {
  display: flex;
  gap: 5px;
  align-items: center;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.nb-edit-avatar {
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
}

.nb-edit-signout {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.nb-edit-signout:hover {
  color: var(--vp-c-text-1);
}

.nb-edit-area {
  flex: none;
  min-height: calc(100vh - 10rem);
}

.nb-edit-area.is-busy {
  opacity: 0.5;
  pointer-events: none;
}

.nb-edit-toolbar-shell {
  position: sticky;
  z-index: 2;
  top: 0;
  isolation: isolate;
  width: 100%;
}

.nb-edit-toolbar {
  display: flex;
  flex: none;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  width: 100%;
  margin: 0 auto;
  padding: 10px 8px;
  overflow-x: auto;
  background: transparent;
  scrollbar-width: none;
}

.nb-edit-toolbar-shell.is-stuck::before {
  position: absolute;
  z-index: -1;
  inset-block: 0;
  left: 50%;
  width: 100vw;
  border-bottom: 1px solid var(--vp-c-divider);
  background: color-mix(in srgb, var(--vp-c-bg) 82%, transparent);
  backdrop-filter: blur(12px);
  content: '';
  transform: translateX(-50%);
}

.nb-edit-toolbar::-webkit-scrollbar {
  display: none;
}

.nb-edit-toolbar-space {
  flex: 1 1 auto;
  min-width: 21px;
}

.nb-edit-toolbar-actions {
  display: contents;
}

.nb-edit-restored {
  display: inline-flex;
  flex: none;
  gap: 8px;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  font-size: 12px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}

.nb-edit-restored button {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.nb-edit-restored button:hover {
  color: var(--vp-c-brand-2);
}

.nb-edit-action {
  display: inline-flex;
  flex: none;
  gap: 7px;
  align-items: center;
  padding: 5px 7px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.nb-edit-action svg {
  color: var(--vp-c-text-3);
}

.nb-edit-action:hover:not(:disabled),
.nb-edit-action.is-on {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.nb-edit-action:hover:not(:disabled) svg,
.nb-edit-action.is-on svg {
  color: var(--vp-c-brand-1);
}

.nb-edit-action:disabled {
  opacity: 0.4;
}

.nb-edit-separator {
  flex: none;
  width: 1px;
  height: 20px;
  margin: 0 3px;
  background: var(--vp-c-divider);
}

.nb-edit-toolbar .nb-edit-submit {
  flex: none;
  padding: 6px 16px;
}

.nb-edit-summary {
  flex-grow: 1.618;
  padding: 8px 13px;
  font-size: 14px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}

.nb-edit-summary:focus {
  border-color: var(--vp-c-brand-1);
  outline: none;
}

.nb-edit-submit {
  padding: 8px 21px;
  font-size: 14px;
  color: #fff;
  background: var(--vp-c-brand-1);
  border-radius: 4px;
  transition: opacity 0.2s;
}

.nb-edit-submit:disabled,
.nb-edit-ghost:disabled {
  opacity: 0.4;
}

.nb-edit-ghost {
  padding: 8px 16px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}

.nb-edit-ghost:hover:not(:disabled) {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}

.nb-edit-ghost.is-on {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.nb-preview-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 13px;
  align-items: center;
  width: 100%;
  padding: 14px 21px;
  background: var(--vp-c-bg-soft);
  box-shadow: 0 6px 18px rgb(0 0 0 / 10%);
}

.nb-edit-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 21px;
  background: color-mix(in srgb, var(--vp-c-bg) 72%, transparent);
  backdrop-filter: blur(3px);
}

.nb-edit-dialog {
  display: flex;
  flex-direction: column;
  gap: 21px;
  width: min(100%, 32rem);
  max-height: calc(100vh - 42px);
  padding: 26px;
  overflow-y: auto;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: var(--vp-shadow-4);
}

.nb-edit-dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.nb-edit-dialog-note {
  margin: 5px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-3);
}

.nb-edit-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.nb-edit-field small {
  font-size: 12px;
  font-weight: 400;
  color: var(--vp-c-text-3);
}

.nb-edit-dialog-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.nb-edit-dialog-actions > button {
  flex: 1 1 0;
  min-width: 0;
}

.nb-edit-dialog-status {
  margin: -8px 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.nb-edit-dialog-status.is-bad {
  color: var(--vp-c-danger-1);
}

.nb-preview-mode {
  display: inline-flex;
  flex: 1;
  gap: 7px;
  align-items: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.nb-edit-note {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.nb-edit-origin {
  width: 100%;
  max-width: var(--nb-measure);
  margin: 0 auto;
  padding: 8px 21px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
}

.nb-pick {
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  max-width: var(--nb-measure);
  margin: 0 auto;
  padding-top: 34px;
}

.nb-pick-lead {
  margin: 0 0 21px;
  font-size: 15px;
  color: var(--vp-c-text-2);
}

.nb-pick-list {
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--vp-c-divider);
  list-style: none;
  overflow-y: auto;
}

.nb-pick-option {
  display: grid;
  grid-template-columns: 7em 1fr;
  gap: 2px 13px;
  width: 100%;
  padding: 13px 13px 13px 0;
  border: 0;
  border-bottom: 1px solid var(--vp-c-divider);
  border-left: 2px solid transparent;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    border-left-color 150ms ease,
    padding-left 150ms ease;
}

.nb-pick-option:hover,
.nb-pick-option:focus-visible {
  padding-left: 13px;
  border-left-color: var(--vp-c-brand-1);
  outline: none;
}

.nb-pick-label {
  grid-row: span 2;
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.nb-pick-what {
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.nb-pick-how {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.nb-new-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 5px 13px;
  width: 100%;
  max-width: var(--nb-measure);
  margin: 0 auto;
  padding: 0 21px;
}

.nb-new-where {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.nb-new-where::after {
  content: '⌄';
  margin-left: 3px;
}

.nb-new-slug {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.nb-new-slug input {
  width: 11rem;
  padding: 2px 0;
  border: 0;
  border-bottom: 1px solid var(--vp-c-divider);
  border-radius: 0;
  background: transparent;
  color: var(--vp-c-text-1);
  font-family: var(--nb-mono);
  font-size: 13px;
}

.nb-new-slug input:focus {
  border-bottom-color: var(--vp-c-brand-1);
  outline: none;
}

.nb-new-route {
  font-family: var(--nb-mono);
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.nb-new-route.is-bad {
  color: var(--vp-c-danger-1);
  text-decoration: line-through;
}

.nb-new-issue {
  flex: 1 0 100%;
  font-size: 13px;
  color: var(--vp-c-danger-1);
}

.nb-edit-syntax {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px 16px;
  width: 100%;
  max-width: var(--nb-measure);
  margin: 0 auto;
  padding: 0 21px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.nb-edit-syntax code {
  color: var(--vp-c-text-2);
  font-family: var(--nb-mono);
}

.nb-edit-tools {
  display: flex;
  flex: none;
  flex-wrap: nowrap;
  gap: 3px;
}

.nb-edit-tool {
  display: grid;
  place-items: center;
  min-width: 28px;
  min-height: 28px;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.nb-edit-tool:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.nb-edit-tool code {
  color: var(--vp-c-text-2);
  font-family: var(--nb-mono);
}

.nb-edit-outline {
  font-size: 12px;
  color: var(--vp-c-brand-1);
}

.nb-edit-outline:hover {
  color: var(--vp-c-brand-2);
}

.nb-edit-ghost.is-danger {
  color: var(--vp-c-danger-1);
}

.nb-edit-ghost.is-danger:hover:not(:disabled) {
  color: var(--vp-c-danger-1);
  border-color: var(--vp-c-danger-1);
}

.nb-edit-why.is-bad {
  color: var(--vp-c-danger-1);
}

.nb-edit-failed {
  display: flex;
  flex-direction: column;
  gap: 13px;
  align-items: flex-start;
  width: 100%;
  max-width: var(--nb-measure);
  margin: 0 auto;
  padding: 34px 21px 0;
}

.nb-edit-why {
  width: 100%;
  max-width: var(--nb-measure);
  margin: 0 auto;
  padding: 0 21px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.nb-edit-problem {
  color: var(--vp-c-danger-1);
}

@media (max-width: 640px) {
  .nb-edit-sheet {
    padding: 0 0 13px;
  }

  .nb-edit-head {
    padding: 13px 8px 0;
  }

  .nb-edit-toolbar {
    flex-wrap: wrap;
    column-gap: 3px;
    row-gap: 8px;
    padding: 6px 8px;
    overflow-x: hidden;
  }

  .nb-edit-tools {
    flex: 0 0 100%;
    gap: 2px;
    width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .nb-edit-tools::-webkit-scrollbar,
  .nb-edit-toolbar-actions::-webkit-scrollbar {
    display: none;
  }

  .nb-edit-toolbar-actions {
    display: flex;
    gap: 3px;
    align-items: center;
    width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .nb-edit-toolbar-actions .nb-edit-toolbar-space {
    display: none;
  }

  .nb-edit-restored {
    gap: 0;
    min-height: 40px;
    padding: 0;
    background: transparent;
  }

  .nb-edit-restored > span {
    display: none;
  }

  .nb-edit-restored button {
    justify-content: center;
    width: 40px;
    min-height: 40px;
    padding: 0;
    border-radius: 4px;
    color: var(--vp-c-text-2);
    font-weight: 400;
  }

  .nb-edit-restored button svg {
    color: var(--vp-c-text-3);
  }

  .nb-edit-restored button:hover {
    background: var(--vp-c-bg-soft);
    color: var(--vp-c-brand-1);
  }

  .nb-edit-restored button:hover svg {
    color: var(--vp-c-brand-1);
  }

  .nb-edit-restored-action-label {
    display: none;
  }

  .nb-edit-action {
    gap: 4px;
    min-height: 40px;
    padding: 6px 8px;
  }

  .nb-edit-separator {
    width: 0;
    height: 0;
    margin: 0 0 0 auto;
    background: transparent;
  }

  .nb-edit-toolbar .nb-edit-submit {
    min-height: 40px;
    margin-left: 5px;
    padding: 6px 14px;
  }

  /* A writer does not need the file path; the screen is worth more. */
  .nb-edit-path {
    display: none;
  }

  .nb-edit-foot {
    flex-wrap: wrap;
    gap: 8px;
  }

  .nb-edit-summary {
    flex: 1 0 100%;
  }

  .nb-edit-ghost {
    flex: 1;
    padding: 8px 0;
  }

  .nb-edit-submit {
    flex: 1.618;
    padding: 8px 0;
  }

  .nb-pick {
    padding: 21px 21px 0;
  }

  .nb-edit-tool {
    min-width: 40px;
    min-height: 40px;
    padding: 4px 6px;
  }

  .nb-pick-option {
    grid-template-columns: 1fr;
  }

  .nb-pick-label {
    grid-row: auto;
  }
}
</style>
