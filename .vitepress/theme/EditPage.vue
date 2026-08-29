<script setup lang="ts">
import type { PendingImage } from './editor/backend'
import { useData } from 'vitepress'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { isSignedIn, signIn } from './editor/auth'
import { load, localMode, submit as send, whoAmI } from './editor/backend'

type Stage = 'closed' | 'loading' | 'editing' | 'previewing' | 'submitting' | 'failed'

const { page } = useData()

const stage = ref<Stage>('closed')
const signedIn = ref(false)
const memberName = ref('')
const draft = ref('')
const original = ref('')
const blobSha = ref('')
const summary = ref('')
const problem = ref('')
const result = ref<{ label: string, url?: string } | undefined>()
const host = ref<HTMLElement>()
let editor: { destroy: () => void } | undefined
let preview: { update: (md: string) => void, close: () => void } | undefined
let insertAt: ((snippet: string) => void) | undefined
let showDiff: ((original: string | undefined) => void) | undefined

const diffing = ref(false)

const images = ref<PendingImage[]>([])
const picker = ref<HTMLInputElement>()
const pending = ref<{ file: File, alt: string, caption: string } | undefined>()
const busy = ref(false)

const changed = computed(() => draft.value !== original.value && draft.value.trim().length > 0)
const canSubmit = computed(() => changed.value && summary.value.trim().length > 0)

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
    images.value.push({ path: `${dir}/${image.name}`, base64: image.base64 })
    const caption = choice.caption.trim() ? ` caption="${choice.caption.trim()}"` : ''
    insertAt?.(`\n<Figure src="/${dir}/${image.name}" alt="${choice.alt.trim()}"${caption} />\n`)
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
  preview = await openPreview(draft.value)
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

async function open() {
  if (!signedIn.value) {
    await signIn(location.pathname)
    return
  }

  stage.value = 'loading'
  problem.value = ''
  result.value = undefined
  try {
    const file = await load(page.value.filePath)
    original.value = file.content
    draft.value = file.content
    blobSha.value = file.sha
    summary.value = ''
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
    result.value = await send(page.value.filePath, {
      content: draft.value,
      summary: summary.value.trim(),
      author: memberName.value,
      images: images.value,
    })
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
    <button type="button" class="nb-edit-open" @click="open">
      {{ signedIn ? '在本页编辑' : '登录后在本页编辑' }}
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
              <span class="nb-edit-title">{{ page.title }}</span>
              <span class="nb-edit-path">{{ page.filePath }}</span>
            </div>
            <button type="button" class="nb-edit-close" aria-label="关闭" @click="close">
              ✕
            </button>
          </header>

          <p v-if="stage === 'loading'" class="nb-edit-note">
            正在读取原文……
          </p>

          <template v-if="stage !== 'loading' && stage !== 'failed'">
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
