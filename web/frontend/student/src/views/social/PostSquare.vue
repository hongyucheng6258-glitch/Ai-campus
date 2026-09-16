<template>
  <WtPageHeader title="校园动态" subtitle="同学们都在聊些什么" eyebrow="同辈圈" />

  <div class="square">
    <div class="square-main">
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
          <span class="op" @click="sharePost(p)">🔗 分享</span>
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
    </div>

    <!-- 右栏：热门话题 + 热门动态 -->
    <aside class="square-rail">
      <div v-if="hotTopics.length" class="rail-card card card-hover">
        <div class="rail-title">🔥 热门话题</div>
        <div class="topic-list">
          <button v-for="(t, i) in hotTopics" :key="t.tag" type="button" class="topic-row" @click="searchTopic(t.tag)">
            <span class="topic-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
            <span class="topic-tag"># {{ t.tag }}</span>
            <span class="topic-count">{{ t.count }} 讨论</span>
          </button>
        </div>
      </div>
      <div v-if="hotPosts.length" class="rail-card card card-hover">
        <div class="rail-title">🔥 热门动态</div>
        <div class="hot-list">
          <button v-for="p in hotPosts" :key="p.id" type="button" class="hot-row" @click="openPost(p)">
            <el-avatar :size="30" :src="p.avatar">{{ p.nickname?.charAt(0) }}</el-avatar>
            <div class="hot-main">
              <div class="hot-text">{{ p.content }}</div>
              <div class="hot-meta">❤️ {{ p.likeCount }} · 💬 {{ p.commentCount }}</div>
            </div>
          </button>
        </div>
      </div>
    </aside>

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
import { computed, ref, watch } from 'vue'
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

/** 热门话题：从动态内容提取 #标签 并按出现次数聚合 */
const hotTopics = computed(() => {
  const counter = new Map()
  for (const p of list.value) {
    const tags = String(p.content || '').match(/#([\u4e00-\u9fa5A-Za-z0-9]+)/g) || []
    for (const raw of tags) {
      const tag = raw.slice(1)
      counter.set(tag, (counter.get(tag) || 0) + 1)
    }
  }
  return [...counter.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

/** 热门动态：按互动量（赞+评论）排序 Top3 */
const hotPosts = computed(() =>
  [...list.value]
    .sort((a, b) => (b.likeCount || 0) + (b.commentCount || 0) - (a.likeCount || 0) - (a.commentCount || 0))
    .slice(0, 3)
)

function searchTopic(tag) {
  keyword.value = tag
  search()
}

function openPost(p) {
  expandedPostId.value = p.id
  if (!commentMap.value[p.id]) reloadComments(p)
}

async function sharePost(p) {
  const url = `${location.origin}${location.pathname}#/social?post=${p.id}`
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('链接已复制，快去分享吧')
  } catch {
    ElMessage.info(`动态链接：${url}`)
  }
}

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
.square {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: var(--s-5);
  align-items: start;
}
.square-main {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  min-width: 0;
}
.square-rail {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  position: sticky;
  top: var(--s-6);
}
.rail-card {
  padding: var(--s-5);
}
.rail-title {
  font-weight: 700;
  font-size: var(--fs-sm);
  margin-bottom: var(--s-3);
}
.topic-list {
  display: flex;
  flex-direction: column;
}
.topic-row {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: 9px 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  font-family: inherit;
  border-bottom: 1px dashed var(--line);
}
.topic-row:last-child {
  border-bottom: none;
}
.topic-row:hover .topic-tag {
  color: var(--brand-strong);
}
.topic-rank {
  width: 20px;
  height: 20px;
  border-radius: var(--r-pill);
  display: grid;
  place-items: center;
  font-size: var(--fs-cap);
  font-weight: 700;
  background: var(--surface-3);
  color: var(--ink-3);
  flex: none;
}
.topic-rank.top {
  background: var(--gold-soft);
  color: var(--gold-strong);
}
.topic-tag {
  flex: 1;
  font-weight: 600;
  font-size: var(--fs-sm);
  color: var(--ink-2);
  transition: color .15s;
}
.topic-count {
  font-size: var(--fs-cap);
  color: var(--ink-3);
}
.hot-list {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}
.hot-row {
  display: flex;
  gap: var(--s-3);
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  padding: 0;
  width: 100%;
}
.hot-main {
  min-width: 0;
}
.hot-text {
  font-size: var(--fs-sm);
  color: var(--ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hot-meta {
  font-size: var(--fs-cap);
  color: var(--ink-3);
  margin-top: 2px;
}

/* 头像渐变（对齐原型 user-avatar） */
.post-card :deep(.el-avatar) {
  background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%);
  color: #fff;
  font-weight: 600;
}
.square-rail :deep(.el-avatar) {
  background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%);
  color: #fff;
  font-weight: 600;
  flex: none;
}

@media (max-width: 1080px) {
  .square {
    grid-template-columns: 1fr;
  }
  .square-rail {
    position: static;
  }
}
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
