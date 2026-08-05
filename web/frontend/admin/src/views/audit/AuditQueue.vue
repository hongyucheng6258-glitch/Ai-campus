<template>
  <WtPageHeader title="审核队列" subtitle="待处理的发布与举报" eyebrow="管理后台" />

  <el-card>
    <template #header>内容审核（先审后发）</template>
    <!-- Tab 切换四类内容 -->
    <el-tabs v-model="type" @tab-change="search">
      <el-tab-pane label="闲置物品" name="idle" />
      <el-tab-pane label="活动" name="activity" />
      <el-tab-pane label="失物招领" name="lostfound" />
      <el-tab-pane label="动态" name="post" />
    </el-tabs>
    <el-table :data="list" v-loading="loading">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column :label="titleLabel" min-width="200">
        <template #default="{ row }">{{ row.title || row.content }}</template>
      </el-table-column>
      <el-table-column label="图片" width="90">
        <template #default="{ row }">
          <el-image v-if="firstImage(row.images)" :src="firstImage(row.images)" fit="cover"
                    style="width:48px;height:48px;border-radius:4px" :preview-src-list="parseImages(row.images)" />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="描述/内容" min-width="220">
        <template #default="{ row }">
          <span class="desc">{{ row.description || row.content }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="提交时间" width="170" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="success" @click="pass(row)">通过</el-button>
          <el-button size="small" type="danger" @click="openReject(row)">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="pageNum" :total="total" :page-size="10"
                   layout="total, prev, pager, next" style="margin-top: 16px" @current-change="load" />

    <!-- 驳回理由弹窗（必填） -->
    <el-dialog v-model="rejectVisible" title="驳回原因" width="420px">
      <el-input v-model="rejectReason" type="textarea" :rows="3"
                placeholder="必填，将随消息通知作者" maxlength="255" />
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="acting" @click="reject">确认驳回</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import WtPageHeader from '../../components/wt/WtPageHeader.vue'
import { ElMessage } from 'element-plus'
import { auditList, auditPass, auditReject } from '../../api/audit'

const type = ref('idle')
const list = ref([])
const pageNum = ref(1)
const total = ref(0)
const loading = ref(false)
const acting = ref(false)
const rejectVisible = ref(false)
const rejectReason = ref('')
const currentRow = ref(null)

const titleLabel = computed(() => (type.value === 'post' ? '动态内容' : '标题'))

function search() {
  pageNum.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await auditList({ type: type.value, pageNum: pageNum.value, pageSize: 10 })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

/** images 为 JSON 数组字符串 */
function parseImages(json) {
  try {
    return JSON.parse(json || '[]')
  } catch (e) {
    return []
  }
}
function firstImage(json) {
  return parseImages(json)[0]
}

async function pass(row) {
  await auditPass(type.value, row.id)
  ElMessage.success('已通过，作者将收到通知')
  load()
}

function openReject(row) {
  currentRow.value = row
  rejectReason.value = ''
  rejectVisible.value = true
}

async function reject() {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写驳回理由')
    return
  }
  acting.value = true
  try {
    await auditReject(type.value, currentRow.value.id, rejectReason.value.trim())
    ElMessage.success('已驳回，作者将收到通知')
    rejectVisible.value = false
    load()
  } finally {
    acting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--ink-2);
}
</style>
