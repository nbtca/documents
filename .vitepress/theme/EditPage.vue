<script setup lang="ts">
import type { PendingImage } from './editor/backend'
import type { Destination } from './editor/destinations'
import { useData } from 'vitepress'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { extractH1, splitFrontmatter } from '../../utils/markdown'
import { isSignedIn, signIn } from './editor/auth'
import { load, localMode, submit as send, taken, whoAmI } from './editor/backend'
import {
  checklistFor,
  DESTINATIONS,
  draftSlug,
  frontmatterFor,
  pathFor,
  routeFor,
  templateFor,
} from './editor/destinations'

type Stage = 'closed' | 'choosing' | 'loading' | 'editing' | 'previewing' | 'submitting' | 'failed'

const { page } = useData()

const stage = ref<Stage>('closed')
const signedIn = ref(false)
const memberName = ref('')
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
let insertAt: ((snippet: string) => void) | undefined
let showDiff: ((original: string | undefined) => void) | undefined

const diffing = ref(false)

const images = ref<PendingImage[]>([])
const pendingUrls = new Map<string, string>()
const picker = ref<HTMLInputElement>()
const pending = ref<{ file: File, alt: string, caption: string } | undefined>()
const busy = ref(false)

const destination = ref<Destination>()
const slug = ref('')

const target = computed(() => destination.value
  ? { path: pathFor(destination.value, slug.value), route: routeFor(destination.value, slug.value) }
  : { path: page.value.filePath, route: '' })

const titled = computed(() => Boolean(extractH1(draft.value)?.trim()))
const changed = computed(() => draft.value !== original.value && draft.value.trim().length > 0)
const canSubmit = computed(() =>
  changed.value
  && summary.value.trim().length > 0
  && (!destination.value || (titled.value && /^[a-z0-9][a-z0-9-]*$/.test(slug.value))),
)

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
  })
  const { setDiff } = await import('./editor/codemirror')
  showDiff = original => setDiff(view, original)
  insertAt = (snippet) => {
    const at = view.state.selection.main.head
    view.dispatch({ changes: { from: at, insert: snippet }, selection: { anchor: at + snippet.length } })
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
  if (event.key === 'Escape' && stage.value === 'previewing')
    backToEditing()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

onBeforeUnmount(teardown)

onMounted(async () => {
  signedIn.value = localMode || await isSignedIn()
  if (signedIn.value)
    memberName.value = await whoAmI()
})

function reset() {
  problem.value = ''
  result.value = undefined
  summary.value = ''
  destination.value = undefined
  head.value = ''
}

// The editor mounts once per open sheet, so going back to the picker has to
// tear it down or the next choice keeps the previous template.
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
  head.value = frontmatterFor(memberName.value)
  original.value = ''
  draft.value = templateFor(choice)
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
  stage.value = 'submitting'
  try {
    const at = destination.value
    if (at && await taken(target.value.path))
      throw new Error(`${target.value.route} 已经有人了，换一个网址名。`)

    result.value = await send(target.value.path, {
      content: head.value + draft.value,
      summary: summary.value.trim(),
      author: memberName.value,
      images: images.value,
      checklist: at ? checklistFor(at, slug.value) : undefined,
    })
    for (const url of pendingUrls.values())
      URL.revokeObjectURL(url)
    pendingUrls.clear()
    images.value = []
    teardown()
    stage.value = 'closed'
  }
  catch (error) {
    problem.value = `提交失败：${(error as Error).message}`
    stage.value = 'failed'
  }
}

