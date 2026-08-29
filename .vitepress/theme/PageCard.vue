<script setup lang="ts">
import { useData, useRoute } from 'vitepress'
import { computed, defineAsyncComponent, nextTick, onMounted, ref, watch } from 'vue'
import { editorAvailable } from './editor/backend'

interface Maintainer {
  user: string
  since?: string
}

interface Commit {
  sha: string
  date: string
  login?: string
  name: string
  subject: string
}

interface Archive {
  date?: string
  source?: string
  author?: string
  format?: string
  redacted?: string
  note?: string
  transcriber?: string
  transcribed?: string
}

const REPO = 'nbtca/documents'

const route = useRoute()
const { frontmatter, page } = useData()

const EditPage = defineAsyncComponent(() => import('./EditPage.vue'))

const isDocument = computed(() => frontmatter.value.layout !== 'home')

const maintainers = computed<Maintainer[]>(() => {
  const raw = frontmatter.value.maintainers
  return Array.isArray(raw) ? raw.filter(m => m && typeof m.user === 'string') : []
})

const commits = computed<Commit[]>(() => frontmatter.value.commits ?? [])
const lastCommit = computed<Commit | undefined>(() => commits.value[0])
const historyUrl = computed(() => `https://github.com/${REPO}/commits/main/${page.value.filePath}`)

const archive = computed<Archive | null>(() => {
  if (!route.path.startsWith('/archived/'))
    return null
  const record = frontmatter.value.archive as Archive | undefined
  if (!record || (!record.date && !record.source))
    return null
  return record
})

const archiveRows = computed(() => {
  const record = archive.value
  if (!record)
    return []
  const rows: Array<{ label: string, value: string }> = []
  rows.push({ label: '原件撰写', value: record.author || '原件未署名' })
  if (record.source)
    rows.push({ label: '出处', value: record.source })
  if (record.format)
    rows.push({ label: '原件格式', value: record.format })
  if (record.redacted)
    rows.push({ label: '已略去', value: record.redacted })
  if (record.note)
    rows.push({ label: '处理', value: record.note })
  return rows
})

const transcriber = computed(() => {
  const login = archive.value?.transcriber
  return login ? { login, date: archive.value?.transcribed } : null
})

const hasContent = computed(() =>
  isDocument.value && (maintainers.value.length > 0 || Boolean(lastCommit.value) || Boolean(archive.value)),
)

const hasOutboundLink = ref(false)

function detectOutboundLink() {
  if (typeof document === 'undefined' || !archive.value)
    return
  hasOutboundLink.value = !!document.querySelector('.vp-doc a[href^="http"]:not([href*="nbtca.space"])')
}

onMounted(detectOutboundLink)
watch(() => route.path, () => nextTick(detectOutboundLink))

const open = ref(false)
const record = ref(false)

// git reports the author's offset; pin the zone or dates shift by a day.
const DAY = new Intl.DateTimeFormat('en-CA', { dateStyle: 'short', timeZone: 'Asia/Shanghai' })
const day = (iso: string) => DAY.format(new Date(iso))
</script>

<template>
  <aside v-if="hasContent" class="nb-page-card" aria-label="页面信息">
    <dl class="nb-page-card-record">
      <template v-if="maintainers.length">
        <dt>维护</dt>
        <dd>
          <span v-for="(m, i) in maintainers" :key="m.user">
            <span v-if="i">、</span>
            <a :href="`https://github.com/${m.user}`" target="_blank" rel="noreferrer">@{{ m.user }}</a>
          </span>
        </dd>
      </template>

      <template v-if="lastCommit">
        <dt>最近</dt>
        <dd>
          <button type="button" class="nb-page-card-toggle" :aria-expanded="open" @click="open = !open">
            <span>{{ lastCommit.login ? `@${lastCommit.login}` : lastCommit.name }}</span>
            <time :datetime="lastCommit.date">{{ day(lastCommit.date) }}</time>
            <span class="nb-page-card-caret" :class="{ 'is-open': open }">›</span>
          </button>
        </dd>
      </template>

      <template v-if="archive">
        <dt>档案</dt>
        <dd>
          <button type="button" class="nb-page-card-toggle" :aria-expanded="record" @click="record = !record">
            <span>{{ archive.date || '原件' }}</span>
            <span class="nb-page-card-caret" :class="{ 'is-open': record }">›</span>
          </button>
        </dd>
      </template>
    </dl>

    <ol v-if="open" class="nb-history">
      <li v-for="c in commits" :key="c.sha">
        <a class="nb-history-item" :href="`https://github.com/${REPO}/commit/${c.sha}`" target="_blank" rel="noreferrer">
          <span class="nb-history-who">{{ c.login ? `@${c.login}` : c.name }}</span>
          <time :datetime="c.date">{{ day(c.date) }}</time>
          <span class="nb-history-subject">{{ c.subject }}</span>
        </a>
      </li>
      <li class="nb-history-more">
        <a :href="historyUrl" target="_blank" rel="noreferrer">更早的修改</a>
      </li>
    </ol>

    <dl v-if="record && archive" class="nb-page-card-archive">
      <template v-for="row in archiveRows" :key="row.label">
        <dt>{{ row.label }}</dt>
        <dd>{{ row.value }}</dd>
      </template>
      <template v-if="transcriber">
        <dt>转写</dt>
        <dd>
          <a :href="`https://github.com/${transcriber.login}`" target="_blank" rel="noreferrer">@{{ transcriber.login }}</a>
          <template v-if="transcriber.date">
            · {{ transcriber.date }}
          </template>
        </dd>
      </template>
      <template v-if="hasOutboundLink">
        <dt>网址</dt>
        <dd>照原件保留，打不开是正常的</dd>
      </template>
    </dl>

    <EditPage v-if="editorAvailable" />
  </aside>
</template>
