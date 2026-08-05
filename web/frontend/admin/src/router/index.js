import { createRouter, createWebHistory } from 'vue-router'

/**
 * 管理端路由 + 权限守卫（A5）。
 * meta.superOnly 标记仅 super 角色可见（系统管理，D8）。
 */
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('../layout/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/dashboard/Dashboard.vue'), meta: { title: '数据大屏' } },
      { path: 'user', name: 'UserList', component: () => import('../views/user/UserList.vue'), meta: { title: '用户管理' } },
      { path: 'audit', name: 'AuditQueue', component: () => import('../views/audit/AuditQueue.vue'), meta: { title: '内容审核' } },
      { path: 'report', name: 'ReportList', component: () => import('../views/report/ReportList.vue'), meta: { title: '举报处理' } },
      { path: 'notice', name: 'NoticeManage', component: () => import('../views/notice/NoticeManage.vue'), meta: { title: '公告管理' } },
      { path: 'notice/edit/:id?', name: 'NoticeEdit', component: () => import('../views/notice/NoticeEdit.vue'), meta: { title: '公告编辑' } },
      { path: 'ai/config', name: 'AiConfig', component: () => import('../views/ai/AiConfig.vue'), meta: { title: 'AI配置' } },
      { path: 'ai/logs', name: 'AiLogs', component: () => import('../views/ai/AiLogs.vue'), meta: { title: 'AI日志' } },
      { path: 'system', name: 'AdminList', component: () => import('../views/system/AdminList.vue'), meta: { title: '系统管理', superOnly: true } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 权限守卫：未登录跳登录页；superOnly 页面校验角色
router.beforeEach((to) => {
  if (to.meta.public) return true
  const token = localStorage.getItem('admin_token')
  if (!token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.superOnly) {
    const info = JSON.parse(localStorage.getItem('admin_info') || 'null')
    if (info?.role !== 'super') {
      return { path: '/dashboard' }
    }
  }
  return true
})

export default router
