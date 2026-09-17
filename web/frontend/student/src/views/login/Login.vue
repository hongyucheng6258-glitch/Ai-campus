<template>
  <div class="login-page">
    <!-- 左：品牌视觉区 -->
    <div class="login-visual">
      <div class="login-visual-content">
        <div class="login-visual-brand">
          <div class="brand-mark">梧</div>
          <div>
            <div class="brand-name">梧桐校园</div>
            <div class="brand-sub">Campus AI</div>
          </div>
        </div>
        <div class="login-visual-tagline">
          <h2>一个平台，装下整个校园生活</h2>
          <p>找活动、淘闲置、拾金不昧，还有随时在线的 AI 学习搭子。DeepSeek 已接入，多轮上下文记忆，让你的每一次提问都被认真对待。</p>
        </div>
        <div class="login-visual-stats">
          <div><b>12k+</b><span>在校学生</span></div>
          <div><b>340+</b><span>本月活动</span></div>
          <div><b>98%</b><span>失物找回率</span></div>
        </div>
      </div>
    </div>

    <!-- 右：登录表单 -->
    <div class="login-form-wrap">
      <div class="login-card">
        <h1>欢迎回来</h1>
        <div class="sub">学生端 · 学号密码登录</div>
        <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="submit">
          <el-form-item prop="studentNo">
            <el-input v-model="form.studentNo" placeholder="请输入学号" :prefix-icon="User" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password :prefix-icon="Lock" />
          </el-form-item>
          <el-form-item prop="captchaCode">
            <div class="captcha-row">
              <el-input v-model="form.captchaCode"
                        :placeholder="captchaMode === 'math' ? '输入运算结果' : '4位验证码'"
                        :maxlength="captchaMode === 'math' ? 3 : 4" @keyup.enter="submit" />
              <img v-if="captchaMode !== 'math'" class="captcha-img" :src="captchaImage"
                   title="看不清？点击刷新" @click="loadCaptcha" />
              <div v-else class="captcha-math" title="换一题" @click="loadCaptcha">{{ captchaExpression }}</div>
            </div>
          </el-form-item>
          <el-button type="primary" class="submit" :loading="loading" @click="submit">登 录</el-button>
        </el-form>
        <div class="login-foot">
          还没有账号？<router-link to="/register">立即注册</router-link>
        </div>
      </div>
    </div>
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
const captchaMode = ref('image')
const captchaExpression = ref('')
const form = reactive({ studentNo: '', password: '', captchaId: '', captchaCode: '' })
const rules = {
  studentNo: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  captchaCode: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

async function loadCaptcha() {
  const data = await getCaptcha()
  form.captchaId = data.captchaId
  captchaMode.value = data.mode || 'image'
  captchaImage.value = data.image
  captchaExpression.value = data.expression
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
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* —— 左视觉区 —— */
.login-visual {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, oklch(45% 0.12 168) 0%, oklch(60% 0.1 168) 100%);
}
.login-visual::before {
  content: "";
  position: absolute;
  inset: 0;
  background: url('/images/login-bg.jpg') center/cover;
  opacity: 0.55;
  mix-blend-mode: overlay;
}
.login-visual-content {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: var(--s-8);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.login-visual-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.login-visual-brand .brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.25rem;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.25);
}
.login-visual-brand .brand-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.15rem;
  line-height: 1.1;
  color: #fff;
}
.login-visual-brand .brand-sub {
  font-size: var(--fs-cap);
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.login-visual-tagline {
  max-width: 460px;
}
.login-visual-tagline h2 {
  font-family: var(--font-display);
  font-size: 2.2rem;
  font-weight: 600;
  line-height: 1.15;
  margin-bottom: var(--s-3);
}
.login-visual-tagline p {
  font-size: var(--fs-body);
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
}
.login-visual-stats {
  display: flex;
  gap: var(--s-6);
  padding-top: var(--s-5);
  border-top: 1px solid rgba(255, 255, 255, 0.18);
}
.login-visual-stats div b {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 600;
  display: block;
}
.login-visual-stats div span {
  font-size: var(--fs-cap);
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* —— 右表单区 —— */
.login-form-wrap {
  display: grid;
  place-items: center;
  padding: var(--s-7);
  background: var(--paper);
}
.login-card {
  width: 100%;
  max-width: 400px;
}
.login-card h1 {
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: 600;
  margin-bottom: var(--s-2);
  color: var(--ink);
}
.login-card .sub {
  color: var(--ink-3);
  font-size: var(--fs-sm);
  margin-bottom: var(--s-6);
}
.captcha-row {
  display: flex;
  width: 100%;
  gap: var(--s-3);
  align-items: center;
}
.captcha-img {
  width: 120px;
  height: 44px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  cursor: pointer;
  flex-shrink: 0;
  background: var(--surface-3);
  object-fit: cover;
}
.captcha-math {
  width: 120px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  cursor: pointer;
  flex-shrink: 0;
  background: linear-gradient(90deg, var(--brand-soft), var(--surface-3));
  color: var(--brand-strong);
  font-weight: 700;
  font-size: 17px;
  letter-spacing: 0.02em;
  user-select: none;
}
.submit {
  width: 100%;
  height: 44px;
  margin-top: 8px;
  border-radius: var(--r-pill);
  font-weight: 600;
}
.login-foot {
  text-align: center;
  margin-top: var(--s-5);
  font-size: var(--fs-sm);
  color: var(--ink-3);
}
.login-foot a {
  color: var(--brand-strong);
  font-weight: 600;
  text-decoration: none;
}

/* el-form-item 圆角对齐 token */
.login-card :deep(.el-input__wrapper) {
  border-radius: var(--r-md);
}
.login-card :deep(.el-button--primary) {
  --el-button-bg-color: var(--brand);
  --el-button-border-color: var(--brand);
  --el-button-hover-bg-color: var(--brand-strong);
  --el-button-hover-border-color: var(--brand-strong);
  --el-button-active-bg-color: var(--brand-strong);
  --el-button-active-border-color: var(--brand-strong);
}

@media (max-width: 820px) {
  .login-page {
    grid-template-columns: 1fr;
  }
  .login-visual {
    display: none;
  }
  .login-form-wrap {
    padding: var(--s-5);
  }
}
</style>
