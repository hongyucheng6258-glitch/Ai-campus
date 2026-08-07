<template>
  <WtPageHeader title="失物招领" subtitle="遗失与拾获，都在这里相遇" eyebrow="校园服务" />

  <div class="lf-list">
    <div class="toolbar">
      <el-radio-group v-model="type" @change="search">
        <el-radio-button :value="undefined">全部</el-radio-button>
        <el-radio-button :value="0">🔍 失物</el-radio-button>
        <el-radio-button :value="1">📦 招领</el-radio-button>
      </el-radio-group>
      <el-input v-model="keyword" placeholder="搜索…" clearable style="width: 240px" @keyup.enter="search" @clear="search">
        <template #append><el-button @click="search">搜索</el-button></template>
      </el-input>
      <div class="spacer" />
      <el-button type="primary" @click="goPublish">＋ 发布信息</el-button>
    </div>

    <div class="grid" v-loading="loading">
      <ItemCard
        v-for="lf in list"
        :key="lf.id"
        :cover="lf.imageList?.[0]"
        :title="lf.title"
        :desc="lf.description"
        :time="lf.createTime"
        @click="$router.push(`/lostfound/detail/${lf.id}`)"
      >
        <template #footer>
          <div class="card-footer">
            <el-tag size="small" :type="lf.type === 0 ? 'danger' : 'success'">
              {{ lf.type === 0 ? '失物' : '招领' }}
            </el-tag>
            <span>📍 {{ lf.location || '未知地点' }}</span>
          </div>
        </template>
      </ItemCard>
    </div>
    <EmptyBox v-if="!loading && !list.length" description="暂无信息" />
    <el-pagination v-model:current-page="pageNum" :total="total" :page-size="12"
                   layout="prev, pager, next" @current-change="load" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import WtPageHeader from '../../components/wt/WtPageHeader.vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ItemCard from '../../components/ItemCard.vue'
import EmptyBox from '../../components/EmptyBox.vue'
import { listLostFound } from '../../api/lostfound'
import { useUserStore } from '../../store/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const type = ref(undefined)
const keyword = ref('')
const list = ref([])
const pageNum = ref(1)
const total = ref(0)
const loading = ref(false)

function search() {
  pageNum.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await listLostFound({ type: type.value, keyword: keyword.value || undefined, pageNum: pageNum.value, pageSize: 12 })
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
  router.push('/lostfound/publish')
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
  align-items: center;
  font-size: 12px;
  color: var(--ink-3);
}
</style>
