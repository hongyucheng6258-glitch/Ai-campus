<template>
  <div class="admin-shell">
    <!-- ===================== 深色侧栏 ===================== -->
    <aside class="sidebar">
      <div class="brand" @click="$router.push('/dashboard')">
        <div class="brand-mark">梧</div>
        <div>
          <div class="brand-name">梧桐校园</div>
          <div class="brand-sub">Admin Console</div>
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
          <span>{{ item.label }}</span>
          <em v-if="item.countKey !== undefined" class="nav-count" :class="{ gold: item.gold }">{{ counts[item.countKey] ?? 0 }}</em>
        </router-link>
      </template>

      <div class="sidebar-foot">
        <div class="side-user" @click="$router.push('/system/config')">
          <div class="side-avatar">{{ adminStore.adminInfo?.nickname?.charAt(0) || 'A' }}</div>
          <div class="side-user-meta">
            <b>{{ adminStore.adminInfo?.nickname || '管理员' }}</b>
            <span>{{ roleText }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- ===================== 主区 ===================== -->
    <div class="main">
      <header class="topbar">
        <div class="crumbs">
          <span>首页</span><span class="sep">/</span><b>{{ $route.meta.title || '管理后台' }}</b>
        </div>
        <div class="topbar-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input ref="searchRef" v-model="keyword" type="search" placeholder="搜索用户 / 内容 / 工单 ID…（Ctrl + K）" @keydown.enter="onGlobalSearch" />
        </div>
        <div class="top-actions">
          <button class="icon-btn" title="切换主题" @click="toggleTheme">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          </button>
          <button class="icon-btn" title="待办通知" @click="goNotice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
            <span class="badge-dot">{{ totalPending }}</span>
          </button>
          <button class="icon-btn" title="退出" @click="logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
      </header>

      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '../store/admin'
import { auditList } from '../api/audit'
import { reportList } from '../api/report'

const router = useRouter()
const route = useRoute()
const adminStore = useAdminStore()
const keyword = ref('')
const searchRef = ref()
const counts = ref({})
let countTimer = null

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  bag: '<path d="M3 7h18l-2 13H5z"/><path d="M8 11v6M12 11v6M16 11v6"/>',
  lost: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5z"/>',
  spark: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  warn: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  bell: '<path d="M3 11l18-5v12L3 13zM11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  admin: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  log: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  config: '<path d="M12 2 2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>'
}

const auditTypes = [
  { key: 'activity', icon: 'calendar', to: '/audit/activity', label: '活动审核', countKey: 'activity' },
  { key: 'idle', icon: 'bag', to: '/audit/idle', label: '闲置审核', countKey: 'idle' },
  { key: 'lostfound', icon: 'lost', to: '/audit/lostfound', label: '失物招领审核', countKey: 'lostfound' },
  { key: 'post', icon: 'chat', to: '/audit/post', label: '动态审核', countKey: 'post' },
  { key: 'partner', icon: 'users', to: '/audit/partner', label: '搭子审核', countKey: 'partner' }
]

const navGroups = computed(() => [
  {
    label: '概览',
    items: [{ to: '/dashboard', label: '数据看板', icon: 'dashboard' }]
  },
  {
    label: '内容审核',
    items: [
      ...auditTypes,
      { to: '/ai/audit', label: 'AI 内容审核', icon: 'spark', countKey: 'ai', gold: true }
    ]
  },
  {
    label: '内容管理',
    items: [
      { to: '/content', label: '内容管理', icon: 'manage' }
    ]
  },
  {
    label: '用户与社区',
    items: [
      { to: '/user', label: '用户管理', icon: 'users' },
      { to: '/report', label: '举报处理', icon: 'warn', countKey: 'report' }
    ]
  },
  {
    label: '系统',
    items: [
      { to: '/notice', label: '系统公告', icon: 'bell' },
      { to: '/ai/config', label: 'AI 配置', icon: 'gear' },
      { to: '/ai/logs', label: '调用日志', icon: 'log' },
      { to: '/system/config', label: '系统配置', icon: 'config', superOnly: true },
      { to: '/system', label: '管理员账号', icon: 'admin', superOnly: true }
    ]
  }
])

