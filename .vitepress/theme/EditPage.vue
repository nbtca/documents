<script setup lang="ts">
import type { EditorView } from '@codemirror/view'
import type { Component } from 'vue'
import type { OpenDraft, PullSummary } from '../../utils/github'
import type { MarkdownIssue } from '../../utils/markdown-validation'
import type { TypographyHint } from '../../utils/typography'
import type { Me, PendingImage } from './editor/backend'
import type { Format, Heading } from './editor/codemirror'
import type { Destination } from './editor/destinations'
import type { Preview } from './editor/preview'
import {
  Bold,
  CircleAlert,
  CircleCheck,
  Code2,
  Columns2,
  FileDiff,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Lightbulb,
  Link,
  List,
  ListOrdered,
  ListTree,
  Quote,
  RotateCcw,
  SquareCode,
  Trash2,
} from '@lucide/vue'
import { useData } from 'vitepress'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { extractH1, splitFrontmatter } from '../../utils/markdown'
import { codeParts } from '../../utils/markdown-rules'
import { fixMarkdown, lintMarkdown } from '../../utils/markdown-validation'
import { typographyHints } from '../../utils/typography'
import { data as sitePages } from './concepts.data'
import { reviewNoteFor, transcribedFrom } from './editor/archive'
import { isSignedIn, signIn, signOut } from './editor/auth'
import { currentSha, historyUrl, load, localMode, myPulls, remoteDraft, submit as send, startedAt, taken, me as whoami } from './editor/backend'
import {
  checklistFor,
  DESTINATIONS,
  draftSlug,
  frontmatterFor,
  outlineFor,
  pathFor,
  placeholderFor,
  routeFor,
  slugProblem,
} from './editor/destinations'
import { forget, keep, recall } from './editor/drafts'
import { previewLineAtY, previewYForLine } from './editor/scroll-sync'

type Stage = 'closed' | 'choosing' | 'loading' | 'editing' | 'submitting' | 'failed'

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
const sha = ref<string>()
const moved = ref(false)
// An open draft pull request this writer left for the page, maybe on another
// device. Saving again adds to it instead of opening a second one.
const onto = ref<OpenDraft>()
const offered = ref<OpenDraft>()
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
let preview: Preview | undefined
let editorView: EditorView | undefined
let sourceLineAt: ((view: EditorView, y: number) => number) | undefined
let sourceYFor: ((view: EditorView, line: number) => number) | undefined
let insertAt: ((snippet: string, caret?: number) => void) | undefined
let showDiff: ((original: string | undefined) => void) | undefined
let applyFormat: ((kind: Format) => void) | undefined
let replaceAll: ((text: string) => void) | undefined
let showIssues: ((issues: MarkdownIssue[]) => void) | undefined
let revealIssue: ((issue: MarkdownIssue) => void) | undefined

const diffing = ref(false)
const outlineOpen = ref(false)
const headings = ref<Heading[]>([])
const cursorLine = ref(1)
let readHeadings: (() => Heading[]) | undefined
let jumpToLine: ((line: number) => void) | undefined
const markdownIssues = ref<MarkdownIssue[]>([])
const hints = ref<TypographyHint[]>([])
let showHints: ((hints: TypographyHint[]) => void) | undefined
const checkingMarkdown = ref(false)
const checkedMarkdown = ref(false)
const checkProblem = ref('')

const images = ref<PendingImage[]>([])
const pendingUrls = new Map<string, string>()
const picker = ref<HTMLInputElement>()
const accepts = ref('image/*')
const pending = ref<{ file: File, alt: string, caption: string } | undefined>()
const busy = ref(false)

const restored = ref(false)
// Asked once per editing session; repeating it on every paste would be noise.
const pasteAsked = ref(false)
const pasteNotice = ref(false)

// Below this width two columns leave each side narrower than a phone, so the
// preview becomes a tab instead of a pane.
const SPLIT = '(min-width: 1024px)'
const wide = ref(false)
const previewOpen = ref(true)
const tab = ref<'source' | 'preview'>('source')
const previewHost = ref<HTMLElement>()
const showingPreview = computed(() => wide.value ? previewOpen.value : tab.value === 'preview')
const showingSource = computed(() => wide.value || tab.value === 'source')

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

const isArchived = computed(() => destination.value?.id === 'archived'
  || (!destination.value && page.value.filePath.startsWith('archived/')))

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
    return destination.value ? '先在下面写正文，第一行是 # 标题' : '还没有改动'
  if (splitFrontmatter(draft.value.trimStart()).head)
    return '开头的 --- 信息块会在提交时自动生成，请从正文里删掉'
  if (destination.value && !titled.value)
    return '正文第一行写 # 标题，它同时是页面标题和边栏上的名字'
  return ''
})

const syntaxBlocker = computed(() => {
  if (!changed.value || checkProblem.value)
    return ''
  if (checkingMarkdown.value)
    return '正在检查 Markdown 格式'
  if (checkedMarkdown.value && markdownIssues.value.length)
    return `Markdown 还有 ${markdownIssues.value.length} 处需要修正`
  return ''
})

