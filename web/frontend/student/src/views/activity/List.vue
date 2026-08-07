<template>
  <WtPageHeader title="校园活动" subtitle="一起参与，一起成长" eyebrow="校园服务" />

  <div class="activity-list">
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索活动…" clearable style="width: 280px" @keyup.enter="search" @clear="search">
        <template #append><el-button @click="search">搜索</el-button></template>
      </el-input>
      <el-select v-model="category" placeholder="全部分类" clearable style="width: 140px" @change="search">
        <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
      </el-select>
      <div class="spacer" />
      <el-button @click="$router.push('/activity/my-signup')">我的报名</el-button>
      <el-button type="primary" @click="goPublish">＋ 发布活动</el-button>
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
        <template #footer>
          <div class="card-footer">
            <span>📍 {{ a.location || '地点待定' }}</span>
            <span class="act-status" :class="statusCls(a.displayStatus)">
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
import { listActivity } from '../../api/activity'
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

/** 有效展示状态 → 标签颜色：0报名中 1已满员 2报名已截止 3进行中 4已结束 5已下架 */
function statusCls(s) {
  return ['st-signing', 'st-full', 'st-closed', 'st-closed', 'st-closed', 'st-off'][s ?? 0] || 'st-closed'
}

function formatTime(t) {
  if (!t) return ''
  return String(t).slice(0, 16)
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
}
.spacer {
  flex: 1;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
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
.st-signing {
  color: #67c23a;
}
.st-full {
  color: #e6a23c;
}
.st-closed {
  color: #909399;
}
.st-off {
  color: #f56c6c;
}
</style>
