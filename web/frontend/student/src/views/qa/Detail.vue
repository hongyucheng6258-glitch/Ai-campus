<template>
  <div v-if="question" class="detail">
    <el-card>
      <template #header>
        <div class="q-head">
          <span class="cat">{{ question.category }}</span>
          <b>{{ question.title }}</b>
          <span v-if="question.status === 1" class="solved">已解决</span>
          <span v-else class="pending">待答</span>
        </div>
      </template>
      <p class="q-content">{{ question.content || '（无补充描述）' }}</p>
      <div class="q-meta">
        <span>👤 {{ question.publisherNickname }}</span>
        <span>👁 {{ question.viewCount }} 浏览</span>
        <span>🕐 {{ String(question.createTime).slice(0, 16) }}</span>
      </div>
    </el-card>

    <el-card style="margin-top: 14px">
      <template #header><h3>🤖 AI 参考回答</h3></template>
      <p class="tip">等不及同学回答？先让 AI 给个参考（仅供参考，重要问题请向老师确认）</p>
      <el-button type="primary" plain :loading="aiLoading" @click="askAi">让 AI 参考回答</el-button>
      <div v-if="aiText" class="ai-box">{{ aiText }}</div>
    </el-card>

    <el-card style="margin-top: 14px">
      <template #header><h3>💬 回答（{{ answers.length }}）</h3></template>
      <div v-if="!answers.length" class="tip">还没有回答，来抢沙发！</div>
      <div v-for="a in answers" :key="a.id" class="answer" :class="{ accepted: a.isAccepted === 1 }">
        <div class="answer__head">
          <span class="who">👤 {{ a.answererNickname }}</span>
          <span v-if="a.isAccepted === 1" class="accept-tag">✅ 已采纳</span>
          <span class="time">{{ String(a.createTime).slice(0, 16) }}</span>
        </div>
        <p class="answer__content">{{ a.content }}</p>
        <div v-if="question.isOwner && question.status === 0 && a.isAccepted !== 1" class="answer__ops">
          <el-button size="small" type="success" plain @click="accept(a.id)">采纳为最佳回答</el-button>
        </div>
      </div>
      <el-divider v-if="!question.isOwner || question.status === 0" />
      <div v-if="!question.isOwner" class="answer-form">
        <el-input v-model="answerText" type="textarea" :rows="3" placeholder="写下你的回答，帮同学解决问题…" />
        <el-button type="primary" style="margin-top: 8px" :loading="answering" @click="submitAnswer">提交回答</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { questionDetail, answerQuestion, acceptAnswer, aiAnswer } from '../../api/qa'
import { isLoggedIn } from '../../utils/auth'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)
const question = ref(null)
const answers = ref([])
const answerText = ref('')
const answering = ref(false)
const aiLoading = ref(false)
const aiText = ref('')

onMounted(async () => {
  try {
    const d = await questionDetail(id)
    question.value = d.question
    answers.value = d.answers || []
  } catch (e) {
    ElMessage.error('加载问题失败')
    router.back()
  }
})

async function askAi() {
  if (!isLoggedIn()) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  aiLoading.value = true
  try {
    aiText.value = await aiAnswer(id)
  } catch (e) {
    ElMessage.error(e.message || 'AI 回答失败')
  } finally {
    aiLoading.value = false
  }
}

async function submitAnswer() {
  if (!answerText.value.trim()) {
    ElMessage.warning('回答内容不能为空')
    return
  }
  if (!isLoggedIn()) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  answering.value = true
  try {
    await answerQuestion(id, { content: answerText.value.trim() })
    ElMessage.success('回答成功')
    answerText.value = ''
    const d = await questionDetail(id)
    question.value = d.question
    answers.value = d.answers || []
  } catch (e) {
    ElMessage.error(e.message || '回答失败')
  } finally {
    answering.value = false
  }
}

async function accept(answerId) {
  try {
    await acceptAnswer(answerId)
    ElMessage.success('已采纳该回答，问题标记为已解决')
    const d = await questionDetail(id)
    question.value = d.question
    answers.value = d.answers || []
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  }
}
</script>

<style scoped>
.detail { max-width: 820px; margin: 0 auto; }
.q-head { display: flex; align-items: center; gap: 10px; }
.q-head b { font-size: 16px; flex: 1; }
.cat { padding: 2px 10px; border-radius: var(--r-pill); background: var(--brand-soft); color: var(--brand-strong); font-size: var(--fs-cap); font-weight: 600; flex-shrink: 0; }
.solved { padding: 2px 10px; border-radius: var(--r-pill); background: var(--success-soft, #f0faf5); color: var(--success-strong, #008a5c); font-size: var(--fs-cap); font-weight: 600; }
.pending { padding: 2px 10px; border-radius: var(--r-pill); background: var(--warning-soft, #fff7e6); color: var(--gold-strong, #a06a00); font-size: var(--fs-cap); font-weight: 600; }
.q-content { margin: 4px 0 10px; white-space: pre-wrap; line-height: 1.7; }
.q-meta { display: flex; gap: 14px; font-size: var(--fs-cap); color: var(--ink-3); }
.tip { color: var(--ink-3); font-size: var(--fs-cap); margin: 0 0 10px; }
.ai-box {
  margin-top: 12px; padding: 14px 16px; border-radius: var(--r-md);
  background: var(--brand-soft); border: 1px solid var(--brand-line);
  white-space: pre-wrap; line-height: 1.7; font-size: var(--fs-cap);
}
.answer {
  padding: 12px 14px; border: 1px solid var(--line); border-radius: var(--r-md); margin-bottom: 10px;
}
.answer.accepted { border-color: var(--success-line, #b3e6d0); background: var(--success-soft, #f0faf5); }
.answer__head { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; font-size: var(--fs-cap); }
.who { font-weight: 600; color: var(--brand-strong); }
.accept-tag { color: var(--success-strong, #008a5c); font-weight: 600; }
.time { color: var(--ink-3); }
.answer__content { margin: 0; white-space: pre-wrap; line-height: 1.7; }
.answer__ops { margin-top: 8px; }
</style>