const blocker = computed(() => {
  if (contentBlocker.value)
    return contentBlocker.value
  if (syntaxBlocker.value)
    return syntaxBlocker.value
  if (!summary.value.trim())
    return destination.value ? '写一句话说明这一页讲什么' : '写一句话说明这次改了什么'
  return ''
})

const canSubmit = computed(() => !blocker.value && !slugIssue.value)
const canOpenSave = computed(() => !contentBlocker.value && !syntaxBlocker.value && !slugIssue.value)
const onlyFixable = computed(() => checkedMarkdown.value && markdownIssues.value.length > 0
  && markdownIssues.value.every(issue => issue.fixInfo))
const canFixAndSave = computed(() => !contentBlocker.value && !slugIssue.value && onlyFixable.value)

// A draft is unfinished by definition, so only what would break saving it
// at all is checked; Markdown problems wait for the real submission.
const canDraftFromToolbar = computed(() => !localMode && changed.value && !contentBlocker.value && !slugIssue.value && Boolean(syntaxBlocker.value))
const canSaveDraft = computed(() => !localMode && changed.value && !slugIssue.value && !splitFrontmatter(draft.value.trimStart()).head && Boolean(summary.value.trim()))

// A grey button with no reason is the first dead end a newcomer hits.
const saveHint = computed(() => {
  if (canFixAndSave.value)
    return `先自动修复 ${markdownIssues.value.length} 处格式问题，再打开保存窗口`
  if (canOpenSave.value)
    return undefined
  const reason = contentBlocker.value || slugIssue.value || syntaxBlocker.value
  return reason && !localMode && changed.value && syntaxBlocker.value === reason
    ? `${reason}。也可以先存为草稿，下次接着写`
    : reason || undefined
})

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
      sha: sha.value,
      destination: destination.value?.id,
      slug: slug.value,
      images: images.value,
    })
  }, 400)
}, { deep: true })

let checkTimer: ReturnType<typeof setTimeout> | undefined
let checkRun = 0

function clearMarkdownCheck() {
  clearTimeout(checkTimer)
  checkTimer = undefined
  checkRun++
  markdownIssues.value = []
  checkingMarkdown.value = false
  checkedMarkdown.value = false
  checkProblem.value = ''
  showIssues?.([])
  hints.value = []
  showHints?.([])
}

async function inspectMarkdown(): Promise<void> {
  clearTimeout(checkTimer)
  checkTimer = undefined
  const source = draft.value
  if (!changed.value || !source.trim()) {
    clearMarkdownCheck()
    return
  }

  const run = ++checkRun
  checkingMarkdown.value = true
  checkedMarkdown.value = false
  checkProblem.value = ''
  markdownIssues.value = []
  showIssues?.([])

  try {
    const issues = await lintMarkdown(source, { archived: isArchived.value, pages: ['/', ...sitePages.map(entry => entry.path)] })
    if (run !== checkRun)
      return
    markdownIssues.value = issues
    checkedMarkdown.value = true
    showIssues?.(issues)
    hints.value = isArchived.value ? [] : typographyHints(source)
    showHints?.(hints.value)
  }
  catch (error) {
    if (run !== checkRun)
      return
    checkProblem.value = error instanceof Error ? error.message : String(error)
    checkedMarkdown.value = true
    showIssues?.([])
  }
  finally {
    if (run === checkRun)
      checkingMarkdown.value = false
  }
}

function scheduleMarkdownCheck() {
  if (typeof window === 'undefined' || stage.value !== 'editing')
    return
  clearTimeout(checkTimer)
  checkTimer = undefined
  checkRun++
  checkingMarkdown.value = false
  checkedMarkdown.value = false
  checkProblem.value = ''
  markdownIssues.value = []
  showIssues?.([])

  if (!changed.value || !draft.value.trim()) {
    checkingMarkdown.value = false
    return
  }

  checkingMarkdown.value = true
  checkTimer = setTimeout(() => void inspectMarkdown(), 450)
}

watch([draft, stage], scheduleMarkdownCheck, { immediate: true })

function restore(key: string): boolean {
  const saved = recall(key)
  if (!saved || saved.draft === original.value)
    return false
  draft.value = saved.draft
  summary.value = saved.summary
  base.value = saved.base ?? base.value
  moved.value = Boolean(saved.sha && sha.value && saved.sha !== sha.value)
  sha.value = saved.sha ?? sha.value
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
  const { format, goToLine, headingsOf, lineAtY, mountEditor, revealMarkdownIssue, setDiff, setMarkdownIssues, setTypographyHints, yForLine } = await import('./editor/codemirror')
  sourceLineAt = lineAtY
  sourceYFor = yForLine
  const view = mountEditor(element, draft.value, value => (draft.value = value), () => {
    save()
  }, onFiles, destination.value && placeholderFor(destination.value), sitePages, line => (cursorLine.value = line), () => pick('image/*'), () => {
    if (!pasteAsked.value)
      pasteNotice.value = pasteAsked.value = true
  })
  readHeadings = () => headingsOf(view.state)
  jumpToLine = line => goToLine(view, line)
  if (outlineOpen.value)
    headings.value = readHeadings()
  view.focus()
  editorView = view
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
  showIssues = issues => setMarkdownIssues(view, issues)
  revealIssue = issue => revealMarkdownIssue(view, issue)
  showIssues(markdownIssues.value)
  showHints = found => setTypographyHints(view, found)
  showHints(hints.value)
  editor = { destroy: () => view.destroy() }
})

