<template>
  <div class="portal">
    <!-- ===== Hero ===== -->
    <WtHero
      :greet="greet"
      :title="`${helloWord}，${nickname} 👋`"
      :subtitle="'一个平台，装下整个校园生活——找活动、淘闲置、拾金不昧，还有随时在线的 AI 学习搭子。'"
      :stats="heroStats"
      spark="DeepSeek 已接入 · 多轮上下文记忆"
      @ai-submit="onAiSubmit"
    />

    <!-- ===== 快捷入口 ===== -->
    <div class="section-head">
      <div class="section-title">快速入口</div>
    </div>
    <div class="quick-grid">
      <WtQuickEntry
        v-for="e in entries"
        :key="e.to"
        :title="e.title"
        :desc="e.desc"
        :variant="e.variant"
        @click="go(e)"
      >
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="ICONS[e.icon]"></svg>
        </template>
      </WtQuickEntry>
    </div>

    <!-- ===== 两栏：推荐流 + 右栏 ===== -->
    <div class="layout-2">
      <div>
        <div class="section-head">
          <div>
            <div class="section-title">为你推荐</div>
            <div class="section-sub">基于你的专业与活跃度</div>
          </div>
          <WtTabs v-model="tab" :options="tabs" />
        </div>

        <div v-if="loading" class="feed">
          <WtEmptyState type="loading" />
        </div>
        <div v-else-if="feedList.length" class="feed">
          <WtFeedCard
            v-for="item in feedList"
            :key="item.key"
            :title="item.title"
            :meta="item.meta"
            :tag="item.tag"
            :price="item.price"
            :image="item.image"
            :action-label="item.actionLabel"
            @action="go({ to: item.to, needLogin: item.needLogin })"
          >
            <template #thumb>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="ICONS[item.thumb]"></svg>
            </template>
          </WtFeedCard>
        </div>
        <WtEmptyState v-else title="暂无内容" description="该分类下还没有新动态，换个分类看看～" />
      </div>

      <!-- 右栏 -->
      <div class="rail">
        <!-- AI 学习搭子 -->
        <div class="ai-mini">
          <div class="ai-mini-head">
            <div class="ai-orb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <div>
              <b>AI 学习搭子</b>
              <div class="section-sub" style="font-size: var(--fs-cap)">随时帮你拆解难题</div>
            </div>
          </div>
          <div class="ai-bubble">
            📘 你本周在 <b>AI 答疑</b> 里有新对话，要我按章节帮你归个类吗？
          </div>
          <WtButton type="accent" block size="sm" @click="go({ to: '/ai/chat', needLogin: true })">继续对话 →</WtButton>
        </div>

        <!-- 我的待办 -->
        <WtCard>
          <div class="section-head" style="margin-bottom: var(--s-3)">
            <div class="section-title" style="font-size: var(--fs-h3)">我的待办</div>
          </div>
          <div class="todo">
            <div
              v-for="(t, i) in todos"
              :key="i"
              class="todo-item"
              :class="{ done: t.done, clickable: Boolean(t.to) }"
              @click="handleTodoClick(t)"
            >
              <span class="todo-check">
                <svg v-if="t.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 12l5 5L20 6"/></svg>
              </span>
              <span class="todo-txt">{{ t.txt }}</span>
              <span class="todo-time">{{ t.time }}</span>
            </div>
          </div>
        </WtCard>

        <!-- 最新消息 -->
        <WtCard>
          <div class="section-head" style="margin-bottom: var(--s-2)">
            <div class="section-title" style="font-size: var(--fs-h3)">最新消息</div>
            <a class="link-more" @click="go({ to: '/message', needLogin: true })">全部</a>
          </div>
          <div v-if="messages.length">
            <div
              v-for="(m, i) in messages"
              :key="i"
              class="msg-item"
              role="button"
              tabindex="0"
              @click="openMessage(m)"
              @keydown.enter="openMessage(m)"
              @keydown.space.prevent="openMessage(m)"
            >
              <WtAvatar :name="m.avatarName" :src="m.avatar" size="md" />
              <div class="msg-body">
                <b>{{ m.name }}</b>
                <p>{{ m.preview }}</p>
              </div>
            </div>
          </div>
          <WtEmptyState v-else title="暂无消息" description="关注动态后，这里会显示最新互动" />
        </WtCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { homeAggregate } from '../../api/notice'
import { listPost } from '../../api/post'
import { listMessage } from '../../api/message'
import { formatTime } from '../../utils/date'
import { firstValidImage } from '../../utils/image.mjs'
import { useUserStore } from '../../store/user'
import { useMessageStore } from '../../store/message'
import WtHero from '../../components/wt/WtHero.vue'
import WtQuickEntry from '../../components/wt/WtQuickEntry.vue'
import WtTabs from '../../components/wt/WtTabs.vue'
import WtFeedCard from '../../components/wt/WtFeedCard.vue'
import WtCard from '../../components/wt/WtCard.vue'
import WtButton from '../../components/wt/WtButton.vue'
import WtAvatar from '../../components/wt/WtAvatar.vue'
import WtEmptyState from '../../components/wt/WtEmptyState.vue'

