<template>
  <div class="app">
    <!-- ===================== 左侧栏 ===================== -->
    <aside class="sidebar">
      <div class="brand" @click="$router.push('/')">
        <div class="brand-mark">梧</div>
        <div>
          <div class="brand-name">梧桐校园</div>
          <div class="brand-sub">Campus AI</div>
        </div>
      </div>

      <template v-for="group in navGroups" :key="group.label">
        <div class="nav-label">{{ group.label }}</div>
        <router-link
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to) }"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="ICONS[item.icon]"></svg>
          {{ item.label }}
        </router-link>
      </template>

      <!-- 侧栏底部：用户芯片 / 登录 -->
      <div class="sidebar-foot">
        <el-dropdown v-if="userStore.isLoggedIn" @command="onCommand">
          <div class="user-chip">
            <WtAvatar :name="userStore.userInfo?.nickname" :src="userStore.userInfo?.avatar" size="md" />
            <div class="user-meta">
              <b>{{ userStore.userInfo?.nickname }}</b>
              <span>{{ userStore.userInfo?.studentNo || userStore.userInfo?.username || '校园用户' }}</span>
            </div>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人中心</el-dropdown-item>
              <el-dropdown-item command="wrong">错题本</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <WtButton v-else block @click="$router.push('/login')">登录</WtButton>
      </div>
    </aside>

    <!-- ===================== 主区 ===================== -->
    <div class="main">
      <header class="topbar">
        <div class="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索活动、闲置、失物、同学…"
            aria-label="搜索"
            @keyup.enter="onSearch"
          />
        </div>
        <div class="top-actions">
          <WtThemeToggle />
          <el-badge :value="messageStore.unread + chatStore.unreadTotal" :hidden="messageStore.unread + chatStore.unreadTotal === 0" class="bell-wrap">
            <button class="icon-btn" aria-label="消息" @click="goMessage">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
            </button>
          </el-badge>
          <WtButton v-if="!userStore.isLoggedIn" size="sm" @click="$router.push('/login')">登录</WtButton>
        </div>
      </header>

      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../store/user'
import { useMessageStore } from '../store/message'
import { useChatStore } from '../store/chat'
import WtThemeToggle from '../components/wt/WtThemeToggle.vue'
import WtAvatar from '../components/wt/WtAvatar.vue'
import WtButton from '../components/wt/WtButton.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const messageStore = useMessageStore()
const chatStore = useChatStore()
const keyword = ref('')

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  bag: '<path d="M3 7h18l-2 13H5z"/><path d="M3 7l-1-3H0M6 11v6M10 11v6M14 11v6M18 11v6"/>',
  lost: '<circle cx="12" cy="8" r="5"/><path d="M9 13l-1.5 8L12 18l4.5 3L15 13"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5z"/>',
  megaphone: '<path d="M3 11l18-5v12L3 13zM11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  spark: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3"/>',
  code: '<path d="m8 9-4 3 4 3M16 9l4 3-4 3M13 6l-2 12"/>',
  book: '<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM17 3v16"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'
}

const navGroups = [
  {
    label: '校园服务',
    items: [
      { to: '/', label: '综合门户', icon: 'home' },
      { to: '/activity', label: '校园活动', icon: 'calendar' },
      { to: '/idle', label: '闲置互换', icon: 'bag' },
      { to: '/lostfound', label: '失物招领', icon: 'lost' },
      { to: '/social', label: '动态广场', icon: 'chat' },
      { to: '/notice', label: '校园公告', icon: 'megaphone' },
      { to: '/message', label: '消息中心', icon: 'bell' },
      { to: '/chat', label: '私信会话', icon: 'chat' }
    ]
  },
  {
    label: 'AI 学习',
    items: [
      { to: '/ai/chat', label: 'AI 答疑', icon: 'spark' },
      { to: '/ai/code', label: '代码纠错', icon: 'code' },
      { to: '/ai/wrong', label: '错题本', icon: 'book' }
    ]
  }
]

function isActive(to) {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}