const visibleGroups = computed(() =>
  navGroups.value
    .map((g) => ({ ...g, items: g.items.filter((m) => !m.superOnly || adminStore.isSuper) }))
    .filter((g) => g.items.length > 0)
)

const roleText = computed(() => {
  const role = adminStore.adminInfo?.role
  return { super: '超级管理员', admin: '内容管理员', ai: 'AI 运营', viewer: '只读' }[role] || role || '管理员'
})

const totalPending = computed(() =>
  Object.values(counts.value).reduce((a, b) => a + (Number(b) || 0), 0)
)

function isActive(to) {
  if (to === '/dashboard') return route.path === '/dashboard'
  // /system(管理员账号) 与 /system/config(系统配置) 是平级菜单：
  // 前缀匹配会让 /system/config 时 /system 也高亮，这里精确匹配
  if (to === '/system') return route.path === '/system'
  return route.path === to || route.path.startsWith(to + '/')
}

function onGlobalSearch() {
  const q = keyword.value.trim()
  router.push(q ? { path: '/user', query: { q } } : '/user')
}

function toggleTheme() {
  const root = document.documentElement
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
  root.dataset.theme = next
  localStorage.setItem('admin_theme', next)
}

function logout() {
  adminStore.logout()
  router.push('/login')
}

function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchRef.value?.focus()
  }
}

function goNotice() {
  // 按待办数排序的跳转优先级（counts 含 report/ai）
  const order = [
    { k: 'report', to: '/report' },
    { k: 'activity', to: '/admin/audit/activity' },
    { k: 'idle', to: '/admin/audit/idle' },
    { k: 'lostfound', to: '/admin/audit/lostfound' },
    { k: 'post', to: '/admin/audit/post' },
    { k: 'partner', to: '/admin/audit/partner' },
    { k: 'ai', to: '/admin/ai/audit' },
  ]
  const top = order.reduce((best, it) =>
    (Number(counts.value[it.k]) || 0) > (Number(counts.value[best.k]) || 0) ? it : best, order[0])
  if (Number(counts.value[top.k]) > 0) {
    router.push(top.to)
  } else {
    // 无待办时进入举报中心（含各分类待办入口）
    router.push('/report')
  }
}

async function loadCounts() {
  try {
    const results = await Promise.all(
      auditTypes.map(async (t) => {
        const res = await auditList({ type: t.key, pageNum: 1, pageSize: 1 })
        return [t.key, res.total || 0]
      })
    )
    const map = Object.fromEntries(results)
    // AI 复核：4 类待审核中 AI 风险 >= 中 的合计（取第一页近似）
    let ai = 0
    for (const t of auditTypes) {
      const res = await auditList({ type: t.key, pageNum: 1, pageSize: 100 })
      ai += (res.list || []).filter((r) => (r.aiRiskLevel ?? 0) >= 1).length
    }
    map.ai = ai
    try {
      const rr = await reportList({ status: 0, pageNum: 1, pageSize: 1 })
      map.report = rr.total || 0
    } catch (e) {
      map.report = 0
    }
    counts.value = map
  } catch (e) {
    // 统计失败不阻塞布局
  }
}

onMounted(() => {
  const saved = localStorage.getItem('admin_theme')
  if (saved) document.documentElement.dataset.theme = saved
  loadCounts()
  window.addEventListener('keydown', onKeydown)
  // 待办数定时刷新（举报/审核处置后红点实时更新）
  countTimer = window.setInterval(loadCounts, 30000)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (countTimer) window.clearInterval(countTimer)
})
</script>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 232px 1fr;
  min-height: 100vh;
}

