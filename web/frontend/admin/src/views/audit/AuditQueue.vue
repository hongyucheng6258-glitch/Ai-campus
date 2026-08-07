<template>
  <WtPageHeader title="审核队列" subtitle="待处理的发布与举报" eyebrow="管理后台" />

  <el-card>
    <template #header>
      <div class="panel-heading">
        <div>
          <h2>{{ viewMode === 'all' ? '全部学生内容' : '待人工审核' }}</h2>
          <p>自动通过、人工通过、待审核和已驳回内容都可追溯管理。</p>
        </div>
        <div style="display:flex;gap:12px">
          <el-radio-group v-model="viewMode" @change="handleViewChange">
            <el-radio-button value="all">全部内容</el-radio-button>
            <el-radio-button value="pending">待人工审核</el-radio-button>
          </el-radio-group>
          <el-button :loading="loading" @click="load">刷新队列</el-button>
        </div>
      </div>
    </template>
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
          <el-image v-if="firstValidImage(row) && !imageErrors[row.id]" :src="firstValidImage(row)" fit="cover"
                    style="width:48px;height:48px;border-radius:4px" :preview-src-list="normalizeImages(row)"
                    @error="imageErrors[row.id] = true" />
          <span v-if="imageErrors[row.id]" class="image-placeholder">图片加载失败</span>
          <span v-else-if="!firstValidImage(row)" class="image-placeholder">暂无图片</span>
        </template>
      </el-table-column>
      <el-table-column label="描述/内容" min-width="220">
        <template #default="{ row }">
          <span class="desc">{{ row.description || row.content }}</span>
        </template>
      </el-table-column>
      <el-table-column label="审核状态" width="110">
        <template #default="{ row }">
          <el-tag :type="['warning', 'success', 'danger'][row.auditStatus]">{{ ['待审核', '已通过', '已驳回'][row.auditStatus] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="AI风险" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.aiRiskLevel !== null && row.aiRiskLevel !== undefined" :type="['success', 'warning', 'danger'][row.aiRiskLevel]">
            {{ ['低风险', '中风险', '高风险'][row.aiRiskLevel] }}
          </el-tag>
          <span v-else>未评估</span>
        </template>
      </el-table-column>
      <el-table-column prop="aiAuditReason" label="AI判断原因" min-width="190" show-overflow-tooltip />
      <el-table-column label="审核来源" width="100">
        <template #default="{ row }">{{ sourceText[row.auditSource] || '人工' }}</template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.auditStatus !== 1" size="small" type="success" @click="pass(row)">通过</el-button>
          <el-button v-if="row.auditStatus !== 2" size="small" type="danger" @click="openReject(row)">驳回</el-button>
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
import { auditAll, auditList, auditPass, auditReject } from '../../api/audit'
import { formatTime } from '../../utils/date'
import { normalizeImages, firstValidImage } from '../../utils/image'

const type = ref('idle')
const viewMode = ref('all')
const sourceText = { manual: '人工', ai: 'AI自动', ai_manual: 'AI+人工' }
const list = ref([])
const pageNum = ref(1)
const total = ref(0)
const loading = ref(false)
const acting = ref(false)
const rejectVisible = ref(false)
const rejectReason = ref('')
const currentRow = ref(null)
const imageErrors = ref({})

const titleLabel = computed(() => (type.value === 'post' ? '动态内容' : '标题'))

function search() {
  pageNum.value = 1
  load()
}

function handleViewChange() {
  pageNum.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const requestFn = viewMode.value === 'all' ? auditAll : auditList
    const res = await requestFn({ type: type.value, pageNum: pageNum.value, pageSize: 10 })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
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
.image-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  min-height: 48px;
  color: var(--ink-3);
  font-size: 12px;
  text-align: center;
}

.desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--ink-2);
}
</style>
