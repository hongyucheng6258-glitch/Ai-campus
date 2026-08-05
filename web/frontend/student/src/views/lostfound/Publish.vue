<template>
  <WtPageHeader title="发布招领" subtitle="帮物品找到它的主人" eyebrow="校园服务" />

  <div class="publish">
    <el-card>
      <template #header><h3>发布失物/招领信息</h3></template>
      <el-alert type="info" :closable="false" title="发布后需管理员审核通过才会公开展示" style="margin-bottom: 16px" />
      <el-form :model="form" label-width="90px" style="max-width: 640px">
        <el-form-item label="类型" required>
          <el-radio-group v-model="form.type">
            <el-radio :value="0">我丢了东西（失物）</el-radio>
            <el-radio :value="1">我捡到东西（招领）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="64" show-word-limit placeholder="如：图书馆丢失黑色钱包" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="物品特征、时间地点等" />
        </el-form-item>
        <el-form-item label="地点">
          <el-input v-model="form.location" />
        </el-form-item>
        <el-form-item label="发生时间">
          <el-date-picker v-model="form.happenTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input v-model="form.contact" placeholder="手机号/微信号/QQ" />
        </el-form-item>
        <el-form-item label="图片">
          <UploadImg v-model="form.images" :max="6" />
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
import { publishLostFound } from '../../api/lostfound'

const router = useRouter()
const form = reactive({ type: 0, title: '', description: '', location: '', happenTime: '', contact: '', images: [] })
const submitting = ref(false)

async function submit() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写标题')
    return
  }
  submitting.value = true
  try {
    await publishLostFound(form)
    ElMessage.success('已提交，待管理员审核')
    router.push('/lostfound')
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
</style>