/* —— 深色侧栏 —— */
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 20px 12px 16px;
  background: var(--side-bg);
  color: var(--side-ink);
  overflow-y: auto;
  overflow-x: hidden;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  margin-bottom: 14px;
  cursor: pointer;
}
.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  flex: none;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.15rem;
  color: #fff;
  background: linear-gradient(140deg, var(--brand), var(--brand-deep));
  box-shadow: 0 2px 8px oklch(0% 0 0 / .3);
}
.brand-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.05rem;
  line-height: 1.15;
  color: #fff;
  white-space: nowrap;
}
.brand-sub {
  font-size: var(--fs-cap);
  color: var(--side-ink-3);
  letter-spacing: .06em;
  text-transform: uppercase;
}
.nav-label {
  font-size: var(--fs-cap);
  color: var(--side-ink-3);
  letter-spacing: .1em;
  padding: 14px 10px 5px;
  white-space: nowrap;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 9px 10px;
  border-radius: var(--r-sm);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--side-ink-3);
  text-decoration: none;
  transition: background .18s, color .18s;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
}
.nav-item svg { width: 18px; height: 18px; flex: none; }
.nav-item:hover { background: var(--side-hover); color: var(--side-ink); }
.nav-item.active { background: var(--side-active); color: #fff; font-weight: 600; }
.nav-item.active::before {
  content: "";
  position: absolute;
  left: -12px;
  top: 20%;
  bottom: 20%;
  width: 3px;
  border-radius: 2px;
  background: var(--accent);
}
.nav-count {
  margin-left: auto;
  background: var(--accent);
  color: var(--accent-ink);
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 17px;
  padding: 0 5px;
  border-radius: var(--r-pill);
  display: grid;
  place-items: center;
}
.nav-count.gold { background: var(--gold); color: oklch(24% 0.06 75); }
.sidebar-foot {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--side-line);
}
.side-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: background .18s;
}
.side-user:hover { background: var(--side-hover); }
.side-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(140deg, var(--purple), var(--info));
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: var(--fs-xs);
  flex: none;
}
.side-user-meta { line-height: 1.2; min-width: 0; }
.side-user-meta b { display: block; font-size: var(--fs-sm); color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.side-user-meta span { font-size: var(--fs-cap); color: var(--side-ink-3); }

/* —— 主区 —— */
.main { display: flex; flex-direction: column; min-width: 0; }
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: var(--s-4);
  height: 60px;
  padding: 0 var(--s-6);
  background: color-mix(in srgb, var(--paper) 85%, transparent);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
}
.crumbs { display: flex; align-items: center; gap: 8px; font-size: var(--fs-sm); color: var(--ink-3); }
.crumbs b { color: var(--ink); font-weight: 600; }
.crumbs .sep { opacity: .5; }
.topbar-search { flex: 1; max-width: 420px; position: relative; }
.topbar-search svg {
  position: absolute; left: 12px; top: 50%; width: 16px; height: 16px;
  transform: translateY(-50%); color: var(--ink-3); pointer-events: none;
}
.topbar-search input {
  width: 100%; height: 38px; padding: 0 14px 0 36px;
  border: 1px solid var(--line); border-radius: var(--r-sm);
  background: var(--surface-2); color: var(--ink); font-size: var(--fs-sm);
  transition: border-color .2s, box-shadow .2s, background .2s;
}
.topbar-search input:focus { outline: none; border-color: var(--brand); background: var(--surface); box-shadow: 0 0 0 3px var(--brand-soft); }
.top-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.icon-btn {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: var(--r-sm);
  display: grid;
  place-items: center;
  color: var(--ink-2);
  border: 1px solid var(--line);
  background: var(--surface);
  cursor: pointer;
  transition: background .18s, color .18s, border-color .18s;
}
.icon-btn:hover { background: var(--surface-2); color: var(--ink); }
.icon-btn svg { width: 17px; height: 17px; }
.badge-dot {
  position: absolute; top: -4px; right: -4px;
  min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: var(--r-pill); background: var(--accent); color: var(--accent-ink);
  font-size: 10px; font-weight: 700; display: grid; place-items: center;
}
.content { padding: var(--s-6); max-width: 1440px; width: 100%; margin: 0 auto; }

/* —— 响应式 —— */
@media (max-width: 920px) {
  .admin-shell { grid-template-columns: 64px 1fr; }
  .sidebar { padding: 16px 10px; }
  .brand-name, .brand-sub, .nav-label, .nav-item span, .nav-count, .side-user-meta { display: none; }
  .nav-item { justify-content: center; padding: 11px 0; }
  .nav-item.active::before { left: -10px; }
  .brand { justify-content: center; padding: 6px 0; }
  .side-user { justify-content: center; padding: 8px 0; }
  .crumbs { display: none; }
}
@media (max-width: 780px) {
  .content { padding: var(--s-4); }
  .topbar { padding: 0 var(--s-4); }
  .topbar-search { display: none; }
}
</style>