function teardown() {
  editor?.destroy()
  editor = undefined
  showIssues = undefined
  showHints = undefined
  revealIssue = undefined
  editorView = undefined
  pasteNotice.value = pasteAsked.value = false
  readHeadings = undefined
  jumpToLine = undefined
  clearMarkdownCheck()
  stopPreview()
  tab.value = 'source'
}

const fixableIssues = computed(() => markdownIssues.value.filter(issue => issue.fixInfo))

const issueGroups = computed(() => {
  const groups = new Map<string, { message: string, count: number }>()
  for (const issue of markdownIssues.value) {
    const group = groups.get(issue.rule) ?? { message: issue.message, count: 0 }
    group.count++
    groups.set(issue.rule, group)
  }
  return [...groups.values()].sort((left, right) => right.count - left.count)
})

async function autoFix(issues: MarkdownIssue[]): Promise<boolean> {
  const source = draft.value
  const fixed = await fixMarkdown(source, issues)
  if (fixed === source || draft.value !== source)
    return false
  replaceAll?.(fixed)
  return true
}

async function tidyTypography() {
  const source = draft.value
  const { applyFixes } = await import('markdownlint')
  const fixed = applyFixes(source, hints.value.map(hint => ({ lineNumber: hint.line, fixInfo: hint.fixInfo })))
  if (fixed !== source && draft.value === source)
    replaceAll?.(fixed)
}

async function fixAndSave() {
  if (!canFixAndSave.value || !await autoFix(markdownIssues.value))
    return
  await inspectMarkdown()
  openSave()
}

function save() {
  if (canFixAndSave.value)
    void fixAndSave()
  else
    void openSave(!canOpenSave.value)
}

async function jumpToIssue(issue: MarkdownIssue) {
  if (!showingSource.value)
    await switchTab('source')
  await nextTick()
  revealIssue?.(issue)
}

function toggleDiff() {
  diffing.value = !diffing.value
  showDiff?.(diffing.value ? original.value : undefined)
}

// Unfinished work can still be stored as a draft, so the dialog opens even
// when Markdown problems block submitting for review.
async function openSave(forDraft = false) {
  if (stage.value === 'submitting' || !(canOpenSave.value || (forDraft && changed.value && !localMode)))
    return
  if (!destination.value && sha.value) {
    const now = await currentSha(page.value.filePath)
    moved.value = moved.value || Boolean(now && now !== sha.value)
  }
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

let previewTimer: ReturnType<typeof setTimeout> | undefined
let syncing: 'source' | 'preview' | undefined
let syncTimer: ReturnType<typeof setTimeout> | undefined

async function startPreview() {
  const element = previewHost.value
  if (preview || !element)
    return
  const { mountPreview } = await import('./editor/preview')
  if (preview || previewHost.value !== element)
    return
  preview = await mountPreview(element, pendingUrls)
  preview.update(draft.value)
  requestAnimationFrame(syncFromSource)
}

function stopPreview() {
  clearTimeout(previewTimer)
  preview?.close()
  preview = undefined
}

// Rendering every keystroke would rebuild the Vue app and every Mermaid
// diagram dozens of times a second while the writer is mid-word.
watch(draft, () => {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    preview?.update(draft.value)
    requestAnimationFrame(syncFromSource)
  }, 200)
})

watch([showingPreview, previewHost], async ([visible]) => {
  if (!visible)
    return stopPreview()
  await nextTick()
  await startPreview()
})

function lock(side: 'source' | 'preview') {
  syncing = side
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => (syncing = undefined), 80)
}

// Top of the part of the sheet the writer can see, below the sticky toolbar.
function readingTop(): number {
  return (editSheet.value?.getBoundingClientRect().top ?? 0) + (toolbar.value?.offsetHeight ?? 0)
}

function syncFromSource() {
  const view = editorView
  const pane = previewHost.value
  if (!view || !pane || !sourceLineAt || syncing === 'preview' || !wide.value)
    return
  lock('source')
  const line = sourceLineAt(view, readingTop())
  pane.scrollTop += previewYForLine(pane, line, view.state.doc.lines) - pane.getBoundingClientRect().top
}

function syncFromPreview() {
  const view = editorView
  const pane = previewHost.value
  const sheet = editSheet.value
  if (!view || !pane || !sheet || !sourceYFor || syncing === 'source' || !wide.value)
    return
  lock('preview')
  const line = previewLineAtY(pane, pane.getBoundingClientRect().top, view.state.doc.lines)
  sheet.scrollTop += sourceYFor(view, line) - readingTop()
}