function onSearch() {
  const q = keyword.value.trim()
  if (!q) return
  // 轻量跳转：带关键词进入动态广场（真实接入可扩展为全局搜索页）
  router.push({ path: '/social', query: { q } })
}

function goMessage() {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  router.push('/message')
}

function onCommand(cmd) {
  if (cmd === 'profile') router.push('/profile')
  else if (cmd === 'wrong') router.push('/ai/wrong')
  else if (cmd === 'logout') {
    userStore.logout()
    messageStore.stopPolling()
    chatStore.destroy()
    router.push('/login')
  }
}

function handleAuthExpired() {
  userStore.logout()
}

watch(
  () => userStore.isLoggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) {
      messageStore.startPolling()
      chatStore.init(userStore.userInfo?.id)
    } else {
      messageStore.stopPolling()
      chatStore.destroy()
    }
  },
  { immediate: true }
)

window.addEventListener('auth-expired', handleAuthExpired)
onUnmounted(() => {
  window.removeEventListener('auth-expired', handleAuthExpired)
  messageStore.stopPolling()
  chatStore.destroy()
})
</script>

<style scoped>
.app {
  display: grid;
  grid-template-columns: 248px 1fr;
  min-height: 100vh;
}
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px 16px;
  background: var(--surface);
  border-right: 1px solid var(--line);
  overflow-y: auto;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  margin-bottom: 16px;
  cursor: pointer;
}
.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  flex: none;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.25rem;
  color: var(--brand-ink);
  background: linear-gradient(140deg, var(--brand), var(--brand-strong));
  box-shadow: var(--shadow-sm);
}
.brand-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.15rem;
  line-height: 1.1;
}
.brand-sub {
  font-size: var(--fs-cap);
  color: var(--ink-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.nav-label {
  font-size: var(--fs-cap);
  color: var(--ink-3);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 16px 12px 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--ink-2);
  text-decoration: none;
  font-family: var(--font-sans);
  transition: background 0.2s var(--ease-out), color 0.2s var(--ease-out);
}
.nav-item svg { width: 20px; height: 20px; flex: none; }
.nav-item:hover { background: var(--surface-2); color: var(--ink); }
.nav-item.active { background: var(--brand-soft); color: var(--brand-strong); font-weight: 600; }
.nav-item.active svg { color: var(--brand); }
.nav-item:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

.sidebar-foot { margin-top: auto; display: flex; flex-direction: column; gap: 8px; }
.user-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 14px;
  border: 1px solid var(--line);
  cursor: pointer;
  outline: none;
}
.user-chip:hover { background: var(--surface-2); }
.user-meta { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
.user-meta b { font-size: var(--fs-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-meta span { font-size: var(--fs-cap); color: var(--ink-3); }

.main { display: flex; flex-direction: column; min-width: 0; }
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 32px;
  background: color-mix(in srgb, var(--paper) 82%, transparent);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
}
.search { position: relative; flex: 1; max-width: 520px; }
.search svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: var(--ink-3); }
.search input {
  width: 100%;
  padding: 12px 12px 12px 42px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: var(--surface-2);
  font-size: var(--fs-sm);
  color: var(--ink);
  font-family: var(--font-sans);
  transition: border-color 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out), background 0.2s;
}
.search input::placeholder { color: var(--ink-3); }
.search input:focus { outline: none; border-color: var(--brand); background: var(--surface); box-shadow: 0 0 0 4px var(--brand-soft); }

.top-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.icon-btn {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: var(--r-pill);
  display: grid;
  place-items: center;
  color: var(--ink-2);
  border: 1px solid var(--line);
  background: var(--surface);
  cursor: pointer;
  transition: background 0.2s var(--ease-out), color 0.2s, transform 0.15s var(--ease-out);
}
.icon-btn:hover { background: var(--surface-2); color: var(--ink); transform: translateY(-1px); }
.icon-btn svg { width: 20px; height: 20px; }
.icon-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.bell-wrap { line-height: 0; }

.content {
  padding: var(--s-6);
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 1080px) {
  .content { padding: var(--s-5); }
}
@media (max-width: 820px) {
  .app { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .topbar { padding: 12px 16px; }
  .content { padding: 16px; }
}
</style>
