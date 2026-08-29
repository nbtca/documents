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
  message?: string
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

const lastCommit = computed<Commit | undefined>(() => frontmatter.value.lastCommit)
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
  // Left out, the transcriber is the only name here and reads as the author.
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

// Only pages that actually carry a dead link need to say so.
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
const history = ref<Commit[]>([])
const state = ref<'idle' | 'loading' | 'ready' | 'failed'>('idle')

// git reports the author's offset, the API reports UTC; a commit made before
// 08:00 here would otherwise show two different days.
const DAY = new Intl.DateTimeFormat('en-CA', { dateStyle: 'short', timeZone: 'Asia/Shanghai' })
const day = (iso: string) => DAY.format(new Date(iso))

async function toggleHistory() {
  open.value = !open.value
  if (!open.value || state.value === 'ready' || state.value === 'loading')
    return

  state.value = 'loading'
  try {
    const url = `https://api.github.com/repos/${REPO}/commits?per_page=20&path=${encodeURIComponent(page.value.filePath)}`
    const res = await fetch(url)
    if (!res.ok)
      throw new Error(String(res.status))
    history.value = (await res.json()).map((c: any) => ({
      sha: c.sha,
      date: c.commit.author.date,
      login: c.author?.login,
      name: c.commit.author.name,
      message: c.commit.message.split('\n')[0],
    }))
    state.value = 'ready'
  }
  catch {
    state.value = 'failed'
  }
}
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
          <button type="button" class="nb-page-card-toggle" :aria-expanded="open" @click="toggleHistory">
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

    <div v-if="open" class="nb-history">
      <p v-if="state === 'loading'" class="nb-history-note">
        正在读取提交历史……
      </p>
      <p v-else-if="state === 'failed'" class="nb-history-note">
        读不到提交历史（GitHub 接口未认证时每小时限 60 次）。<a :href="historyUrl" target="_blank" rel="noreferrer">在 GitHub 上查看</a>。
      </p>
      <ol v-else-if="history.length">
        <li v-for="c in history" :key="c.sha">
          <a class="nb-history-item" :href="`https://github.com/${REPO}/commit/${c.sha}`" target="_blank" rel="noreferrer">
            <img
              v-if="c.login"
              class="nb-history-avatar"
              :src="`https://github.com/${c.login}.png?size=40`"
              :alt="`${c.login} 的头像`"
              width="18"
              height="18"
              loading="lazy"
            >
            <span class="nb-history-who">{{ c.login ? `@${c.login}` : c.name }}</span>
            <span class="nb-history-msg">{{ c.message }}</span>
            <time :datetime="c.date">{{ day(c.date) }}</time>
          </a>
        </li>
      </ol>
      <p class="nb-history-note">
        <a :href="historyUrl" target="_blank" rel="noreferrer">在 GitHub 上查看完整历史</a>
      </p>
    </div>

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
