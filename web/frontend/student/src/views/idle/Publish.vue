<template>
  <WtPageHeader title="发布闲置" subtitle="把闲置好物分享给同学" eyebrow="校园服务" />

  <div class="publish">
    <el-card>
      <template #header><h3>发布闲置物品</h3></template>
      <el-alert type="info" :closable="false" title="发布后需管理员审核通过才会公开展示" style="margin-bottom: 16px" />
      <el-form :model="form" label-width="90px" style="max-width: 640px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="64" show-word-limit placeholder="如：九成新《数据结构》教材" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category" placeholder="选择分类">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="物品描述">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="成色、入手渠道、瑕疵等" />
        </el-form-item>
        <el-form-item label="期望换物">
          <el-input v-model="form.expectItem" placeholder="想换什么？如：Java编程思想 / 篮球" />
        </el-form-item>
        <el-form-item label="图片">
          <UploadImg v-model="form.images" :max="9" />
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
import { publishIdle } from '../../api/idle'

const router = useRouter()
const categories = ['教材书籍', '数码电子', '生活用品', '运动器材', '服饰鞋包', '其他']
const form = reactive({ title: '', category: '', description: '', expectItem: '', images: [] })
const submitting = ref(false)

async function submit() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写标题')
    return
  }
  submitting.value = true
  try {
    await publishIdle(form)
    ElMessage.success('已提交，待管理员审核')
    router.push('/idle')
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