async function switchTab(next: 'source' | 'preview') {
  if (tab.value === next)
    return
  const view = editorView
  const sheet = editSheet.value
  const lines = view?.state.doc.lines ?? 1
  const top = readingTop()
  let line = 1
  if (view && sourceLineAt && next === 'preview')
    line = sourceLineAt(view, top)
  else if (previewHost.value)
    line = previewLineAtY(previewHost.value, top, lines)
  tab.value = next
  await nextTick()
  await startPreview()
  if (!sheet || !view)
    return
  if (next === 'preview' && previewHost.value)
    sheet.scrollTop += previewYForLine(previewHost.value, line, lines) - top
  else if (sourceYFor)
    sheet.scrollTop += sourceYFor(view, line) - top
}

// The writer spots a problem in the rendered page first; double-clicking it
// lands the cursor on the source line that produced it, as in VS Code.
async function jumpToPreviewLine(event: MouseEvent) {
  const pane = previewHost.value
  const view = editorView
  if (!pane || !view || !sourceYFor)
    return
  const line = Math.floor(previewLineAtY(pane, event.clientY, view.state.doc.lines))
  if (!wide.value)
    await switchTab('source')
  const at = view.state.doc.line(Math.min(Math.max(1, line), view.state.doc.lines)).from
  view.dispatch({ selection: { anchor: at } })
  view.focus()
  editSheet.value!.scrollTop += sourceYFor(view, line) - readingTop() - 80
}

// A link in the draft would otherwise navigate the page under the editor.
function onPreviewClick(event: MouseEvent) {
  const link = (event.target as Element).closest('a')
  const href = link?.getAttribute('href')
  if (!link || !href || link.target === '_blank')
    return
  event.preventDefault()
  if (href.startsWith('#'))
    previewHost.value?.querySelector(`[id="${CSS.escape(decodeURIComponent(href.slice(1)))}"]`)?.scrollIntoView()
  else
    window.open(href, '_blank', 'noreferrer')
}

function togglePreview() {
  if (!wide.value)
    return void switchTab(tab.value === 'preview' ? 'source' : 'preview')
  previewOpen.value = !previewOpen.value
  try {
    localStorage.setItem('nb-edit-preview', previewOpen.value ? 'on' : 'off')
  }
  catch {}
}

function onKey(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented)
    return
  if (saveOpen.value) {
    saveOpen.value = false
  }
  else if (pending.value) {
    pending.value = undefined
  }
  else if (armed.value) {
    armed.value = false
    leaving.value = false
  }
  // Escaping out of unsaved work would throw the draft away without asking.
  // Inside the editor, Escape belongs to CodeMirror: it closes the search
  // panel and frees Tab to leave the editor.
  else if (stage.value !== 'closed' && !changed.value && !(event.target as Element).closest?.('.cm-editor')) {
    close()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

onBeforeUnmount(teardown)

// The section the cursor is in: the last heading at or above it.
const currentHeading = computed(() => headings.value.findLast(heading => heading.line <= cursorLine.value)?.line)

watch([draft, outlineOpen], () => {
  if (outlineOpen.value)
    headings.value = readHeadings?.() ?? []
})

function toggleOutline() {
  outlineOpen.value = !outlineOpen.value
}

async function goToHeading(line: number) {
  if (!showingSource.value)
    await switchTab('source')
  jumpToLine?.(line)
  if (!wide.value)
    outlineOpen.value = false
}

const pulls = ref<PullSummary[]>([])

const PULL_STATE: Record<PullSummary['state'], string> = {
  open: '审阅中',
  merged: '已上线',
  closed: '未采纳',
}

// After submitting, a newcomer otherwise has no way back to their pull
// request short of digging through GitHub.
async function loadPulls() {
  pulls.value = await myPulls(member.value?.name ?? '').catch(() => [])
}

onMounted(async () => {
  signedIn.value = localMode || await isSignedIn()
  if (signedIn.value) {
    member.value = await whoami()
    void loadPulls()
  }
})

// Filled after mount: the server renders for no particular keyboard, and
// CodeMirror's Mod-s is ⌘ on a Mac and Ctrl everywhere else.
const mod = ref('')
onMounted(() => {
  mod.value = /mac|iphone|ipad/i.test(navigator.userAgent) ? '⌘' : 'Ctrl+'
})
// The preview pane sticks below the toolbar, whose height changes with the
// window width and with the restored-draft notice.
let toolbarSize: ResizeObserver | undefined
watch(toolbar, (element) => {
  toolbarSize?.disconnect()
  if (!element)
    return
  toolbarSize = new ResizeObserver(() => editSheet.value?.style.setProperty('--nb-toolbar-height', `${element.offsetHeight}px`))
  toolbarSize.observe(element)
})
onBeforeUnmount(() => toolbarSize?.disconnect())

onMounted(() => {
  const query = window.matchMedia(SPLIT)
  const update = () => (wide.value = query.matches)
  update()
  query.addEventListener('change', update)
  onBeforeUnmount(() => query.removeEventListener('change', update))
  try {
    previewOpen.value = localStorage.getItem('nb-edit-preview') !== 'off'
  }
  catch {}
})

function reset() {
  clearMarkdownCheck()
  restored.value = false
  images.value = []
  pendingUrls.clear()
  problem.value = ''
  result.value = undefined
  summary.value = ''
  destination.value = undefined
  head.value = ''
  base.value = undefined
  sha.value = undefined
  moved.value = false
  onto.value = undefined
  offered.value = undefined
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
    sha.value = file.sha
    restore(page.value.filePath)
    stage.value = 'editing'
    void remoteDraft(member.value?.name ?? '', page.value.filePath).then((found) => {
      if (found && found.content !== head.value + draft.value)
        offered.value = found
      else
        onto.value = found
    })
  }
  catch (error) {
    problem.value = (error as Error).message
    stage.value = 'failed'
  }
}

