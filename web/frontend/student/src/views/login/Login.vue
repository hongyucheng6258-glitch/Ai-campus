<template>
  <div class="login-page">
    <!-- 左：V2 故事区（校园蓝 + 校园摄影） -->
    <div class="auth-story">
      <div class="auth-brand">
        <span class="brand-symbol" v-html="BRAND_MARK"></span>
        <span><b>梧桐校园</b><small>Campus AI</small></span>
      </div>
      <div class="auth-story-copy">
        <p class="hello">你好呀，梧桐校园见。</p>
        <h2>新朋友很多，<br>好的校园生活不止一种。</h2>
        <p class="auth-story-more">想参加活动、淘好物、找搭子？<br>这里都可以帮你</p>
      </div>
      <div class="auth-photo">
        <img src="/images/campus-v2.png" alt="阳光下的大学校园" />
        <span class="auth-photo-note">秋日校园 · 2026</span>
        <span class="auth-photo-caption">桐荫下，遇见</span>
      </div>
    </div>

    <!-- 右：登录表单 -->
    <div class="login-form-wrap">
      <div class="login-card">
        <div class="auth-form-head">
          <p>欢迎回来</p>
          <h1>登录梧桐校园</h1>
          <span class="muted">学生端 · 学号密码登录</span>
        </div>
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

const BRAND_MARK = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M4 5h13a3 3 0 0 1 3 3v12H8a4 4 0 0 1-4-4Z"/><path d="M23 4h13v12a4 4 0 0 1-4 4H23Z" opacity=".65"/><path d="M4 23h16v13H8a4 4 0 0 1-4-4Z" opacity=".65"/><path d="M23 23h13v13H23Z" opacity=".3"/></svg>'

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

/* —— 左：故事区（V2 校园蓝） —— */
.auth-story {
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, oklch(34% 0.14 265) 0%, oklch(46% 0.15 268) 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 48px 54px 42px;
}
.auth-brand { display: flex; align-items: center; gap: 11px; }
.auth-brand .brand-symbol { width: 40px; height: 40px; fill: #fff; display: inline-flex; }
.auth-brand .brand-symbol :deep(svg) { width: 100%; height: 100%; }
.auth-brand b { font-size: 20px; display: block; letter-spacing: .5px; }
.auth-brand small { font-size: 9px; color: oklch(95% 0.01 250 / .7); letter-spacing: .12em; text-transform: uppercase; }
.auth-story-copy { margin-top: 68px; position: relative; z-index: 2; }
.auth-story-copy .hello { color: oklch(95% 0.01 250 / .8); font-size: 14px; }
.auth-story-copy h2 {
  font-size: 38px;
  line-height: 1.5;
  font-weight: 700;
  margin: 16px 0 20px;
  letter-spacing: -1px;
}
.auth-story-more { font-size: 14px; line-height: 1.9; color: oklch(95% 0.01 250 / .75); }
.auth-photo {
  margin-top: auto;
  position: relative;
  height: 200px;
  border-radius: 17px;
  overflow: hidden;
  box-shadow: 0 16px 38px oklch(15% 0.05 265 / .3);
}
.auth-photo > img { width: 100%; height: 100%; object-fit: cover; object-position: 55% 45%; }
.auth-photo-note {
  position: absolute;
  top: 13px;
  right: 13px;
  border: 1px solid oklch(100% 0 0 / .5);
  background: oklch(100% 0 0 / .82);
  backdrop-filter: blur(5px);
  color: var(--ink-2);
  border-radius: 50px;
  padding: 4px 11px;
  font-size: 10px;
}
.auth-photo-caption {
  position: absolute;
  left: 16px;
  bottom: 13px;
  font-size: 13px;
  color: #fff;
  text-shadow: 0 1px 6px oklch(10% 0.05 265 / .45);
  font-weight: 550;
}

/* —— 右表单区 —— */
.login-form-wrap {
  display: grid;
  place-items: center;
  padding: var(--s-7);
  background: var(--paper);
}
.login-card { width: 100%; max-width: 400px; }
.auth-form-head { margin-bottom: 27px; }
.auth-form-head p { color: var(--ink-3); font-size: 13px; }
.auth-form-head h1 { font-size: 25px; font-weight: 700; margin: 7px 0 5px; color: var(--ink); letter-spacing: -.4px; }
.auth-form-head .muted { color: var(--ink-3); font-size: 12px; }
.captcha-row { display: flex; width: 100%; gap: var(--s-3); align-items: center; }
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
.submit { width: 100%; height: 44px; margin-top: 8px; border-radius: var(--r-pill); font-weight: 600; }
.login-foot { text-align: center; margin-top: var(--s-5); font-size: var(--fs-sm); color: var(--ink-3); }
.login-foot a { color: var(--brand-strong); font-weight: 600; text-decoration: none; }

.login-card :deep(.el-input__wrapper) { border-radius: var(--r-md); }
.login-card :deep(.el-button--primary) {
  --el-button-bg-color: var(--brand);
  --el-button-border-color: var(--brand);
  --el-button-hover-bg-color: var(--brand-strong);
  --el-button-hover-border-color: var(--brand-strong);
  --el-button-active-bg-color: var(--brand-strong);
  --el-button-active-border-color: var(--brand-strong);
}

@media (max-width: 960px) {
  .auth-story { padding: 34px 34px 30px; }
  .auth-story-copy { margin-top: 48px; }
  .auth-story-copy h2 { font-size: 31px; }
  .auth-photo { height: 165px; }
}
@media (max-width: 820px) {
  .login-page { grid-template-columns: 1fr; }
  .auth-story { display: none; }
  .login-form-wrap { padding: var(--s-5); min-height: 100vh; }
}
</style>