const router = useRouter()
const userStore = useUserStore()
const messageStore = useMessageStore()
const loading = ref(true)

const ICONS = {
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  bag: '<path d="M3 7h18l-2 13H5z"/><path d="M3 7l-1-3H0M6 11v6M10 11v6M14 11v6M18 11v6"/>',
  lost: '<circle cx="12" cy="8" r="5"/><path d="M9 13l-1.5 8L12 18l4.5 3L15 13"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5z"/>',
  spark: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'
}

const entries = [
  { title: '校园活动', desc: '报名 · 签到', to: '/activity', variant: 1, icon: 'calendar' },
  { title: '闲置交易', desc: '二手 · 互换', to: '/idle', variant: 2, icon: 'bag' },
  { title: '失物招领', desc: '拾金 · 认领', to: '/lostfound', variant: 3, icon: 'lost' },
  { title: '校园动态', desc: '分享 · 互动', to: '/social', variant: 4, icon: 'chat' },
  { title: 'AI 学习助手', desc: '错题 · PDF', to: '/ai/chat', variant: 5, icon: 'spark', needLogin: true },
  { title: '消息中心', desc: '通知 · 私信', to: '/message', variant: 6, icon: 'bell', needLogin: true }
]

const tabs = [
  { value: 'activity', label: '活动' },
  { value: 'idle', label: '闲置' },
  { value: 'lost', label: '失物' },
  { value: 'post', label: '动态' }
]
const tab = ref('activity')

const data = ref({ activities: [], idleItems: [], lostFounds: [], posts: [] })
const messages = ref([])

const nickname = computed(() => userStore.userInfo?.nickname || '同学')