function continueDraft() {
  const found = offered.value
  if (!found)
    return
  const parts = splitFrontmatter(found.content)
  head.value = parts.head
  replaceAll?.(parts.body)
  onto.value = found
  offered.value = undefined
}

async function submit(draftOnly = false) {
  armed.value = false
  leaving.value = false
  stage.value = 'submitting'
  progress.value = ''
  try {
    const at = destination.value
    if (at && !onto.value)
      progress.value = '正在检查这个网址是否可用……'
    if (at && !onto.value && await taken(target.value.path)) {
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
      draft: draftOnly,
      onto: onto.value,
    }, step => (progress.value = step))
    forget(draftKey.value)
    void loadPulls()
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
  { kind: 'fence', icon: SquareCode, name: '代码块' },
  { kind: 'tip', icon: Lightbulb, name: '提示框' },
]

function insertOutline() {
  const outline = destination.value && outlineFor(destination.value, member.value?.name ?? '')
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
    <details v-if="pulls.length" class="nb-edit-pulls">
      <summary>我的提交</summary>
      <ul>
        <li v-for="pull in pulls" :key="pull.number">
          <a :href="pull.url" target="_blank" rel="noreferrer">{{ pull.title.replace(/^docs: /, '') }}</a>
          <span class="nb-edit-pull-state" :class="`is-${pull.state}`">
            {{ pull.draft ? '草稿' : PULL_STATE[pull.state] }}<template v-if="pull.state === 'open' && pull.comments"> · {{ pull.comments }} 条留言</template>
          </span>
        </li>
      </ul>
    </details>

    <!-- The rail's containing block traps position: fixed. -->
    <Teleport to="body">
      <div
        v-if="stage !== 'closed'"
        ref="editSheet"
        class="nb-edit-sheet"
        :class="{ 'is-split': wide && previewOpen }"
        role="dialog"
        aria-modal="true"
        aria-label="编辑页面"
        @scroll.passive="updateToolbarStuck(); syncFromSource()"
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
            这一页照录自“{{ transcribed }}”。原文的笔误是有意留着的，改动请只用来修正转写本身的错误。
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
              <div class="nb-edit-toolbar" :class="{ 'is-previewing': !showingSource }" role="toolbar" aria-label="编辑工具">
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
                    <span>{{ moved ? '已恢复上次的草稿，这一页之后被别人改过。' : '已恢复上次的草稿。' }}</span>
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
                  <button
                    type="button"
                    class="nb-edit-action"
                    :class="{ 'is-on': outlineOpen }"
                    :aria-pressed="outlineOpen"
                    aria-controls="nb-edit-outline"
                    @click="toggleOutline"
                  >
                    <ListTree :size="17" :stroke-width="1.8" aria-hidden="true" />
                    大纲
                  </button>
                  <button
                    v-if="wide"
                    type="button"
                    class="nb-edit-action"
                    :class="{ 'is-on': previewOpen }"
                    :aria-pressed="previewOpen"
                    @click="togglePreview"
                  >
                    <Columns2 :size="17" :stroke-width="1.8" aria-hidden="true" />
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
                    :disabled="!(canOpenSave || canFixAndSave || canDraftFromToolbar) || stage === 'submitting'"
                    :title="saveHint"
                    aria-describedby="nb-save-hint"
                    @click="save"
                  >
                    {{ canFixAndSave ? '修复并' : '' }}{{ localMode ? '保存' : '提交' }}
                  </button>
                </span>
              </div>
              <div v-if="!wide" class="nb-edit-tabs" role="tablist" aria-label="编辑或预览">
                <button
                  type="button"
                  role="tab"
                  :aria-selected="tab === 'source'"
                  :class="{ 'is-on': tab === 'source' }"
                  @click="switchTab('source')"
                >
                  编辑
                </button>
                <button
                  type="button"
                  role="tab"
                  :aria-selected="tab === 'preview'"
                  :class="{ 'is-on': tab === 'preview' }"
                  @click="switchTab('preview')"
                >
                  预览
                  <span v-if="markdownIssues.length" class="nb-edit-tab-count">{{ markdownIssues.length }}</span>
                </button>
              </div>
            </div>

            <p v-if="offered" class="nb-edit-why is-note" role="status">
              <span>你在 GitHub 上有这一页的草稿 <a :href="offered.url" target="_blank" rel="noreferrer">#{{ offered.number }}</a>，可能是在另一台设备上写的。</span>
              <button type="button" class="nb-edit-check-action" @click="continueDraft">
                接着写
              </button>
            </p>
            <p v-if="pasteNotice" class="nb-edit-why is-note" role="status">
              <span>刚粘贴了一大段文字。如果它来自通知、网页或聊天记录，请写明出处，或者用自己的话概括，见<a href="/tutorial/manual/writing-documents#引用别人的文字" target="_blank" rel="noreferrer">引用别人的文字</a>。</span>
              <button type="button" class="nb-edit-check-action" @click="pasteNotice = false">
                知道了
              </button>
            </p>
            <p v-if="problem" class="nb-edit-why is-bad">
              {{ problem }}
            </p>
            <p v-else-if="contentBlocker && (changed || destination)" id="nb-save-hint" class="nb-edit-why">
              {{ contentBlocker }}
            </p>
            <div class="nb-edit-panes" :class="{ 'has-outline': outlineOpen, 'is-wide': wide }">
              <nav v-if="outlineOpen" id="nb-edit-outline" class="nb-edit-outline" aria-label="页面大纲">
                <p v-if="!headings.length" class="nb-edit-outline-empty">
                  还没有标题。用 ## 开头的一行开始一节。
                </p>
                <ol v-else>
                  <li v-for="item in headings" :key="item.line" :style="{ '--depth': item.level - 1 }">
                    <button
                      type="button"
                      :class="{ 'is-current': item.line === currentHeading }"
                      :aria-current="item.line === currentHeading ? 'location' : undefined"
                      @click="goToHeading(item.line)"
                    >
                      {{ item.text || '（空标题）' }}
                    </button>
                  </li>
                </ol>
              </nav>
              <div v-show="showingSource" class="nb-edit-source">
                <div v-if="changed && stage !== 'submitting'" class="nb-edit-check" aria-live="polite">
                  <p v-if="checkingMarkdown" class="nb-edit-check-note">
                    正在检查 Markdown 格式……
                  </p>
                  <div v-else-if="checkProblem" class="nb-edit-check-problem">
                    <CircleAlert :size="17" :stroke-width="1.8" aria-hidden="true" />
                    <span>Markdown 检查暂时不可用，仍可预览和保存。</span>
                    <small>{{ checkProblem }}</small>
                  </div>
                  <template v-else-if="markdownIssues.length">
                    <p class="nb-edit-check-head">
                      <CircleAlert :size="17" :stroke-width="1.8" aria-hidden="true" />
                      修正下面 {{ markdownIssues.length }} 处问题后才能提交
                      <button v-if="fixableIssues.length" type="button" class="nb-edit-check-action" @click="autoFix(fixableIssues)">
                        自动修复其中 {{ fixableIssues.length }} 处
                      </button>
                    </p>
                    <p v-if="markdownIssues.length > 3 && issueGroups.length < markdownIssues.length" class="nb-edit-check-note">
                      其中{{ issueGroups.map(group => `${group.message} ${group.count} 处`).join('，') }}。
                    </p>
                    <ol class="nb-edit-check-list">
                      <li v-for="issue in markdownIssues" :key="`${issue.line}:${issue.column}:${issue.rule}`">
                        <button type="button" :title="issue.detail || issue.message" @click="jumpToIssue(issue)">
                          <span class="nb-edit-check-place">第 {{ issue.line }} 行</span>
                          <span class="nb-edit-check-rule">{{ issue.rule }}</span>
                          <span class="nb-edit-check-message">
                            <span>{{ issue.message }}</span>
                            <span v-if="issue.fix" class="nb-edit-check-fix">
                              <template v-for="(part, index) in codeParts(issue.fix)" :key="index">
                                <code v-if="part.code">{{ part.text }}</code><template v-else>{{ part.text }}</template>
                              </template>
                            </span>
                            <small v-if="issue.detail && issue.detail !== issue.message">{{ issue.detail }}</small>
                          </span>
                        </button>
                        <span v-if="issue.fixInfo || issue.information" class="nb-edit-check-tools">
                          <button v-if="issue.fixInfo" type="button" class="nb-edit-check-action" @click="autoFix([issue])">
                            自动修复
                          </button>
                          <a v-if="issue.information" :href="issue.information" target="_blank" rel="noreferrer">规则说明</a>
                        </span>
                      </li>
                    </ol>
                  </template>
                  <p v-else-if="checkedMarkdown" class="nb-edit-check-pass">
                    <CircleCheck :size="17" :stroke-width="1.8" aria-hidden="true" />
                    Markdown 检查通过
                  </p>
                  <p v-if="checkedMarkdown && hints.length" class="nb-edit-check-hint">
                    另有 {{ hints.length }} 处排版建议，用虚线标在正文里，不影响提交。
                    <button type="button" class="nb-edit-check-action" @click="tidyTypography">
                      全部整理
                    </button>
                  </p>
                </div>
                <div ref="host" class="nb-edit-area" :class="{ 'is-busy': stage === 'submitting' }" />
              </div>
              <div
                v-if="showingPreview"
                ref="previewHost"
                class="vp-doc nb-edit-preview"
                aria-label="预览"
                @scroll.passive="syncFromPreview"
                @click="onPreviewClick"
                @dblclick="jumpToPreviewLine"
              />
            </div>
            <p v-if="mod" id="nb-edit-keys" class="nb-edit-keys">
              在行首输入 / 可以插入标题、列表、代码块、表格或图片。在表格里按 Tab 换到下一格，按 Enter 加一行。{{ mod }}F 查找，F8 跳到下一个问题，在 ]( 后面输入会列出站内页面，按住 {{ mod.replace('+', '') }} 单击链接可以打开它。按 Esc 再按 Tab 可以离开编辑区。
            </p>
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
        <form class="nb-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="nb-save-title" @submit.prevent="canSubmit && submit(false)">
          <div>
            <h2 id="nb-save-title" class="nb-edit-dialog-title">
              {{ localMode
                ? (destination ? '保存新页面' : '保存修改')
                : (destination ? '提交新页面' : '提交修改') }}
            </h2>
            <p v-if="!localMode" class="nb-edit-dialog-note">
              维护者会先审阅；通过后才会更新线上页面。
            </p>
            <p v-if="onto" class="nb-edit-dialog-note">
              这次会接着写进你的草稿 <a :href="onto.url" target="_blank" rel="noreferrer">#{{ onto.number }}</a>，不会另开一个 Pull Request。
            </p>
            <p v-if="moved" class="nb-edit-dialog-note is-warn" role="alert">
              你开始编辑之后，别人也改过这一页。提交后维护者会帮你合并两边的修改；想先看看改了什么，可以打开<a :href="historyUrl(page.filePath)" target="_blank" rel="noreferrer">这一页的修改记录</a>。
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
            <button
              v-if="!localMode"
              type="button"
              class="nb-edit-ghost"
              :disabled="!canSaveDraft || stage === 'submitting'"
              title="存到 GitHub，换一台电脑也能接着写；维护者暂时不会审阅"
              @click="submit(true)"
            >
              存为草稿
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

.nb-edit-pulls {
  flex-basis: 100%;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.nb-edit-pulls summary {
  cursor: pointer;
}

.nb-edit-pulls ul {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
}

.nb-edit-pulls li {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding: 3px 0;
}

.nb-edit-pulls a {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--vp-c-text-2);
}

.nb-edit-pull-state {
  flex: none;
}

.nb-edit-pull-state.is-merged {
  color: var(--vp-c-success-1);
}

.nb-edit-pull-state.is-open {
  color: var(--vp-c-brand-1);
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

.nb-edit-panes {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.nb-edit-area {
  flex: none;
  min-height: calc(100vh - 10rem);
}

.nb-edit-preview {
  min-width: 0;
  padding: 34px 21px 40vh;
}

/* The sheet scrolls the source; the preview scrolls on its own so the two can
   be kept level with each other. */
.nb-edit-sheet.is-split .nb-edit-inner {
  max-width: none;
}

.nb-edit-sheet.is-split .nb-edit-panes {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
}

/* Wide screens: a narrow column on the left, sticking below the toolbar. */
.nb-edit-panes.is-wide.has-outline {
  grid-template-columns: 13rem minmax(0, 1fr);
}

.nb-edit-sheet.is-split .nb-edit-panes.is-wide.has-outline {
  grid-template-columns: 13rem minmax(0, 1fr) minmax(0, 1fr);
}

.nb-edit-panes.is-wide .nb-edit-outline {
  position: sticky;
  top: var(--nb-toolbar-height, 56px);
  max-height: calc(100vh - var(--nb-toolbar-height, 56px));
  padding: 34px 8px 34px 0;
  overflow-y: auto;
  border-right: 1px solid var(--vp-c-divider);
}

.nb-edit-sheet.is-split .nb-edit-source {
  min-width: 0;
  border-right: 1px solid var(--vp-c-divider);
}

.nb-edit-sheet.is-split .nb-edit-preview {
  position: sticky;
  top: var(--nb-toolbar-height, 56px);
  height: calc(100vh - var(--nb-toolbar-height, 56px));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-inline: 34px;
}

.nb-edit-outline {
  font-size: 13px;
  line-height: 1.5;
}

.nb-edit-outline ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.nb-edit-outline button {
  display: block;
  width: 100%;
  padding: 4px 8px 4px calc(8px + var(--depth) * 12px);
  border-left: 2px solid transparent;
  text-align: left;
  color: var(--vp-c-text-2);
  overflow-wrap: anywhere;
}

.nb-edit-outline button:hover {
  color: var(--vp-c-text-1);
}

.nb-edit-outline button.is-current {
  border-left-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.nb-edit-outline-empty {
  margin: 0;
  padding: 8px;
  color: var(--vp-c-text-3);
}

/* Narrow screens: the outline drops down under the toolbar and covers the
   text until a heading is picked, like a table-of-contents menu. */
.nb-edit-panes.has-outline {
  position: relative;
}

.nb-edit-panes:not(.is-wide) .nb-edit-outline {
  position: sticky;
  z-index: 3;
  top: var(--nb-toolbar-height, 0px);
  max-height: 60vh;
  margin: 0 8px;
  padding: 6px 0;
  overflow-y: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  box-shadow: var(--vp-shadow-3);
}

.nb-edit-tabs {
  display: flex;
  gap: 4px;
  padding: 0 8px 6px;
}

.nb-edit-tabs button {
  flex: 1;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border-radius: 4px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.nb-edit-tabs button.is-on {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.nb-edit-tab-count {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
  font-size: 11px;
  line-height: 18px;
}

/* Formatting buttons act on the source, which a phone cannot see while it
   shows the preview. */
.nb-edit-toolbar.is-previewing .nb-edit-tools {
  display: none;
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

.nb-edit-dialog-note.is-warn {
  padding: 8px 10px;
  border-radius: 4px;
  background: var(--vp-c-warning-soft);
  color: var(--vp-c-text-2);
}

.nb-edit-dialog-status {
  margin: -8px 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.nb-edit-dialog-status.is-bad {
  color: var(--vp-c-danger-1);
}

/* Read out with the editor's label; the same hints sit in button tooltips. */
.nb-edit-keys {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
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

.nb-edit-check {
  width: 100%;
  max-width: var(--nb-measure);
  margin: 0 auto;
  padding: 0 21px 4px;
  font-size: 13px;
}

.nb-edit-check-hint {
  display: flex;
  gap: 7px;
  align-items: baseline;
  margin-top: 4px;
  color: var(--vp-c-text-3);
}

.nb-edit-check-hint .nb-edit-check-action {
  flex: none;
  margin-left: auto;
}

.nb-edit-check-note {
  color: var(--vp-c-text-3);
}

.nb-edit-check-head,
.nb-edit-check-pass,
.nb-edit-check-problem {
  display: flex;
  gap: 7px;
  align-items: center;
  color: var(--vp-c-danger-1);
}

.nb-edit-check-pass {
  color: var(--vp-c-success-1);
}

.nb-edit-check-problem {
  flex-wrap: wrap;
  color: var(--vp-c-warning-1);
}

.nb-edit-check-problem small {
  flex: 1 0 100%;
  padding-left: 24px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.nb-edit-check-list {
  max-height: 14rem;
  margin: 7px 0 4px;
  padding: 0;
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}

.nb-edit-check-list li + li {
  border-top: 1px solid var(--vp-c-divider);
}

.nb-edit-check-list li > button {
  display: flex;
  flex: 1;
  min-width: 0;
  gap: 7px;
  align-items: baseline;
  width: 100%;
  padding: 7px 10px;
  text-align: left;
  color: var(--vp-c-text-2);
}

.nb-edit-check-list li > button:hover {
  background: var(--vp-c-bg-soft);
}

.nb-edit-check-message {
  min-width: 0;
  overflow-wrap: anywhere;
}

.nb-edit-check-list li {
  display: flex;
  align-items: baseline;
}

.nb-edit-check-tools {
  display: flex;
  flex: none;
  gap: 10px;
  align-items: baseline;
  padding: 7px 10px 7px 0;
  font-size: 12px;
}

.nb-edit-check-tools a {
  color: var(--vp-c-text-3);
}

.nb-edit-check-action {
  font-size: 12px;
  color: var(--vp-c-brand-1);
}

.nb-edit-check-head .nb-edit-check-action {
  margin-left: auto;
}

.nb-edit-check-action:hover,
.nb-edit-check-tools a:hover {
  text-decoration: underline;
}

.nb-edit-check-fix {
  display: block;
  color: var(--vp-c-text-1);
}

.nb-edit-check-fix code {
  font-family: var(--nb-mono);
  font-size: 0.92em;
}

.nb-edit-check-message small {
  display: block;
  white-space: pre-wrap;
  color: var(--vp-c-text-3);
}

.nb-edit-check-place,
.nb-edit-check-rule {
  flex: none;
  font-family: var(--nb-mono);
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.nb-edit-check-rule {
  color: var(--vp-c-danger-1);
}

.nb-edit-why {
  width: 100%;
  max-width: var(--nb-measure);
  margin: 0 auto;
  padding: 0 21px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

/* A note answers something just done, often far down a long page; it stays
   under the toolbar so the writer sees it without scrolling back up. */
.nb-edit-why.is-note {
  position: sticky;
  z-index: 2;
  top: calc(var(--nb-toolbar-height, 0px) + 6px);
  box-shadow: var(--vp-shadow-2);
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding-block: 8px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.nb-edit-why.is-note button {
  flex: none;
  margin-left: auto;
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

  .nb-edit-check-list li {
    flex-direction: column;
    align-items: stretch;
  }

  .nb-edit-check-list li > button {
    flex-wrap: wrap;
    row-gap: 2px;
  }

  .nb-edit-check-message {
    flex-basis: 100%;
  }

  .nb-edit-check-tools {
    gap: 4px;
    padding: 0 4px 4px;
  }

  .nb-edit-check-tools > * {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 6px;
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
