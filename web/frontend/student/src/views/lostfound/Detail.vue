<template>
  <WtPageHeader title="招领详情" subtitle="查看失物信息并联系失主" eyebrow="校园服务" />

  <div class="detail" v-loading="loading">
    <el-card v-if="lf">
      <div class="layout">
        <div class="gallery">
          <el-carousel v-if="lf.imageList?.length" height="340px">
            <el-carousel-item v-for="img in lf.imageList" :key="img">
              <el-image :src="img" fit="contain" style="width:100%;height:100%" :preview-src-list="lf.imageList" />
            </el-carousel-item>
          </el-carousel>
          <el-empty v-else description="无图片" :image-size="80" />
        </div>
        <div class="info">
          <h2>
            <el-tag :type="lf.type === 0 ? 'danger' : 'success'" style="margin-right: 8px">
              {{ lf.type === 0 ? '失物' : '招领' }}
            </el-tag>
            {{ lf.title }}
          </h2>
          <el-tag v-if="lf.status === 1" type="info">✅ 已完成</el-tag>
          <div class="kv">📍 地点：{{ lf.location || '未填写' }}</div>
          <div class="kv">🕐 时间：{{ formatTime(lf.happenTime) || '未填写' }}</div>
          <div class="desc">{{ lf.description }}</div>
          <div class="contact">
            <b>联系方式：</b>{{ lf.contact || '请通过消息联系发布者' }}
          </div>
          <div class="publisher">
            <el-avatar :size="36" :src="lf.publisherAvatar">{{ lf.publisherNickname?.charAt(0) }}</el-avatar>
            <span>{{ lf.publisherNickname }}</span>
          </div>
          <div class="actions">
            <el-button v-if="lf.isOwner && lf.status === 0" type="success" @click="finish">标记为已完成</el-button>
            <el-button v-if="!lf.isOwner" type="primary" plain @click="contactPublisher">私信发布者</el-button>
            <el-button v-if="!lf.isOwner" text type="warning" @click="reportVisible = true">举报</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="reportVisible" title="举报该信息" width="440px">
      <el-select v-model="reasonType" style="width: 100%; margin-bottom: 10px">
        <el-option label="虚假/欺诈信息" value="欺诈" />
        <el-option label="违规内容" value="违规" />
        <el-option label="广告骚扰" value="广告" />
        <el-option label="其他" value="其他" />
      </el-select>
      <el-input v-model="reason" type="textarea" :rows="3" maxlength="500" />
      <template #footer>
        <el-button @click="reportVisible = false">取消</el-button>
        <el-button type="primary" @click="doReport">提交举报</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import WtPageHeader from '../../components/wt/WtPageHeader.vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { lostFoundDetail, finishLostFound } from '../../api/lostfound'
import { submitReport } from '../../api/report'
import { formatTime } from '../../utils/date'
import { useUserStore } from '../../store/user'
import { startChat } from '../../utils/startChat'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const id = Number(route.params.id)
const lf = ref(null)
const loading = ref(false)
const reportVisible = ref(false)
const reasonType = ref('违规')
const reason = ref('')

async function load() {
  loading.value = true
  try {
    lf.value = await lostFoundDetail(id)
  } finally {
    loading.value = false
  }
}

async function finish() {
  await finishLostFound(id)
  ElMessage.success('已标记完成')
  load()
}

async function contactPublisher() {
  await startChat(router, userStore, lf.value?.userId, { type: 'lostfound', id, title: lf.value?.title })
}

async function doReport() {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  await submitReport({ targetType: 'lostfound', targetId: id, reasonType: reasonType.value, reason: reason.value })
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
.kv {
  color: var(--ink-2);
  font-size: 14px;
  margin: 8px 0;
}
.desc {
  color: var(--ink-2);
  line-height: 1.8;
  white-space: pre-wrap;
  margin: 12px 0;
}
.contact {
  background: #fdf6ec;
  padding: 10px 14px;
  border-radius: 6px;
  color: #b88230;
  margin-bottom: 14px;
}
.publisher {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}
.actions {
  display: flex;
  gap: 10px;
}
</style>
