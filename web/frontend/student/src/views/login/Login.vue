<template>
  <div class="login-page">
    <el-card class="login-card">
      <div class="brand">🎓 AI校园综合服务平台</div>
      <div class="sub">学生端 · 学号密码登录</div>
      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="submit">
        <el-form-item prop="studentNo">
          <el-input v-model="form.studentNo" placeholder="学号" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" show-password :prefix-icon="Lock" />
        </el-form-item>
        <el-button type="primary" class="submit" :loading="loading" @click="submit">登 录</el-button>
      </el-form>
      <div class="links">
        还没有账号？<router-link to="/register">立即注册</router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { login } from '../../api/auth'
import { useUserStore } from '../../store/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const form = reactive({ studentNo: '', password: '' })
const rules = {
  studentNo: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function submit() {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await login(form)
    userStore.loginSuccess(res.token, res.userInfo)
    ElMessage.success('登录成功')
    router.push(route.query.redirect || '/')
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
  background: linear-gradient(135deg, #2f9e8a 0%, #8fcfc0 100%);
}
.login-card {
  width: 380px;
  padding: 16px;
}
.brand {
  font-size: 22px;
  font-weight: bold;
  text-align: center;
  color: var(--brand);
}
.sub {
  text-align: center;
  color: var(--ink-3);
  font-size: 13px;
  margin: 8px 0 24px;
}
.submit {
  width: 100%;
}
.links {
  margin-top: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--ink-2);
}
</style>
