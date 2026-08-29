<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { completeSignIn, editorConfigured } from './editor/auth'

const state = ref<'working' | 'failed'>('working')
const detail = ref('')
const returnTo = ref('/')
const slow = ref(false)

onMounted(async () => {
  if (!editorConfigured) {
    state.value = 'failed'
    detail.value = '本站尚未配置登录。'
    return
  }

  const timer = setTimeout(() => (slow.value = true), 5000)

  try {
    returnTo.value = await completeSignIn()
    location.replace(returnTo.value)
  }
  catch (error) {
    clearTimeout(timer)
    state.value = 'failed'
    detail.value = (error as Error).message
  }
})
</script>

<template>
  <div class="nb-callback">
    <template v-if="state === 'working'">
      <p class="nb-callback-title">
        正在完成登录
      </p>
      <p v-if="slow" class="nb-callback-detail">
        比预期慢。<a href="/">回到首页</a>
      </p>
    </template>

    <template v-else>
      <p class="nb-callback-title">
        登录未完成
      </p>
      <p class="nb-callback-detail">
        {{ detail }}
      </p>
      <p class="nb-callback-detail">
        <a href="/">回到首页</a>
      </p>
    </template>
  </div>
</template>

<style scoped>
.nb-callback {
  display: flex;
  flex-direction: column;
  gap: 13px;
  max-width: 34rem;
  margin: 0 auto;
  padding: 89px 21px;
}

.nb-callback-title {
  font-size: 20px;
  font-weight: 600;
}

.nb-callback-detail {
  font-size: 14px;
  color: var(--vp-c-text-2);
}
</style>
