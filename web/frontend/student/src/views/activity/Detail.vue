<template>
  <WtPageHeader title="活动详情" subtitle="查看活动信息并报名参与" eyebrow="校园服务" />

  <div class="detail" v-loading="loading">
    <el-card v-if="act">
      <div class="layout">
        <div class="gallery">
          <el-carousel v-if="act.imageList?.length" height="320px">
            <el-carousel-item v-for="img in act.imageList" :key="img">
              <el-image :src="img" fit="contain" style="width:100%;height:100%" :preview-src-list="act.imageList" />
            </el-carousel-item>
          </el-carousel>
          <el-empty v-else description="无图片" :image-size="80" />
        </div>
        <div class="info">
          <h2>{{ act.title }}</h2>
          <div class="meta">
            <el-tag v-if="act.category">{{ act.category }}</el-tag>
            <el-tag :type="displayType(act.displayStatus)">
              {{ act.displayStatusText || ['报名中', '已满', '已结束', '已下架'][act.status] || '报名中' }}
            </el-tag>
          </div>
          <div class="kv">📍 地点：{{ act.location || '待定' }}</div>
          <div class="kv">🕐 时间：{{ formatTime(act.startTime) }} ~ {{ formatTime(act.endTime) }}</div>
          <div class="kv">⏰ 报名截止：{{ formatTime(act.signupDeadline) }}</div>
          <div class="kv">👥 已报名：{{ act.memberCount }}{{ act.maxMembers ? ' / ' + act.maxMembers : '' }} 人</div>
          <div class="desc">{{ act.description }}</div>
          <div class="publisher">
            <el-avatar :size="36" :src="act.publisherAvatar">{{ act.publisherNickname?.charAt(0) }}</el-avatar>
            <span>{{ act.publisherNickname }}</span>
          </div>
          <div class="actions">
            <!-- 发布者视角：名单管理 + 签到二维码 -->
            <template v-if="act.isOwner">
              <el-button type="primary" @click="loadMembers">报名名单管理</el-button>
              <el-button @click="showQrcode">签到二维码</el-button>
            </template>
            <!-- 参与者视角 -->
            <template v-else>
              <el-button v-if="act.mySignupStatus === null || act.mySignupStatus === undefined"
                         type="primary" size="large" :disabled="!act.canSignup" @click="signupVisible = true">
                {{ act.canSignup ? '我要报名' : (act.signupDisabledReason || '不可报名') }}
              </el-button>
              <el-tag v-else-if="act.mySignupStatus === 0" type="warning" size="large">报名待审批</el-tag>
              <el-tag v-else-if="act.mySignupStatus === 1" type="success" size="large">
                已通过报名{{ act.signedIn ? '（已签到）' : '（活动现场请扫码签到）' }}
              </el-tag>
              <el-tag v-else type="danger" size="large">报名未通过</el-tag>
              <el-button type="primary" plain @click="contactPublisher">私信发起人</el-button>
            </template>
            <el-button text type="warning" @click="reportVisible = true">举报</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 报名弹窗 -->
    <el-dialog v-model="signupVisible" title="报名活动" width="440px">
      <el-input v-model="remark" type="textarea" :rows="3"
                placeholder="报名说明/组队信息（如：计科2201张三，求组队）" maxlength="255" />
      <template #footer>
        <el-button @click="signupVisible = false">取消</el-button>
        <el-button type="primary" :loading="signing" @click="doSignup">确认报名</el-button>
      </template>
    </el-dialog>

    <!-- 名单管理弹窗（发布者） -->
    <el-dialog v-model="membersVisible" title="报名名单" width="640px">
      <el-table :data="members" size="small">
        <el-table-column prop="nickname" label="昵称" width="100" />
        <el-table-column prop="studentNo" label="学号" width="110" />
        <el-table-column prop="remark" label="报名说明" min-width="160" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="['warning','success','danger'][row.status]">
              {{ ['待审批','已通过','已拒绝'][row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="签到" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.signedIn" size="small" type="success">已签</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-button size="small" type="success" link @click="approve(row, true)">通过</el-button>
              <el-button size="small" type="danger" link @click="approve(row, false)">拒绝</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 签到二维码弹窗 -->
    <el-dialog v-model="qrVisible" title="活动签到" width="420px">
      <el-alert type="success" :closable="false" title="参与者打开小程序「扫一扫」扫描下方二维码即可签到" />
      <div class="qr-code-wrap">
        <img v-if="qrImage" :src="qrImage" class="qr-code" alt="活动签到二维码" />
      </div>
      <div class="qr-content">{{ qrContent }}</div>
      <p class="qr-tip">如扫码不便，可复制上方签到内容手动录入。</p>
    </el-dialog>

    <!-- 举报弹窗 -->
    <el-dialog v-model="reportVisible" title="举报该活动" width="440px">
      <el-select v-model="reportReasonType" style="width: 100%; margin-bottom: 10px">
        <el-option label="虚假/欺诈信息" value="欺诈" />
        <el-option label="违规内容" value="违规" />
        <el-option label="广告骚扰" value="广告" />
        <el-option label="其他" value="其他" />
      </el-select>
      <el-input v-model="reportReason" type="textarea" :rows="3" maxlength="500" placeholder="补充说明（可空）" />
      <template #footer>
        <el-button @click="reportVisible = false">取消</el-button>
        <el-button type="primary" @click="doReport">提交举报</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import WtPageHeader from '../../components/wt/WtPageHeader.vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { activityDetail, signupActivity, activityMembers, handleMember, signinQrcode } from '../../api/activity'
import { submitReport } from '../../api/report'
import { formatTime } from '../../utils/date'
import { normalizeSigninQrContent } from '../../utils/signinQr.mjs'
import { useUserStore } from '../../store/user'
import { startChat } from '../../utils/startChat'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const id = Number(route.params.id)
const act = ref(null)
const loading = ref(false)
const signupVisible = ref(false)
const remark = ref('')
const signing = ref(false)
const membersVisible = ref(false)
const members = ref([])
const qrVisible = ref(false)
const qrContent = ref('')
const qrImage = ref('')
const reportVisible = ref(false)

/** 有效展示状态 → 标签颜色：0报名中 1已满员 2报名已截止 3进行中 4已结束 5已下架 */
function displayType(s) {
  return ['success', 'warning', 'info', 'info', 'info', 'danger'][s ?? 0] || 'info'
}
const reportReasonType = ref('违规')
const reportReason = ref('')

async function load() {
  loading.value = true
  try {
    act.value = await activityDetail(id)
  } finally {
    loading.value = false
  }
}

async function doSignup() {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  signing.value = true
  try {
    await signupActivity(id, { remark: remark.value })
    ElMessage.success('报名已提交，等待发布者审批')
    signupVisible.value = false
    load()
  } finally {
    signing.value = false
  }
}

async function loadMembers() {
  members.value = await activityMembers(id)
  membersVisible.value = true
}

async function approve(row, ok) {
  await handleMember(row.id, ok)
  ElMessage.success(ok ? '已通过' : '已拒绝')
  loadMembers()
  load()
}

async function showQrcode() {
  const res = await signinQrcode(id)
  const content = normalizeSigninQrContent(res)
  if (!content) {
    ElMessage.error('签到内容生成失败，请重试')
    return
  }
  qrContent.value = content
  qrImage.value = await QRCode.toDataURL(content, {
    width: 240,
    margin: 2,
    errorCorrectionLevel: 'M'
  })
  qrVisible.value = true
}

async function contactPublisher() {
  await startChat(router, userStore, act.value?.userId, { type: 'activity', id, title: act.value?.title })
}

async function doReport() {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  await submitReport({ targetType: 'activity', targetId: id, reasonType: reportReasonType.value, reason: reportReason.value })
  ElMessage.success('举报已提交')
  reportVisible.value = false
}

onMounted(load)
</script>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 440px 1fr;
  gap: 24px;
}
.gallery {
  background: var(--surface-2);
  border-radius: 8px;
}
.meta {
  display: flex;
  gap: 8px;
  margin: 8px 0 12px;
}
.kv {
  color: var(--ink-2);
  font-size: 14px;
  margin: 6px 0;
}
.desc {
  color: var(--ink-2);
  line-height: 1.8;
  white-space: pre-wrap;
  margin: 12px 0;
}
.publisher {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px;
  background: var(--surface-2);
  border-radius: 8px;
  margin-bottom: 16px;
}
.actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.qr-code-wrap {
  display: flex;
  justify-content: center;
  padding: 20px 0 8px;
}
.qr-code {
  width: 240px;
  height: 240px;
  border-radius: 8px;
}
.qr-content {
  word-break: break-all;
  background: var(--surface-2);
  padding: 12px;
  border-radius: 6px;
  margin-top: 12px;
  font-family: monospace;
}
.qr-tip {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 8px;
}
</style>
