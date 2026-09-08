<script setup lang="ts">
import type { Me, PendingImage } from './editor/backend'
import type { Destination } from './editor/destinations'
import { useData } from 'vitepress'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { extractH1, splitFrontmatter } from '../../utils/markdown'
import { isSignedIn, signIn, signOut } from './editor/auth'
import { load, localMode, submit as send, taken, me as whoami } from './editor/backend'
import {
  checklistFor,
  DESTINATIONS,
  draftSlug,
  frontmatterFor,
  pathFor,
  placeholderFor,
  routeFor,
} from './editor/destinations'

type Stage = 'closed' | 'choosing' | 'loading' | 'editing' | 'previewing' | 'submitting' | 'failed'

const { page } = useData()

const stage = ref<Stage>('closed')
const signedIn = ref(false)
const member = ref<Me>()
const progress = ref('')
const armed = ref(false)
const draft = ref('')
const original = ref('')
const blobSha = ref('')
const summary = ref('')
const head = ref('')
const problem = ref('')
const result = ref<{ label: string, url?: string } | undefined>()
const host = ref<HTMLElement>()
let editor: { destroy: () => void } | undefined
let preview: { update: (md: string) => void, close: () => void } | undefined
let insertAt: ((snippet: string, caret?: number) => void) | undefined
let showDiff: ((original: string | undefined) => void) | undefined

const diffing = ref(false)

const images = ref<PendingImage[]>([])
const pendingUrls = new Map<string, string>()
const picker = ref<HTMLInputElement>()
const pending = ref<{ file: File, alt: string, caption: string } | undefined>()
const busy = ref(false)

const destination = ref<Destination>()
const slug = ref('')
const slugTaken = ref('')

const target = computed(() => destination.value
  ? { path: pathFor(destination.value, slug.value), route: routeFor(destination.value, slug.value) }
  : { path: page.value.filePath, route: '' })

const titled = computed(() => Boolean(extractH1(draft.value)?.trim()))
const slugOk = computed(() => /^[a-z0-9][a-z0-9-]*$/.test(slug.value))

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
  if (!slugOk.value)
    return '只能用小写字母、数字和连字符'
  return ''
})

const blocker = computed(() => {
  if (!changed.value)
    return '还没有改动'
  if (destination.value && !titled.value)
    return '正文第一行写 # 标题，它同时是页面标题和边栏上的名字'
  if (!summary.value.trim())
    return destination.value ? '写一句话说明这一页讲什么' : '写一句话说明这次改了什么'
  return ''
})

const canSubmit = computed(() => !blocker.value && !slugIssue.value)

const armedLead = computed(() => {
  const verb = localMode ? '保存' : '提交'
  if (blocker.value)
    return `有未保存的改动。${blocker.value}，才能${verb}。`
  if (slugIssue.value)
    return `有未保存的改动。上面的网址名改好才能${verb}。`
  return '有未保存的改动。'
})

watch([draft, slug, summary], () => {
  problem.value = ''
  armed.value = false
})

watch(slug, () => (slugTaken.value = ''))

// The archive transcribes originals; "correcting" one falsifies the record.
const editable = computed(() => !page.value.filePath.startsWith('archived/'))

