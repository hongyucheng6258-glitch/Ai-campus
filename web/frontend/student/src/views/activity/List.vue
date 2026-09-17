<template>
  <WtPageHeader title="校园活动" subtitle="一起参与，一起成长" eyebrow="校园服务" />

  <div class="activity-list">
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索活动…" clearable style="width: 280px" @keyup.enter="search" @clear="search">
        <template #append><el-button @click="search">搜索</el-button></template>
      </el-input>
      <div class="chips">
        <span class="chip" :class="{ active: !category }" @click="selectCategory('')">全部</span>
        <span v-for="c in categories" :key="c" class="chip" :class="{ active: category === c }" @click="selectCategory(c)">{{ c }}</span>
      </div>
      <div class="spacer" />
      <el-button @click="$router.push('/activity/my-signup')">我的报名</el-button>
      <el-button type="primary" @click="goPublish">＋ 发布活动</el-button>
    </div>

    <!-- AI 智能推荐 -->
    <div class="rec-block">
      <div class="rec-head">
        <b>✨ AI 智能推荐</b>
        <span>基于你的报名偏好，为你挑选最合适的活动</span>
        <el-button size="small" type="success" plain :loading="recLoading" @click="loadRecommend">
          {{ recList.length ? '重新推荐' : '给我推荐' }}
        </el-button>
      </div>
      <div v-if="recList.length" class="rec-grid">
        <div v-for="r in recList" :key="r.id" class="rec-card" @click="$router.push(`/activity/detail/${r.id}`)">
          <div class="rec-card__top">
            <b>{{ r.title }}</b>
            <span class="rec-cat">{{ r.category }}</span>
          </div>
          <p class="rec-reason">💡 {{ r.reason }}</p>
          <div class="rec-meta">
            <span>🕐 {{ formatTime(r.startTime) }}</span>
            <span>📍 {{ r.location || '地点待定' }}</span>
            <span>{{ r.memberCount }} 人已报名</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid" v-loading="loading">
      <ItemCard
        v-for="a in list"
        :key="a.id"
        :cover="a.imageList?.[0]"
        :title="a.title"
        :desc="a.description"
        :time="a.createTime"
        @click="$router.push(`/activity/detail/${a.id}`)"
      >
        <template #badge>
          <span class="badge-tag" :class="statusCls(a.displayStatus)">{{ a.displayStatusText || ['报名中', '已满', '已结束', '已下架'][a.status] || '报名中' }}</span>
        </template>
        <template #footer>
          <div class="card-footer">
            <span>📍 {{ a.location || '地点待定' }}</span>
            <span class="act-status" :class="badgeCls(a.displayStatus)">
              {{ a.displayStatusText || ['报名中', '已满', '已结束', '已下架'][a.status] || '报名中' }}
            </span>
          </div>
          <div class="card-footer sub">
            <span>{{ a.memberCount }}{{ a.maxMembers ? '/' + a.maxMembers : '' }} 人已报名</span>
            <span v-if="a.signupDeadline">截止 {{ formatTime(a.signupDeadline) }}</span>
          </div>
        </template>
      </ItemCard>
    </div>
    <EmptyBox v-if="!loading && !list.length" description="暂无活动" />
    <el-pagination
      v-model:current-page="pageNum"
      :total="total"
      :page-size="12"
      layout="prev, pager, next"
      @current-change="load"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import WtPageHeader from '../../components/wt/WtPageHeader.vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ItemCard from '../../components/ItemCard.vue'
import EmptyBox from '../../components/EmptyBox.vue'
import { listActivity, recommendActivity } from '../../api/activity'
import { useUserStore } from '../../store/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const categories = ['学习交流', '体育运动', '文艺娱乐', '志愿服务', '竞赛组队', '其他']
const keyword = ref('')
const category = ref('')
const list = ref([])
const pageNum = ref(1)
const total = ref(0)
const loading = ref(false)
const recList = ref([])
const recLoading = ref(false)

/** AI 智能推荐 */
async function loadRecommend() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  recLoading.value = true
  try {
    const res = await recommendActivity()
    recList.value = Array.isArray(res) ? res : (res.list || [])
    if (!recList.value.length) ElMessage.info('暂时没有合适的推荐，稍后再来试试')
  } catch (e) {
    ElMessage.error(e.message || '推荐失败，请稍后重试')
  } finally {
    recLoading.value = false
  }
}

/** 有效展示状态 → 标签颜色：0报名中 1已满员 2报名已截止 3进行中 4已结束 5已下架 */
function statusCls(s) {
  return ['st-signing', 'st-full', 'st-closed', 'st-closed', 'st-closed', 'st-off'][s ?? 0] || 'st-closed'
}

const STATUS_TAG = { 'st-signing': 'tag-brand', 'st-full': 'tag-warning', 'st-closed': 'tag-neutral', 'st-off': 'tag-error' }
function badgeCls(s) {
  return STATUS_TAG[statusCls(s)] || 'tag-neutral'
}

function formatTime(t) {
  if (!t) return ''
  return String(t).slice(0, 16)
}

function selectCategory(c) {
  category.value = c
  search()
}

function search() {
  pageNum.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await listActivity({ keyword: keyword.value || undefined, category: category.value || undefined, pageNum: pageNum.value, pageSize: 12 })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function goPublish() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  router.push('/activity/publish')
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
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.spacer {
  flex: 1;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.chip {
  padding: 6px 14px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: var(--surface);
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--ink-2);
  cursor: pointer;
  transition: all .18s var(--ease-out);
}
.chip:hover {
  border-color: var(--brand-line);
}
.chip.active {
  background: var(--brand-soft);
  color: var(--brand-strong);
  border-color: var(--brand-line);
}
.badge-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--r-pill);
  font-size: var(--fs-cap);
  font-weight: 600;
  letter-spacing: 0.02em;
}
.tag-brand { background: var(--brand-soft); color: var(--brand-strong); }
.tag-warning { background: var(--warning-soft); color: var(--gold-strong); }
.tag-neutral { background: var(--surface-3); color: var(--ink-2); }
.tag-error { background: var(--error-soft); color: var(--error); }
.card-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--ink-3);
}
.card-footer.sub {
  margin-top: 4px;
}
.act-status {
  font-weight: 600;
}
.st-signing { color: var(--success); }
.st-full { color: var(--warning); }
.st-closed { color: var(--ink-3); }
.st-off { color: var(--error); }
.rec-block {
  margin-bottom: 20px; padding: 14px 16px; border: 1px dashed var(--brand-line);
  border-radius: var(--r-md); background: linear-gradient(120deg, var(--brand-soft), #fdfaf3);
}
.rec-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.rec-head b { font-size: var(--fs-sm); color: var(--brand-strong); }
.rec-head span { font-size: var(--fs-cap); color: var(--ink-3); }
.rec-head .el-button { margin-left: auto; }
.rec-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.rec-card {
  padding: 12px 14px; border: 1px solid var(--line); border-radius: var(--r-md);
  background: var(--surface); cursor: pointer; transition: all .18s var(--ease-out);
}
.rec-card:hover { border-color: var(--brand-line); transform: translateY(-2px); }
.rec-card__top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.rec-card__top b { flex: 1; font-size: var(--fs-cap); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-cat { padding: 2px 8px; border-radius: var(--r-pill); background: var(--brand-soft); color: var(--brand-strong); font-size: var(--fs-cap); font-weight: 600; flex-shrink: 0; }
.rec-reason { margin: 0 0 8px; font-size: var(--fs-cap); color: var(--success-strong, #008a5c); line-height: 1.6; }
.rec-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: var(--fs-cap); color: var(--ink-3); }
</style>
