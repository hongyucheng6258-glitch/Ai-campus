<template>
  <WtPageHeader title="校园公告" subtitle="学校与平台的重要通知" eyebrow="资讯" />

  <div class="notice-list">
    <el-card>
      <template #header><h3>📢 校园公告</h3></template>
      <div v-loading="loading">
        <div v-for="n in list" :key="n.id" class="notice-item" @click="$router.push(`/notice/detail/${n.id}`)">
          <div class="n-title">{{ n.title }}</div>
          <div class="n-time">{{ formatTime(n.publishTime) }}</div>
        </div>
        <EmptyBox v-if="!loading && !list.length" description="暂无公告" />
      </div>
      <el-pagination v-model:current-page="pageNum" :total="total" :page-size="10"
                     layout="prev, pager, next" style="margin-top: 16px" @current-change="load" />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import WtPageHeader from '../../components/wt/WtPageHeader.vue'
import { listNotice } from '../../api/notice'
import { formatTime } from '../../utils/date'
import EmptyBox from '../../components/EmptyBox.vue'

const list = ref([])
const pageNum = ref(1)
const total = ref(0)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await listNotice({ pageNum: pageNum.value, pageSize: 10 })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.notice-item {
  display: flex;
  justify-content: space-between;
  padding: 14px 8px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}
.notice-item:hover {
  background: var(--surface-2);
}
.n-title {
  font-size: 14px;
  color: var(--ink);
}
.n-time {
  font-size: 12px;
  color: var(--ink-3);
}
</style>
