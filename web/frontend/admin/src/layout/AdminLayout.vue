<template>
  <el-container class="admin-layout">
    <!-- 左侧可折叠菜单（按角色动态生成） -->
    <el-aside :width="collapsed ? '64px' : '210px'" class="aside">
      <div class="logo">{{ collapsed ? '🎓' : '🎓 校园平台管理端' }}</div>
      <el-menu
        :default-active="$route.path"
        :collapse="collapsed"
        router
        background-color="#236b5d"
        text-color="#d6ece6"
        active-text-color="#ffffff"
      >
        <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
          <el-icon><component :is="m.icon" /></el-icon>
          <template #title>{{ m.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶栏：折叠按钮 + 面包屑 + 管理员信息 -->
      <el-header class="header">
        <el-icon class="fold" @click="collapsed = !collapsed">
          <Fold v-if="!collapsed" /><Expand v-else />
        </el-icon>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>管理后台</el-breadcrumb-item>
          <el-breadcrumb-item>{{ $route.meta.title }}</el-breadcrumb-item>
        </el-breadcrumb>
        <div class="spacer" />
        <el-dropdown @command="onCommand">
          <span class="admin">
            <el-avatar :size="28">{{ adminStore.adminInfo?.nickname?.charAt(0) || 'A' }}</el-avatar>
            <span>{{ adminStore.adminInfo?.nickname }}（{{ adminStore.adminInfo?.role }}）</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  DataAnalysis, User, Checked, Warning, Bell,
  Cpu, Document, Setting, Fold, Expand
} from '@element-plus/icons-vue'
import { useAdminStore } from '../store/admin'

const router = useRouter()
const adminStore = useAdminStore()
const collapsed = ref(false)

// 菜单按角色动态生成（super 才显示系统管理）
const allMenus = [
  { path: '/dashboard', title: '数据大屏', icon: DataAnalysis },
  { path: '/user', title: '用户管理', icon: User },
  { path: '/audit', title: '内容审核', icon: Checked },
  { path: '/report', title: '举报处理', icon: Warning },
  { path: '/notice', title: '公告管理', icon: Bell },
  { path: '/ai/config', title: 'AI配置', icon: Cpu },
  { path: '/ai/logs', title: 'AI日志', icon: Document },
  { path: '/system', title: '系统管理', icon: Setting, superOnly: true }
]
const menus = computed(() =>
  allMenus.filter((m) => !m.superOnly || adminStore.isSuper)
)

function onCommand(cmd) {
  if (cmd === 'logout') {
    adminStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.admin-layout {
  height: 100vh;
}
.aside {
  background: #236b5d;
  transition: width 0.2s var(--ease-out);
}
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  letter-spacing: .5px;
}
.aside :deep(.el-menu) {
  border-right: none;
  background-color: transparent;
}
.aside :deep(.el-menu-item) {
  background-color: transparent;
}
.aside :deep(.el-menu-item:hover) {
  background-color: rgba(255, 255, 255, 0.1);
}
.aside :deep(.el-menu-item.is-active) {
  background-color: rgba(255, 255, 255, 0.16);
}
.header {
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid var(--line);
}
.fold {
  cursor: pointer;
  font-size: 18px;
  color: var(--ink-2);
}
.spacer {
  flex: 1;
}
.admin {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--ink);
}
.main {
  padding: 20px;
  background: var(--paper);
  overflow-y: auto;
}
</style>
