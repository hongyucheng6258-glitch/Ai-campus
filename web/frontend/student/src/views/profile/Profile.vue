<template>
  <WtPageHeader title="个人中心" subtitle="管理你的资料与发布" eyebrow="我的" />

  <div class="profile">
    <!-- 资料卡 -->
    <el-card class="profile-card">
      <div class="base">
        <el-avatar :size="72" :src="user?.avatar">{{ user?.nickname?.charAt(0) }}</el-avatar>
        <div class="base-info">
          <h3>{{ user?.nickname }}</h3>
          <p>学号：{{ user?.studentNo || '未绑定' }}　手机：{{ user?.phone || '未填写' }}</p>
          <p class="bio">{{ user?.bio || '这个人很懒，什么都没写' }}</p>
        </div>
        <el-button @click="editVisible = true">编辑资料</el-button>
        <el-button @click="pwdVisible = true">修改密码</el-button>
      </div>
    </el-card>

    <!-- 我的数据 Tab -->
    <el-card style="margin-top: 16px">
      <el-tabs v-model="tab">
        <el-tab-pane label="我的闲置" name="idle">
          <el-table :data="myIdle" size="small">
            <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">
                <router-link :to="`/idle/detail/${row.id}`">{{ row.title }}</router-link>
              </template>
            </el-table-column>
            <el-table-column label="审核" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="['warning','success','danger'][row.auditStatus]">
                  {{ ['待审核','已通过','已驳回'][row.auditStatus] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">{{ ['在架','已预约','已完成','已下架'][row.status] }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button v-if="row.status !== 3" size="small" link type="danger" @click="offlineIdle(row)">下架</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="我的报名" name="signup">
          <el-button text type="primary" @click="$router.push('/activity/my-signup')">前往「我的活动」查看 ›</el-button>
        </el-tab-pane>
        <el-tab-pane label="错题本" name="wrong">
          <el-button text type="primary" @click="$router.push('/ai/wrong')">前往错题本 ›</el-button>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 编辑资料弹窗 -->
    <el-dialog v-model="editVisible" title="编辑资料" width="440px">
      <el-form :model="editForm" label-width="70px">
        <el-form-item label="昵称"><el-input v-model="editForm.nickname" maxlength="32" /></el-form-item>
        <el-form-item label="头像">
          <UploadImg v-model="avatarList" :max="1" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="editForm.gender">
            <el-radio :value="0">保密</el-radio>
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="手机号"><el-input v-model="editForm.phone" maxlength="11" /></el-form-item>
        <el-form-item label="简介"><el-input v-model="editForm.bio" type="textarea" :rows="2" maxlength="255" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="pwdVisible" title="修改密码" width="440px">
      <el-form :model="pwdForm" label-width="80px">
        <el-form-item label="原密码"><el-input v-model="pwdForm.oldPassword" type="password" show-password /></el-form-item>
        <el-form-item label="新密码"><el-input v-model="pwdForm.newPassword" type="password" show-password /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="savePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import WtPageHeader from '../../components/wt/WtPageHeader.vue'
import { ElMessage } from 'element-plus'
import UploadImg from '../../components/UploadImg.vue'
import { useUserStore } from '../../store/user'
import * as userApi from '../../api/user'
import { myIdle as fetchMyIdle, offlineIdle as apiOfflineIdle } from '../../api/idle'

const userStore = useUserStore()
const user = computed(() => userStore.userInfo)
const tab = ref('idle')
const myIdle = ref([])
const editVisible = ref(false)
const pwdVisible = ref(false)
const saving = ref(false)
const editForm = reactive({ nickname: '', gender: 0, phone: '', bio: '' })
const avatarList = ref([])
const pwdForm = reactive({ oldPassword: '', newPassword: '' })

onMounted(async () => {
  await userStore.refresh()
  Object.assign(editForm, {
    nickname: user.value?.nickname,
    gender: user.value?.gender ?? 0,
    phone: user.value?.phone,
    bio: user.value?.bio
  })
  avatarList.value = user.value?.avatar ? [user.value.avatar] : []
  loadMyIdle()
})

async function loadMyIdle() {
  const res = await fetchMyIdle({ pageNum: 1, pageSize: 50 })
  myIdle.value = res.list
}

async function offlineIdle(row) {
  await apiOfflineIdle(row.id)
  ElMessage.success('已下架')
  loadMyIdle()
}

async function saveProfile() {
  saving.value = true
  try {
    await userApi.updateProfile({ ...editForm, avatar: avatarList.value[0] || '' })
    await userStore.refresh()
    ElMessage.success('保存成功')
    editVisible.value = false
  } finally {
    saving.value = false
  }
}

async function savePassword() {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) {
    ElMessage.warning('请填写完整')
    return
  }
  saving.value = true
  try {
    await userApi.updatePassword(pwdForm)
    ElMessage.success('密码已修改')
    pwdVisible.value = false
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.base {
  display: flex;
  gap: 16px;
  align-items: center;
}
.base-info {
  flex: 1;
}
.base-info h3 {
  margin-bottom: 4px;
}
.base-info p {
  font-size: 13px;
  color: var(--ink-3);
}
.bio {
  margin-top: 4px;
}
</style>
