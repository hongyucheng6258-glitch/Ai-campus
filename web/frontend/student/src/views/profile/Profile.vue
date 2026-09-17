<template>
  <WtPageHeader title="个人中心" subtitle="管理你的资料与发布" eyebrow="我的" />

  <div class="profile">
    <!-- 渐变 Banner（对齐原型 profile-banner） -->
    <div class="profile-banner">
      <el-avatar :size="96" :src="user?.avatar" class="banner-avatar">{{ user?.nickname?.charAt(0) }}</el-avatar>
      <div class="banner-info">
        <h3>{{ user?.nickname }}</h3>
        <p class="banner-id">学号 {{ user?.studentNo || '未绑定' }} · {{ user?.phone ? '手机 ' + user?.phone : '未绑定手机' }}</p>
        <div class="banner-tags">
          <span v-if="user?.avatar" class="banner-tag tag-brand">已设头像</span>
          <span v-if="user?.phone" class="banner-tag tag-success">手机已绑定</span>
          <span v-if="user?.bio" class="banner-tag tag-info">已写简介</span>
        </div>
      </div>
      <div class="banner-ops">
        <el-button @click="editVisible = true">编辑资料</el-button>
        <el-button @click="pwdVisible = true">修改密码</el-button>
      </div>
    </div>

    <div class="profile-grid">
    <!-- 左栏：我的数据 Tab -->
    <div class="profile-main">
    <el-card>
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
            <el-table-column label="操作" width="170">
              <template #default="{ row }">
                <template v-if="row.status !== 3 && row.status !== 2">
                  <el-button size="small" link type="primary" @click="editIdle(row)">编辑</el-button>
                  <el-button size="small" link type="danger" @click="offlineIdle(row)">下架</el-button>
                </template>
                <el-button v-if="row.status === 3" size="small" link type="success" @click="relistIdle(row)">重新上架</el-button>
                <span v-if="row.status === 2" style="color: var(--ink-3); font-size: 12px">已完成</span>
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
    </div>

    <!-- 右栏：真实数据统计 -->
    <aside class="profile-rail">
      <div class="rail-card card">
        <div class="rail-title">我的数据</div>
        <div class="rail-stat">
          <span>我的闲置</span><b>{{ myIdle.length }}</b>
        </div>
        <div class="rail-stat">
          <span>累计错题</span><b>{{ wrongStatsData.total ?? 0 }}</b>
        </div>
        <div class="rail-stat">
          <span>AI 会话</span><b>{{ conversationCount }}</b>
        </div>
      </div>
      <div class="rail-card card">
        <div class="rail-title">学习进度</div>
        <div class="rail-stat">
          <span>待复习</span><b>{{ wrongStatsData.pending ?? 0 }}</b>
        </div>
        <div class="rail-stat">
          <span>已掌握</span><b>{{ wrongStatsData.mastered ?? 0 }}</b>
        </div>
        <div class="rail-stat">
          <span>本周复习</span><b>{{ wrongStatsData.weekReviewCount ?? 0 }}</b>
        </div>
      </div>
    </aside>
    </div>

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
import { myIdle as fetchMyIdle, offlineIdle as apiOfflineIdle, relistIdle as apiRelistIdle } from '../../api/idle'
import { useRouter } from 'vue-router'
import { wrongStats } from '../../api/wrong'
import { listConversations } from '../../api/chat'

const router = useRouter()
const userStore = useUserStore()
const user = computed(() => userStore.userInfo)
const tab = ref('idle')
const myIdle = ref([])
const wrongStatsData = ref({ total: 0, pending: 0, mastered: 0, weekReviewCount: 0 })
const conversationCount = ref(0)
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
  try {
    wrongStatsData.value = await wrongStats()
  } catch { /* 未登录等场景静默 */ }
  try {
    const convs = await listConversations()
    conversationCount.value = Array.isArray(convs) ? convs.length : (convs?.list?.length || 0)
  } catch { /* 静默 */ }
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

function editIdle(row) {
  router.push(`/idle/publish?id=${row.id}`)
}

async function relistIdle(row) {
  await apiRelistIdle(row.id)
  ElMessage.success('已重新上架')
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
.profile {
  min-width: 0;
}

/* 渐变 Banner（对齐原型） */
.profile-banner {
  display: flex;
  align-items: center;
  gap: var(--s-6);
  padding: var(--s-7);
  border-radius: var(--r-xl);
  background: linear-gradient(120deg, var(--brand) 0%, var(--brand-strong) 70%, oklch(32% 0.11 168) 100%);
  color: #fff;
  margin-bottom: var(--s-5);
  position: relative;
  overflow: hidden;
}
.profile-banner::after {
  content: "";
  position: absolute;
  right: -60px;
  top: -80px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.14) 0%, transparent 70%);
}
.banner-avatar {
  border: 3px solid rgba(255, 255, 255, 0.35);
  background: linear-gradient(135deg, #fff 0%, var(--accent) 100%);
  color: var(--brand-strong);
  font-weight: 600;
  font-size: 2rem;
  flex: none;
  z-index: 1;
}
.banner-info {
  flex: 1;
  min-width: 0;
  z-index: 1;
}
.banner-info h3 {
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: 600;
  margin: 0 0 6px;
}
.banner-id {
  color: rgba(255, 255, 255, 0.8);
  font-size: var(--fs-sm);
  margin-bottom: var(--s-3);
}
.banner-tags {
  display: flex;
  gap: var(--s-2);
  flex-wrap: wrap;
}
.banner-tag {
  padding: 3px 12px;
  border-radius: var(--r-pill);
  font-size: var(--fs-cap);
  font-weight: 600;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}
.banner-ops {
  display: flex;
  gap: var(--s-2);
  z-index: 1;
}
.banner-ops :deep(.el-button) {
  border-radius: var(--r-pill);
}

/* 两栏 */
.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: var(--s-5);
  align-items: start;
}
.profile-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}
.profile-rail {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  position: sticky;
  top: var(--s-6);
}
.rail-card {
  padding: var(--s-5);
}
.rail-title {
  font-weight: 700;
  font-size: var(--fs-sm);
  margin-bottom: var(--s-3);
  color: var(--ink);
}
.rail-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 0;
  border-bottom: 1px dashed var(--line);
  font-size: var(--fs-sm);
  color: var(--ink-2);
}
.rail-stat:last-child {
  border-bottom: none;
}
.rail-stat b {
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  color: var(--brand-strong);
}

@media (max-width: 1080px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
  .profile-rail {
    position: static;
  }
  .profile-banner {
    flex-wrap: wrap;
  }
}<style scoped>
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
