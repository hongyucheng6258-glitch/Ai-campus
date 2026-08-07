<template>
  <WtPageHeader title="校园动态" subtitle="同学们都在聊些什么" eyebrow="同辈圈" />

  <div class="square">
    <div class="post-search">
      <el-input v-model="keyword" placeholder="搜索校园动态…" clearable @keyup.enter="search" @clear="search">
        <template #append><el-button @click="search">搜索</el-button></template>
      </el-input>
    </div>

    <!-- 发布框 -->
    <el-card class="publish-box" v-if="userStore.isLoggedIn">
      <el-input v-model="newPost" type="textarea" :rows="3" placeholder="分享校园生活…" maxlength="2000" />
      <div class="publish-ops">
        <UploadImg v-model="newImages" :max="9" />
        <el-button type="primary" :loading="publishing" @click="publish">发布动态</el-button>
      </div>
    </el-card>

    <!-- 动态流 -->
    <div v-loading="loading">
      <el-card v-for="p in list" :key="p.id" class="post-card">
        <div class="post-head">
          <el-avatar :size="40" :src="p.avatar">{{ p.nickname?.charAt(0) }}</el-avatar>
          <div>
            <div class="nick">{{ p.nickname }}</div>
            <div class="time">{{ fromNow(p.createTime) }}</div>
          </div>
          <div class="post-head-actions">
            <el-button v-if="Number(p.userId) !== Number(userStore.userInfo?.id)" text type="primary" size="small" @click="contactAuthor(p)">私信</el-button>
            <el-button text type="warning" size="small" @click="openReport(p)">举报</el-button>
          </div>
        </div>
        <div class="post-content">{{ p.content }}</div>
        <div v-if="p.imageList?.length" class="post-images">
          <el-image v-for="img in p.imageList" :key="img" :src="img" fit="contain"
                    class="post-img" :preview-src-list="p.imageList" lazy />
        </div>
        <div class="post-ops">
          <span class="op" :class="{ liked: p.liked }" @click="toggleLike(p)">
            {{ p.liked ? '❤️' : '🤍' }} {{ p.likeCount }}
          </span>
          <span class="op" @click="toggleComments(p)">💬 {{ p.commentCount }}</span>
        </div>
        <!-- 评论区 -->
        <div v-if="expandedPostId === p.id" class="comment-area">
          <CommentList :post-id="p.id" :comments="commentMap[p.id] || []" @commented="reloadComments(p)" />
        </div>
      </el-card>
      <EmptyBox v-if="!loading && !list.length" description="还没有动态，来发第一条吧" />
    </div>
    <el-pagination v-model:current-page="pageNum" :total="total" :page-size="10"
                   layout="prev, pager, next" @current-change="load" />

    <!-- 举报弹窗 -->
    <el-dialog v-model="reportVisible" title="举报该动态" width="440px">
      <el-select v-model="reportReasonType" style="width: 100%; margin-bottom: 10px">
        <el-option label="违规内容" value="违规" />
        <el-option label="辱骂引战" value="辱骂" />
        <el-option label="广告骚扰" value="广告" />
        <el-option label="其他" value="其他" />
      </el-select>
      <el-input v-model="reportReason" type="textarea" :rows="3" maxlength="500" />
      <template #footer>
        <el-button @click="reportVisible = false">取消</el-button>
        <el-button type="primary" @click="doReport">提交举报</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import WtPageHeader from '../../components/wt/WtPageHeader.vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import UploadImg from '../../components/UploadImg.vue'
import CommentList from '../../components/CommentList.vue'
import EmptyBox from '../../components/EmptyBox.vue'
import { listPost, publishPost, likePost, unlikePost, listComments } from '../../api/post'
import { submitReport } from '../../api/report'
import { useUserStore } from '../../store/user'
import { fromNow } from '../../utils/date'
import { startChat } from '../../utils/startChat'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const keyword = ref('')
const list = ref([])
const pageNum = ref(1)
const total = ref(0)
const loading = ref(false)
const newPost = ref('')
const newImages = ref([])
const publishing = ref(false)
const expandedPostId = ref(null)
const commentMap = ref({})
const reportVisible = ref(false)
const reportReasonType = ref('违规')
const reportReason = ref('')
const reportTarget = ref(null)

function search() {
  pageNum.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await listPost({ keyword: keyword.value || undefined, pageNum: pageNum.value, pageSize: 10 })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function publish() {
  if (!newPost.value.trim()) {
    ElMessage.warning('请输入内容')
    return
  }
  publishing.value = true
  try {
    await publishPost({ content: newPost.value, images: newImages.value })
    ElMessage.success('已提交，待管理员审核后公开')
    newPost.value = ''
    newImages.value = []
  } finally {
    publishing.value = false
  }
}

async function toggleLike(p) {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  if (p.liked) {
    await unlikePost(p.id)
    p.liked = false
    p.likeCount--
  } else {
    await likePost(p.id)
    p.liked = true
    p.likeCount++
  }
}

async function toggleComments(p) {
  if (expandedPostId.value === p.id) {
    expandedPostId.value = null
    return
  }
  expandedPostId.value = p.id
  reloadComments(p)
}

async function reloadComments(p) {
  const res = await listComments(p.id, { pageNum: 1, pageSize: 50 })
  commentMap.value = { ...commentMap.value, [p.id]: res.list }
  p.commentCount = res.total
}

async function contactAuthor(p) {
  const title = String(p.content || '').slice(0, 60) || '校园动态'
  await startChat(router, userStore, p.userId, { type: 'post', id: p.id, title })
}

function openReport(p) {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  reportTarget.value = p
  reportVisible.value = true
}

async function doReport() {
  await submitReport({ targetType: 'post', targetId: reportTarget.value.id, reasonType: reportReasonType.value, reason: reportReason.value })
  ElMessage.success('举报已提交')
  reportVisible.value = false
}

watch(
  () => route.query.q,
  (q) => {
    keyword.value = String(q || '')
    search()
  },
  { immediate: true }
)
</script>

<style scoped>
.post-search { width: min(420px, 100%); margin-bottom: 16px; }
.publish-box {
  margin-bottom: 16px;
}
.publish-ops {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 10px;
}
.post-card {
  margin-bottom: 16px;
}
.post-head {
  display: flex;
  gap: 10px;
  align-items: center;
}
.post-head-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
}
.nick {
  font-weight: 600;
}
.time {
  font-size: 12px;
  color: var(--ink-3);
}
.post-content {
  margin: 12px 0;
  line-height: 1.8;
  white-space: pre-wrap;
}
.post-images {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: start;
  gap: 8px;
}
.post-img {
  width: 100%;
  height: auto;
  max-height: 480px;
  aspect-ratio: auto;
  border-radius: 6px;
  background: var(--surface-2);
  overflow: hidden;
}
.post-img :deep(.el-image__inner) {
  width: 100%;
  height: auto;
  max-height: 480px;
  object-fit: contain;
}
.post-ops {
  display: flex;
  gap: 24px;
  margin-top: 12px;
  color: var(--ink-3);
}
.op {
  cursor: pointer;
  user-select: none;
}
.op.liked {
  color: var(--error);
}
.comment-area {
  margin-top: 12px;
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}
</style>
