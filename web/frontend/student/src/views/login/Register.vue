<template>
  <div class="register-page">
    <el-card class="register-card">
      <div class="brand">注册账号</div>
      <div class="sub">填写学号与昵称即可注册（毕设演示不做真认证）</div>
      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="submit">
        <el-form-item prop="studentNo">
          <el-input v-model="form.studentNo" placeholder="学号（6-20位数字）" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="nickname">
          <el-input v-model="form.nickname" placeholder="昵称" :prefix-icon="Avatar" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码（6-32位）" show-password :prefix-icon="Lock" />
        </el-form-item>
        <el-form-item prop="confirm">
          <el-input v-model="form.confirm" type="password" placeholder="确认密码" show-password :prefix-icon="Lock" />
        </el-form-item>
        <el-button type="primary" class="submit" :loading="loading" @click="submit">注 册</el-button>
      </el-form>
      <div class="links">
        已有账号？<router-link to="/login">去登录</router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Avatar } from '@element-plus/icons-vue'
import { register } from '../../api/auth'
import { useUserStore } from '../../store/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const form = reactive({ studentNo: '', nickname: '', password: '', confirm: '' })

const rules = {
  studentNo: [
    { required: true, message: '请输入学号', trigger: 'blur' },
    { pattern: /^\d{6,20}$/, message: '学号为6-20位数字', trigger: 'blur' }
  ],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度6-32位', trigger: 'blur' }
  ],
  confirm: [
    {
      validator: (rule, value, callback) => {
        if (value !== form.password) callback(new Error('两次输入的密码不一致'))
        else callback()
      },
      trigger: 'blur'
    }
  ]
}

async function submit() {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await register({
      studentNo: form.studentNo,
      nickname: form.nickname,
      password: form.password
    })
    userStore.loginSuccess(res.token, res.userInfo)
    ElMessage.success('注册成功，已自动登录')
    router.push('/')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2f9e8a 0%, #8fcfc0 100%);
}
.register-card {
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
