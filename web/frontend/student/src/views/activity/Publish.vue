<template>
  <WtPageHeader title="发布活动" subtitle="发起一场属于同学们的聚会" eyebrow="校园服务" />

  <div class="publish">
    <el-card>
      <template #header><h3>发布活动</h3></template>
      <el-alert type="info" :closable="false" title="发布后需管理员审核通过才会公开展示" style="margin-bottom: 16px" />
      <el-form :model="form" label-width="90px" style="max-width: 640px">
        <el-form-item label="活动标题" required>
          <el-input v-model="form.title" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="活动描述">
          <el-input v-model="form.description" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="地点">
          <el-input v-model="form.location" placeholder="如：东区操场 / 图书馆三楼" />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker v-model="form.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="报名截止">
          <el-date-picker v-model="form.signupDeadline" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="人数上限">
          <el-input-number v-model="form.maxMembers" :min="0" :max="500" />
          <span class="tip">（0 表示不限）</span>
        </el-form-item>
        <el-form-item label="图片">
          <UploadImg v-model="form.images" :max="3" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">提交审核</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import WtPageHeader from '../../components/wt/WtPageHeader.vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import UploadImg from '../../components/UploadImg.vue'
import { publishActivity } from '../../api/activity'

const router = useRouter()
const categories = ['学习交流', '体育运动', '文艺娱乐', '志愿服务', '竞赛组队', '其他']
const form = reactive({
  title: '', category: '', description: '', location: '',
  startTime: '', endTime: '', signupDeadline: '', maxMembers: 0, images: []
})
const submitting = ref(false)

async function submit() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写活动标题')
    return
  }
  submitting.value = true
  try {
    await publishActivity(form)
    ElMessage.success('已提交，待管理员审核')
    router.push('/activity')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.publish {
  max-width: 760px;
  margin: 0 auto;
}
.tip {
  margin-left: 8px;
  font-size: 12px;
  color: var(--ink-3);
}
</style>