function close() {
  teardown()
  stage.value = 'closed'
  result.value = undefined
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
    <button type="button" class="nb-edit-open" @click="startNew">
      {{ signedIn ? '新建一页' : '登录后新建一页' }}
    </button>

    <!-- The rail's containing block traps position: fixed. -->
    <Teleport to="body">
      <div
        v-if="stage !== 'closed'"
        class="nb-edit-sheet"
        :class="{ 'is-away': stage === 'previewing' }"
        role="dialog"
        aria-label="编辑页面"
      >
        <div class="nb-edit-inner">
          <header class="nb-edit-head">
            <div>
              <span class="nb-edit-title">{{ destination ? '新建文档' : page.title }}</span>
              <span class="nb-edit-path">{{ destination ? target.path : page.filePath }}</span>
            </div>
            <button type="button" class="nb-edit-close" aria-label="关闭" @click="close">
              ✕
            </button>
          </header>

          <div v-if="stage === 'choosing'" class="nb-pick">
            <p class="nb-pick-lead">
              这篇放哪里？每一栏的写法不一样，选之前先看一眼。
            </p>
            <ul class="nb-pick-list">
              <li v-for="option in DESTINATIONS" :key="option.id">
                <button type="button" class="nb-pick-option" @click="chose(option)">
                  <span class="nb-pick-label">{{ option.label }}</span>
                  <span class="nb-pick-what">{{ option.what }}</span>
                  <span class="nb-pick-how">写法：{{ option.how }}</span>
                </button>
              </li>
            </ul>
          </div>

          <div v-if="destination && stage === 'editing'" class="nb-new-bar">
            <button type="button" class="nb-edit-ghost" @click="chooseAgain">
              {{ destination.label }} ⌄
            </button>
            <label class="nb-new-slug">
              网址名
              <input v-model="slug" spellcheck="false" placeholder="edu-email">
            </label>
            <span class="nb-new-route" :class="{ 'is-bad': !/^[a-z0-9][a-z0-9-]*$/.test(slug) }">
              {{ target.route }}
            </span>
          </div>

          <p v-if="stage === 'loading'" class="nb-edit-note">
            正在读取原文……
          </p>

          <template v-if="stage !== 'choosing' && stage !== 'loading' && stage !== 'failed'">
            <div ref="host" class="nb-edit-area" :class="{ 'is-busy': stage === 'submitting' }" />
            <div class="nb-edit-foot">
              <input
                v-model="summary"
                class="nb-edit-summary"
                placeholder="这次改了什么？一句话"
                :disabled="stage === 'submitting'"
              >
              <button type="button" class="nb-edit-ghost" :disabled="stage === 'submitting'" @click="pickImage">
                插图
              </button>
              <button
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
                {{ stage === 'submitting' ? '提交中……' : (localMode ? '保存到本地' : '提交修改') }}
              </button>
            </div>
            <input ref="picker" type="file" accept="image/*" hidden @change="onPicked">

            <div v-if="pending" class="nb-image-form">
              <p class="nb-edit-note">
                {{ pending.file.name }} — 会转成 WebP 并随这次修改一起提交
              </p>
              <input v-model="pending.alt" class="nb-edit-summary" placeholder="图里是什么？看不见图的人靠它（必填）">
              <input v-model="pending.caption" class="nb-edit-summary" placeholder="图注（可选）">
              <div class="nb-edit-foot">
                <button type="button" class="nb-edit-ghost" @click="pending = undefined">
                  取消
                </button>
                <button type="button" class="nb-edit-submit" :disabled="!pending.alt.trim() || busy" @click="insertImage">
                  {{ busy ? '转换中……' : '插入' }}
                </button>
              </div>
            </div>

            <p v-if="destination && !titled" class="nb-edit-note">
              还没有标题。正文第一行写 <code># 标题</code>，它同时是页面标题和边栏上的名字。
            </p>

            <p class="nb-edit-note">
              {{ localMode
                ? '本地开发：保存会直接写入这个 markdown 文件。'
                : '提交会开一个 PR，交由维护者审阅后合并。不会直接改动线上页面。' }}
            </p>
          </template>

          <p v-if="stage === 'failed'" class="nb-edit-note nb-edit-problem">
            {{ problem }}
          </p>
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

.nb-edit-close {
  font-size: 18px;
  color: var(--vp-c-text-3);
}

.nb-edit-area {
  overflow: hidden;
  flex: 1;
  min-height: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}

.nb-edit-area.is-busy {
  opacity: 0.5;
  pointer-events: none;
}

.nb-edit-foot {
  display: flex;
  gap: 13px;
}

.nb-image-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 13px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
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
}

.nb-pick-lead {
  margin: 0 0 13px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.nb-pick-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
}

.nb-pick-option {
  display: grid;
  gap: 3px;
  width: 100%;
  padding: 13px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 200ms ease,
    background-color 200ms ease;
}

.nb-pick-option:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.nb-pick-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.nb-pick-what {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.nb-pick-how {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.nb-new-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
}

.nb-new-slug {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.nb-new-slug input {
  width: 13rem;
  padding: 5px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.nb-new-route {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.nb-new-route.is-bad {
  color: var(--vp-c-danger-1);
  text-decoration: line-through;
}

.nb-edit-problem {
  color: var(--vp-c-danger-1);
}

@media (max-width: 640px) {
  .nb-edit-sheet {
    padding: 13px;
  }

  .nb-edit-foot {
    flex-direction: column;
  }
}
</style>
