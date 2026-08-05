<template>
  <!-- 评论列表 + 发表评论（动态广场用） -->
  <div class="comment-list">
    <div class="input-row">
      <el-input v-model="content" placeholder="友善评论，温暖校园" maxlength="500" @keyup.enter="submit">
        <template #append>
          <el-button :loading="submitting" @click="submit">发表</el-button>
        </template>
      </el-input>
    </div>
    <div v-for="c in comments" :key="c.id" class="comment-item">
      <el-avatar :size="28" :src="c.avatar">{{ c.nickname?.charAt(0) }}</el-avatar>
      <div class="c-body">
        <div class="c-head">
          <span class="c-nick">{{ c.nickname }}</span>
          <span class="c-time">{{ fromNow(c.createTime) }}</span>
        </div>
        <div class="c-content">{{ c.content }}</div>
      </div>
    </div>
    <el-empty v-if="comments.length === 0" description="暂无评论，来抢沙发" :image-size="60" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { commentPost, listComments } from '../api/post'
import { useUserStore } from '../store/user'
import { fromNow } from '../utils/date'
import { useRouter } from 'vue-router'

const props = defineProps({
  postId: { type: Number, required: true },
  comments: { type: Array, default: () => [] }
})
const emit = defineEmits(['commented'])

const userStore = useUserStore()
const router = useRouter()
const content = ref('')
const submitting = ref(false)

async function submit() {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  if (!content.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  submitting.value = true
  try {
    await commentPost(props.postId, content.value.trim())
    content.value = ''
    ElMessage.success('评论成功')
    emit('commented')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.input-row {
  margin-bottom: 16px;
}
.comment-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.c-head {
  display: flex;
  gap: 10px;
  align-items: center;
}
.c-nick {
  font-size: 13px;
  font-weight: 600;
}
.c-time {
  font-size: 12px;
  color: var(--ink-3);
}
.c-content {
  font-size: 14px;
  color: var(--ink);
  margin-top: 4px;
}
</style>
