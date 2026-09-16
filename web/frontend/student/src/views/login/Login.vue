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
        <el-form-item prop="captchaCode">
          <div class="captcha-row">
            <el-input v-model="form.captchaCode" placeholder="验证码" maxlength="4" @keyup.enter="submit" />
            <img class="captcha-img" :src="captchaImage" title="看不清？点击刷新" @click="loadCaptcha" />
          </div>
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
import { reactive, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { login, getCaptcha } from '../../api/auth'
import { useUserStore } from '../../store/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const captchaImage = ref('')
const form = reactive({ studentNo: '', password: '', captchaId: '', captchaCode: '' })
const rules = {
  studentNo: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  captchaCode: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

async function loadCaptcha() {
  const data = await getCaptcha()
  form.captchaId = data.captchaId
  captchaImage.value = data.image
  form.captchaCode = ''
}

async function submit() {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await login(form)
    userStore.loginSuccess(res.token, res.userInfo)
    ElMessage.success('登录成功')
    router.push(route.query.redirect || '/')
  } catch (e) {
    // 登录失败（验证码错误/过期/账号密码错误）自动刷新验证码
    loadCaptcha()
  } finally {
    loading.value = false
  }
}

onMounted(loadCaptcha)
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
.captcha-row {
  display: flex;
  width: 100%;
  gap: 10px;
  align-items: center;
}
.captcha-img {
  width: 110px;
  height: 40px;
  border: 1px solid var(--line, #dcdfe6);
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  background: #f5f7fa;
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
