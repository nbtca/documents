<script setup lang="ts">
import { useData } from 'vitepress'
import { computed, onMounted, ref } from 'vue'
import { branchNameFor, canPush, getFile, openPullRequest } from '../../utils/github'
import { currentMember, editorConfigured, githubToken, isSignedIn, NotLinkedError, signIn } from './editor/auth'

type Stage = 'closed' | 'loading' | 'editing' | 'submitting' | 'done' | 'failed'

const REPO = { owner: 'nbtca', name: 'documents' }

const { page } = useData()

const stage = ref<Stage>('closed')
const signedIn = ref(false)
const memberName = ref('')
const draft = ref('')
const original = ref('')
const blobSha = ref('')
const summary = ref('')
const problem = ref('')
const pull = ref<{ number: number, url: string } | undefined>()

const changed = computed(() => draft.value !== original.value && draft.value.trim().length > 0)
const canSubmit = computed(() => changed.value && summary.value.trim().length > 0)

onMounted(async () => {
  if (!editorConfigured)
    return
  signedIn.value = await isSignedIn()
  if (signedIn.value)
    memberName.value = (await currentMember())?.name ?? ''
})

async function open() {
  if (!signedIn.value) {
    await signIn(location.pathname)
    return
  }

  stage.value = 'loading'
  problem.value = ''
  try {
    const token = await githubToken()
    if (!(await canPush(token, REPO))) {
      problem.value = '你的 GitHub 账号还没有本仓库的写入权限，请联系社长加入协作者。'
      stage.value = 'failed'
      return
    }
    const file = await getFile(token, REPO, page.value.filePath)
    original.value = file.content
    draft.value = file.content
    blobSha.value = file.sha
    summary.value = ''
    stage.value = 'editing'
  }
  catch (error) {
    problem.value = error instanceof NotLinkedError
      ? '登录时没有授权 GitHub。请退出后重新登录，并选择「Continue with GitHub」。'
      : `读取原文失败：${(error as Error).message}`
    stage.value = 'failed'
  }
}

async function submit() {
  stage.value = 'submitting'
  try {
    const token = await githubToken()
    pull.value = await openPullRequest(token, REPO, {
      path: page.value.filePath,
      content: draft.value,
      sha: blobSha.value,
      title: `docs: ${summary.value.trim()}`,
      body: `${summary.value.trim()}\n\n由 ${memberName.value} 在 docs.nbtca.space 上编辑。`,
      branch: branchNameFor(page.value.filePath),
    })
    stage.value = 'done'
  }
  catch (error) {
    problem.value = `提交失败：${(error as Error).message}`
    stage.value = 'failed'
  }
}

function close() {
  stage.value = 'closed'
  pull.value = undefined
}
</script>

<template>
  <div v-if="editorConfigured" class="nb-edit">
    <button type="button" class="nb-edit-open" @click="open">
      {{ signedIn ? '编辑这一页' : '登录后编辑' }}
    </button>

    <div v-if="stage !== 'closed'" class="nb-edit-sheet" role="dialog" aria-label="编辑页面">
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

      <template v-if="stage === 'editing' || stage === 'submitting'">
        <textarea
          v-model="draft"
          class="nb-edit-area"
          spellcheck="false"
          :disabled="stage === 'submitting'"
        />
        <div class="nb-edit-foot">
          <input
            v-model="summary"
            class="nb-edit-summary"
            placeholder="这次改了什么？一句话"
            :disabled="stage === 'submitting'"
          >
          <button
            type="button"
            class="nb-edit-submit"
            :disabled="!canSubmit || stage === 'submitting'"
            @click="submit"
          >
            {{ stage === 'submitting' ? '提交中……' : '提交修改' }}
          </button>
        </div>
        <p class="nb-edit-note">
          提交会开一个 PR，交由维护者审阅后合并。不会直接改动线上页面。
        </p>
      </template>

      <p v-if="stage === 'done' && pull" class="nb-edit-note">
        已提交 <a :href="pull.url" target="_blank" rel="noreferrer">#{{ pull.number }}</a>。
        自动检查与渲染预览的结果会显示在这个 PR 上。
      </p>

      <p v-if="stage === 'failed'" class="nb-edit-note nb-edit-problem">
        {{ problem }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.nb-edit-open {
  font-family: var(--nb-mono);
  font-size: 12px;
  color: var(--vp-c-text-2);
  border-bottom: 1px dotted var(--vp-c-divider);
  transition: color 0.2s;
}

.nb-edit-open:hover {
  color: var(--vp-c-brand-1);
}

.nb-edit-sheet {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 13px;
  padding: 21px;
  background: var(--vp-c-bg);
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
  flex: 1;
  width: 100%;
  padding: 13px;
  font-family: var(--nb-mono);
  font-size: 13px;
  line-height: 1.8;
  tab-size: 2;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  resize: none;
}

.nb-edit-area:focus {
  border-color: var(--vp-c-brand-1);
  outline: none;
}

.nb-edit-foot {
  display: flex;
  gap: 13px;
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

.nb-edit-submit:disabled {
  opacity: 0.4;
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