const greet = computed(() => {
  const d = new Date()
  const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()]
  return `${week} · ${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
})
const helloWord = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})
const heroStats = computed(() => {
  const d = data.value
  const total = (d.activities?.length || 0) + (d.idleItems?.length || 0) + (d.lostFounds?.length || 0) + (d.posts?.length || 0)
  return [
    { value: total, label: '条新动态' },
    { value: d.activities?.length || 0, label: '个活动可报名' },
    { value: d.lostFounds?.length || 0, label: '件失物待认领' }
  ]
})

const feedList = computed(() => {
  const d = data.value
  if (tab.value === 'activity') {
    return (d.activities || []).map((a) => ({
      key: 'a' + a.id,
      title: a.title,
      meta: [a.location || '地点待定', formatTime(a.startTime)].filter(Boolean),
      tag: { type: 'brand', label: '报名中' },
      actionLabel: '查看',
      thumb: 'calendar',
      image: firstValidImage(a),
      to: `/activity/detail/${a.id}`
    }))
  }
  if (tab.value === 'idle') {
    return (d.idleItems || []).map((i) => ({
      key: 'i' + i.id,
      title: i.title,
      meta: [i.expectItem ? '期望换：' + i.expectItem : '面议'],
      price: i.price ? '¥' + i.price : '',
      tag: { type: 'neutral', label: '二手' },
      actionLabel: '我想要',
      thumb: 'bag',
      image: firstValidImage(i),
      to: `/idle/detail/${i.id}`
    }))
  }
  if (tab.value === 'lost') {
    return (d.lostFounds || []).map((l) => ({
      key: 'l' + l.id,
      title: l.title,
      meta: [l.type === 0 ? '失物' : '招领'],
      tag: { type: 'warning', label: l.type === 0 ? '寻物' : '待认领' },
      actionLabel: '查看',
      thumb: 'lost',
      image: firstValidImage(l),
      to: `/lostfound/detail/${l.id}`
    }))
  }
  return (d.posts || []).map((p, idx) => ({
    key: 'p' + (p.id ?? idx),
    title: p.content ? (p.content.length > 30 ? p.content.slice(0, 30) + '…' : p.content) : '校园动态',
    meta: [p.authorName || p.nickname || '同学'],
    tag: { type: 'accent', label: '动态' },
    actionLabel: '查看',
    thumb: 'chat',
    image: firstValidImage(p),
    to: '/social'
  }))
})

const todos = computed(() => {
  const list = []
  if (messageStore.unread > 0) {
    list.push({ txt: `查看 ${messageStore.unread} 条新消息`, time: '现在', done: false, to: '/message' })
  }
  if (data.value.activities?.length) {
    list.push({ txt: `${data.value.activities.length} 个活动可报名`, time: '本周', done: false, to: '/activity' })
  }
  if (data.value.lostFounds?.length) {
    list.push({ txt: `${data.value.lostFounds.length} 件失物待认领`, time: '关注', done: false, to: '/lostfound' })
  }
  if (!list.length) {
    list.push({ txt: '熟悉梧桐校园平台', time: '随时', done: true })
  }
  return list
})

function go(entry) {
  if (entry.needLogin && !userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  router.push(entry.to)
}

function handleTodoClick(todo) {
  if (!todo.to) return
  go({ to: todo.to, needLogin: todo.needLogin })
}

function onAiSubmit(q) {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  router.push({ path: '/ai/chat', query: { q } })
}

function openMessage() {
  go({ to: '/message', needLogin: true })
}

onMounted(async () => {
  try {
    const agg = await homeAggregate()
    data.value.activities = agg.activities || []
    data.value.idleItems = agg.idleItems || []
    data.value.lostFounds = agg.lostFounds || []
  } catch (e) {
    // 聚合接口异常不影响页面骨架
  }
  try {
    const pr = await listPost({ page: 1, size: 4 })
    data.value.posts = Array.isArray(pr) ? pr : (pr.list || [])
  } catch (e) {}
  try {
    const mr = await listMessage({ page: 1, size: 3 })
    const arr = Array.isArray(mr) ? mr : (mr.list || [])
    messages.value = arr.map((m) => ({
      name: m.senderName || m.nickname || ({ system: '系统通知', interact: '同学', audit: '审核通知' }[m.type] || '校园通知'),
      avatar: m.senderAvatar || m.avatar || '',
      avatarName: m.senderName || m.nickname || ({ system: '系', interact: '互', audit: '审' }[m.type] || '校'),
      preview: m.content || m.title || ''
    }))
  } catch (e) {}
  loading.value = false
})
</script>

<style scoped>
.portal { display: flex; flex-direction: column; }
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--s-4);
  margin-bottom: var(--s-4);
}
.section-title { font-family: var(--font-display); font-weight: 600; font-size: var(--fs-h2); letter-spacing: -0.01em; }
.section-sub { font-size: var(--fs-sm); color: var(--ink-3); }
.link-more { font-size: var(--fs-sm); font-weight: 600; color: var(--brand-strong); cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
.link-more:hover { gap: 8px; }

.quick-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--s-4); margin-bottom: var(--s-7); }

.layout-2 { display: grid; grid-template-columns: 1fr 340px; gap: var(--s-6); align-items: start; }
.feed { display: flex; flex-direction: column; gap: var(--s-4); }

.rail { display: flex; flex-direction: column; gap: var(--s-5); }
.ai-mini { background: linear-gradient(160deg, var(--brand-soft), var(--surface)); border: 1px solid var(--brand-line); border-radius: var(--r-lg); padding: var(--s-5); }
.ai-mini-head { display: flex; align-items: center; gap: var(--s-3); margin-bottom: var(--s-4); }
.ai-orb { width: 40px; height: 40px; border-radius: var(--r-pill); display: grid; place-items: center; color: #fff; background: linear-gradient(140deg, var(--brand), var(--accent)); box-shadow: var(--shadow-sm); flex: none; }
.ai-orb svg { width: 20px; height: 20px; }
.ai-bubble { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md); padding: var(--s-3) var(--s-4); font-size: var(--fs-sm); color: var(--ink-2); margin-bottom: var(--s-3); }
.ai-bubble b { color: var(--ink); }

.todo { display: flex; flex-direction: column; gap: var(--s-2); }
.todo-item { display: flex; align-items: center; gap: var(--s-3); padding: var(--s-3); border-radius: var(--r-sm); background: var(--surface-2); cursor: pointer; }
.todo-check { width: 20px; height: 20px; border-radius: 6px; border: 2px solid var(--line-strong); flex: none; display: grid; place-items: center; }
.todo-item.done .todo-check { background: var(--success); border-color: var(--success); }
.todo-item.done .todo-check svg { width: 12px; height: 12px; color: #fff; }
.todo-item.done .todo-txt { text-decoration: line-through; color: var(--ink-3); }
.todo-txt { font-size: var(--fs-sm); flex: 1; }
.todo-time { font-size: var(--fs-cap); color: var(--ink-3); font-variant-numeric: tabular-nums; }

.msg-item { display: flex; gap: var(--s-3); padding: var(--s-3) 0; border-bottom: 1px solid var(--line); cursor: pointer; transition: background-color .18s ease; }
.msg-item:hover, .msg-item:focus-visible { background: var(--surface-2); outline: none; }
.msg-item:last-child { border-bottom: none; }
.msg-body { min-width: 0; flex: 1; }
.msg-body b { font-size: var(--fs-sm); }
.msg-body p { font-size: var(--fs-xs); color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }

@media (max-width: 1080px) {
  .quick-grid { grid-template-columns: repeat(3, 1fr); }
  .layout-2 { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .quick-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
