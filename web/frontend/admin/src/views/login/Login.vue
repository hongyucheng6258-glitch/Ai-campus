<template>
  <div class="login-page">
    <el-card class="login-card">
      <div class="brand">🎓 校园平台 · 管理后台</div>
      <el-form :model="form" size="large" @keyup.enter="submit">
        <el-form-item>
          <el-input v-model="form.username" placeholder="管理员账号" :prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" show-password :prefix-icon="Lock" />
        </el-form-item>
        <el-button type="primary" class="submit" :loading="loading" @click="submit">登 录</el-button>
      </el-form>
      <div class="tip">初始账号：admin / admin123（请登录后及时修改）</div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { adminLogin } from '../../api/auth'
import { useAdminStore } from '../../store/admin'

const router = useRouter()
const adminStore = useAdminStore()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

async function submit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    // 登录前清理旧管理端状态，避免旧 Token 影响登录请求或路由判断
    adminStore.logout()
    const res = await adminLogin(form)
    adminStore.loginSuccess(res.token, res.adminInfo)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(120% 120% at 0% 0%, var(--brand-soft) 0%, transparent 55%),
    radial-gradient(120% 120% at 100% 100%, var(--accent-soft) 0%, transparent 55%),
    var(--paper);
}
.login-card {
  width: 380px;
  padding: 16px;
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
}
.brand {
  font-size: 20px;
  font-weight: 600;
  font-family: var(--font-display);
  text-align: center;
  margin-bottom: 24px;
  color: var(--brand);
}
.submit {
  width: 100%;
}
.tip {
  margin-top: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--ink-3);
}
</style>
