<template>
  <WtPageHeader title="消息中心" subtitle="来自平台与同学的提醒" eyebrow="我的" />

  <div class="message-center">
    <button class="private-entry" @click="router.push('/chat')">
      <span class="private-icon">私</span>
      <span><b>同学私信</b><small>查看一对一会话、图片与未读消息</small></span>
      <el-badge :value="chatStore.unreadTotal" :hidden="!chatStore.unreadTotal" />
      <span>进入 →</span>
    </button>
    <el-card>
      <template #header>
        <div class="head">
          <h3>🔔 消息中心</h3>
          <el-button size="small" @click="readAll">全部已读</el-button>
        </div>
      </template>
      <el-tabs v-model="type" @tab-change="search">
        <el-tab-pane label="全部" name="" />
        <el-tab-pane label="系统通知" name="system" />
        <el-tab-pane label="互动消息" name="interact" />
        <el-tab-pane label="审核结果" name="audit" />
      </el-tabs>
      <div v-loading="loading">
        <div
          v-for="m in list"
          :key="m.id"
          class="msg-item"
          :class="{ unread: m.isRead === 0 }"
          @click="openMsg(m)"
        >
          <el-badge is-dot :hidden="m.isRead === 1">
            <span class="m-icon">{{ iconOf(m.type) }}</span>
          </el-badge>
          <div class="m-body">
            <div class="m-title">{{ m.title }}</div>
            <div class="m-content">{{ m.content }}</div>
          </div>
          <div class="m-time">{{ fromNow(m.createTime) }}</div>
        </div>
        <EmptyBox v-if="!loading && !list.length" description="暂无消息" />
      </div>
      <el-pagination v-model:current-page="pageNum" :total="total" :page-size="10"
                     layout="prev, pager, next" style="margin-top: 16px" @current-change="load" />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import WtPageHeader from '../../components/wt/WtPageHeader.vue'
import { useRouter } from 'vue-router'
import { listMessage, markRead, markAllRead } from '../../api/message'
import { useMessageStore } from '../../store/message'
import { useChatStore } from '../../store/chat'
import { fromNow } from '../../utils/date'
import EmptyBox from '../../components/EmptyBox.vue'

const router = useRouter()
const messageStore = useMessageStore()
const chatStore = useChatStore()
const type = ref('')
const list = ref([])
const pageNum = ref(1)
const total = ref(0)
const loading = ref(false)

const iconOf = (t) => ({ system: '📢', interact: '💬', audit: '✅' }[t] || '📩')

function search() {
  pageNum.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await listMessage({ type: type.value || undefined, pageNum: pageNum.value, pageSize: 10 })
    list.value = res.list
    total.value = res.total
    messageStore.refreshUnread()
  } finally {
    loading.value = false
  }
}

/** 打开消息：标记已读并跳转关联业务页 */
async function openMsg(m) {
  if (m.isRead === 0) {
    await markRead(m.id)
    m.isRead = 1
    messageStore.refreshUnread()
  }
  // 按业务类型跳转详情
  if (m.bizType === 'conversation' && m.bizId) router.push(`/chat/${m.bizId}`)
  else if (m.bizType === 'idle' && m.bizId) router.push('/idle/appointments')
  else if (m.bizType === 'activity' && m.bizId) router.push(`/activity/detail/${m.bizId}`)
}

async function readAll() {
  await markAllRead()
  list.value.forEach((m) => (m.isRead = 1))
  messageStore.refreshUnread()
}

onMounted(load)
</script>

<style scoped>
.private-entry { width:100%; display:grid; grid-template-columns:auto 1fr auto auto; gap:14px; align-items:center; margin-bottom:16px; padding:18px 20px; border:1px solid var(--line); border-radius:18px; background:linear-gradient(135deg,var(--brand-soft),var(--surface)); color:var(--ink-2); text-align:left; cursor:pointer; }
.private-entry b,.private-entry small { display:block; } .private-entry b { color:var(--ink); font-size:16px; } .private-entry small { margin-top:4px; color:var(--ink-3); }
.private-icon { width:42px; height:42px; display:grid; place-items:center; border-radius:14px; color:var(--brand-ink); background:var(--brand-strong); font-family:var(--font-display); font-weight:700; }
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.msg-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 8px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
}
.msg-item.unread {
  background: #f0f6ff;
}
.m-icon {
  font-size: 22px;
}
.m-body {
  flex: 1;
}
.m-title {
  font-size: 14px;
  font-weight: 600;
}
.m-content {
  font-size: 13px;
  color: var(--ink-3);
  margin-top: 4px;
}
.m-time {
  font-size: 12px;
  color: var(--ink-3);
}
</style>
