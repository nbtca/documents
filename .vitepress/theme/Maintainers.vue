<script setup lang="ts">
import { useData } from 'vitepress'
import { computed, ref } from 'vue'

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

const REPO = 'nbtca/documents'

const { frontmatter, page } = useData()

const maintainers = computed<Maintainer[]>(() => {
  const raw = frontmatter.value.maintainers
  return Array.isArray(raw) ? raw.filter(m => m && typeof m.user === 'string') : []
})

const lastCommit = computed<Commit | undefined>(() => frontmatter.value.lastCommit)
const historyUrl = computed(() => `https://github.com/${REPO}/commits/main/${page.value.filePath}`)

const open = ref(false)
const history = ref<Commit[]>([])
const state = ref<'idle' | 'loading' | 'ready' | 'failed'>('idle')

// git reports the author's offset, the API reports UTC; a commit made before
// 08:00 here would otherwise show two different days.
const DAY = new Intl.DateTimeFormat('en-CA', { dateStyle: 'short', timeZone: 'Asia/Shanghai' })
const day = (iso: string) => DAY.format(new Date(iso))

async function toggle() {
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
  <aside v-if="maintainers.length || lastCommit" class="nb-maintainers" aria-label="维护信息">
    <div v-if="maintainers.length" class="nb-maintainers-row">
      <span class="nb-maintainers-label">维护</span>
      <ul>
        <li v-for="m in maintainers" :key="m.user">
          <a :href="`https://github.com/${m.user}`" target="_blank" rel="noreferrer">@{{ m.user }}</a>
          <span v-if="m.since" class="nb-maintainers-dim">{{ m.since }} 起</span>
        </li>
      </ul>
    </div>

    <div v-if="lastCommit" class="nb-maintainers-row">
      <span class="nb-maintainers-label">最近提交</span>
      <button
        type="button"
        class="nb-history-toggle"
        :aria-expanded="open"
        @click="toggle"
      >
        <img
          v-if="lastCommit.login"
          class="nb-history-avatar"
          :src="`https://github.com/${lastCommit.login}.png?size=40`"
          :alt="`${lastCommit.login} 的头像`"
          width="20"
          height="20"
          loading="lazy"
        >
        <span>{{ lastCommit.login ? `@${lastCommit.login}` : lastCommit.name }}</span>
        <span class="nb-maintainers-dim">{{ day(lastCommit.date) }}</span>
        <span class="nb-history-caret" :class="{ 'is-open': open }">›</span>
      </button>
    </div>

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
              width="20"
              height="20"
              loading="lazy"
            >
            <span class="nb-history-who">{{ c.login ? `@${c.login}` : c.name }}</span>
            <span class="nb-history-msg">{{ c.message }}</span>
            <span class="nb-maintainers-dim">{{ day(c.date) }}</span>
          </a>
        </li>
      </ol>
      <p class="nb-history-note">
        <a :href="historyUrl" target="_blank" rel="noreferrer">在 GitHub 上查看完整历史</a>
      </p>
    </div>
  </aside>
</template>