watch([() => stage.value, host], async ([current, element]) => {
  if (current !== 'editing' || !element || editor)
    return
  await nextTick()
  const { mountEditor } = await import('./editor/codemirror')
  const view = mountEditor(element, draft.value, value => (draft.value = value), () => {
    if (canSubmit.value)
      submit()
  }, destination.value && placeholderFor(destination.value))
  view.focus()
  const { setDiff } = await import('./editor/codemirror')
  showDiff = original => setDiff(view, original)
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

function pickImage() {
  picker.value?.click()
}

function onPicked(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file)
    pending.value = { file, alt: '', caption: '' }
  ;(event.target as HTMLInputElement).value = ''
}

async function insertImage() {
  const choice = pending.value
  if (!choice || !choice.alt.trim())
    return

  busy.value = true
  try {
    const { toWebp } = await import('./editor/image')
    const image = await toWebp(choice.file)
    const dir = `${page.value.filePath.split('/')[0]}/assets`
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
  if (stage.value === 'previewing')
    backToEditing()
  else if (armed.value)
    armed.value = false
  // Escaping out of unsaved work would throw the draft away without asking.
  else if (stage.value !== 'closed' && !changed.value)
    close()
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
const saveKey = ref('')
onMounted(() => {
  saveKey.value = /mac|iphone|ipad/i.test(navigator.userAgent) ? '⌘S' : 'Ctrl+S'
})

function reset() {
  problem.value = ''
  result.value = undefined
  summary.value = ''
  destination.value = undefined
  head.value = ''
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
  slug.value = draftSlug()
  chooseAgain()
}

function chose(choice: Destination) {
  destination.value = choice
  head.value = frontmatterFor(member.value?.name ?? '')
  original.value = ''
  draft.value = ''
  blobSha.value = ''
  stage.value = 'editing'
}

async function open() {
  if (!signedIn.value) {
    await signIn(location.pathname)
    return
  }

  reset()
  stage.value = 'loading'
  try {
    const file = await load(page.value.filePath)
    const parts = splitFrontmatter(file.content)
    head.value = parts.head
    original.value = parts.body
    draft.value = parts.body
    blobSha.value = file.sha
    stage.value = 'editing'
  }
  catch (error) {
    problem.value = (error as Error).message
    stage.value = 'failed'
  }
}

async function submit() {
  armed.value = false
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

    result.value = await send(target.value.path, {
      content: head.value + draft.value,
      summary: summary.value.trim(),
      author: member.value?.name ?? '',
      images: images.value,
      checklist: at ? checklistFor(at, slug.value) : undefined,
    }, step => (progress.value = step))
    for (const url of pendingUrls.values())
      URL.revokeObjectURL(url)
    pendingUrls.clear()
    images.value = []
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

function close() {
  if (changed.value && !armed.value) {
    armed.value = true
    return
  }
  discard()
}

function discard() {
  teardown()
  armed.value = false
  progress.value = ''
  stage.value = 'closed'
  result.value = undefined
}

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
    <button v-if="editable" type="button" class="nb-edit-open" @click="open">
      {{ signedIn ? '在本页编辑' : '登录后在本页编辑' }}
    </button>
    <button type="button" class="nb-edit-open is-secondary" @click="startNew">
      {{ signedIn ? '新建一页' : '登录后新建一页' }}
    </button>

    <!-- The rail's containing block traps position: fixed. -->
    <Teleport to="body">
      <div
        v-if="stage !== 'closed'"
        class="nb-edit-sheet"
        :class="{ 'is-away': stage === 'previewing' }"
        role="dialog"
        aria-modal="true"
        aria-label="编辑页面"
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
              <button v-if="!localMode && member?.name" type="button" class="nb-edit-signout" @click="signOut">
                退出
              </button>
              <button type="button" class="nb-edit-close" :aria-label="armed ? '再点一次放弃改动并关闭' : '关闭'" @click="close">
                ✕
              </button>
            </div>
          </header>

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
            <span class="nb-new-route" :class="{ 'is-bad': !slugOk }">{{ target.route }}</span>
            <span v-if="slugIssue" class="nb-new-issue">{{ slugIssue }}</span>
          </div>

          <p v-if="stage === 'loading'" class="nb-edit-note">
            正在读取原文……
          </p>

          <template v-if="stage !== 'choosing' && stage !== 'loading' && stage !== 'failed'">
            <div ref="host" class="nb-edit-area" :class="{ 'is-busy': stage === 'submitting' }" />

            <div v-if="pending" class="nb-image-form">
              <p class="nb-image-file">
                {{ pending.file.name }} — 会转成 WebP，随这次修改一起提交
              </p>
              <input v-model="pending.alt" class="nb-edit-summary" placeholder="图里是什么？看不见图的人靠它">
              <input v-model="pending.caption" class="nb-edit-summary" placeholder="图注（可选）">
              <div class="nb-image-actions">
                <span class="nb-edit-why">{{ pending.alt.trim() ? '' : '先写一句图里是什么' }}</span>
                <button type="button" class="nb-edit-ghost" @click="pending = undefined">
                  取消
                </button>
                <button type="button" class="nb-edit-submit" :disabled="!pending.alt.trim() || busy" @click="insertImage">
                  {{ busy ? '转换中……' : '插入' }}
                </button>
              </div>
            </div>

            <p v-if="!pending && !draft && destination?.outline" class="nb-edit-syntax">
              <span>不知道从哪开始？</span>
              <button type="button" class="nb-edit-outline" @click="insertOutline">
                搭一个结构
              </button>
            </p>

            <p v-else-if="!pending" class="nb-edit-syntax">
              <span><code># 标题</code></span>
              <span><code>## 小标题</code></span>
              <span><code>- 列表</code></span>
              <span><code>**加粗**</code></span>
              <span><code>[文字](/repair/)</code> 站内链接</span>
              <span v-if="saveKey" class="nb-edit-key"><code>{{ saveKey }}</code> 提交</span>
            </p>

            <div class="nb-edit-foot">
              <input
                v-model="summary"
                class="nb-edit-summary"
                :placeholder="destination ? '这一页讲什么？一句话' : '这次改了什么？一句话'"
                :disabled="stage === 'submitting'"
              >
              <template v-if="armed">
                <button type="button" class="nb-edit-ghost is-danger" @click="discard">
                  丢弃改动
                </button>
                <button type="button" class="nb-edit-ghost" @click="armed = false">
                  继续编辑
                </button>
                <button type="button" class="nb-edit-submit" :disabled="!canSubmit" @click="submit">
                  {{ localMode ? '先保存' : '先提交' }}
                </button>
              </template>

              <template v-else>
                <button type="button" class="nb-edit-ghost" :disabled="stage === 'submitting'" @click="pickImage">
                  插图
                </button>
                <button
                  v-if="!destination"
                  type="button"
                  class="nb-edit-ghost"
                  :class="{ 'is-on': diffing }"
                  :disabled="!changed"
                  @click="toggleDiff"
                >
                  改动
                </button>
                <button type="button" class="nb-edit-ghost" :disabled="stage === 'submitting'" @click="showPreview">
                  预览
                </button>
                <button
                  type="button"
                  class="nb-edit-submit"
                  :disabled="!canSubmit || stage === 'submitting'"
                  @click="submit"
                >
                  {{ stage === 'submitting'
                    ? '提交中……'
                    : localMode ? '保存到本地' : (destination ? '提交新页面' : '提交修改') }}
                </button>
              </template>
            </div>

            <p class="nb-edit-why" :class="{ 'is-bad': problem || armed }">
              {{ problem
                || (armed ? armedLead : '')
                || progress
                || blocker || (localMode
                  ? '保存会直接写入这个 markdown 文件。'
                  : '提交会开一个 PR，交由维护者审阅后合并，不会直接改动线上页面。') }}
            </p>
            <input ref="picker" type="file" accept="image/*" hidden @change="onPicked">
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

      <div v-if="stage === 'previewing'" class="nb-preview-bar">
        <span class="nb-preview-tag">预览中</span>
        <span class="nb-preview-note">这就是提交后读者看到的样子</span>
        <button type="button" class="nb-edit-ghost" @click="backToEditing">
          继续编辑
        </button>
        <button type="button" class="nb-edit-submit" :disabled="!canSubmit" @click="submit">
          {{ localMode ? '保存到本地' : '提交修改' }}
        </button>
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
  padding: 21px;
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
  height: 100%;
  margin: 0 auto;
}

.nb-edit-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 21px;
  padding-bottom: 13px;
  border-bottom: 1px solid var(--vp-c-divider);
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

.nb-edit-close {
  font-size: 18px;
  color: var(--vp-c-text-3);
}

.nb-edit-area {
  overflow: hidden;
  flex: 1;
  min-height: 0;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
}

.nb-edit-area.is-busy {
  opacity: 0.5;
  pointer-events: none;
}

.nb-edit-foot {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  max-width: var(--nb-measure);
  margin: 0 auto;
  padding: 0 21px;
}

.nb-image-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: var(--nb-measure);
  margin: 0 auto;
  padding: 13px 21px;
  background: var(--vp-c-bg-soft);
}

.nb-image-file {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.nb-image-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.nb-image-actions .nb-edit-why {
  flex: 1;
  max-width: none;
  padding: 0;
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
  position: fixed;
  inset: auto 0 0;
  z-index: 60;
  display: flex;
  flex-wrap: wrap;
  gap: 13px;
  align-items: center;
  padding: 13px 21px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.nb-preview-tag {
  font-family: var(--nb-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--vp-c-brand-1);
  text-transform: uppercase;
}

.nb-preview-note {
  flex: 1;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.nb-edit-note {
  font-size: 13px;
  color: var(--vp-c-text-3);
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
  gap: 2px;
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
    padding: 13px 0;
  }

  .nb-edit-head {
    padding: 0 21px 13px;
  }

  /* A writer does not need the file path; the screen is worth more. */
  .nb-edit-path {
    display: none;
  }

  /* No keyboard to press it on. */
  .nb-edit-key {
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
}
</style>
