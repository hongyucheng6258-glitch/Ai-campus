<template>
  <WtPageHeader title="我的报名" subtitle="我参与和发起的活动" eyebrow="我的" />

  <div class="my-signup">
    <el-card>
      <template #header><h3>我的活动</h3></template>
      <el-tabs v-model="tab">
        <!-- 我的报名 -->
        <el-tab-pane label="我的报名" name="signup">
          <el-table :data="signups" v-loading="loading">
            <el-table-column prop="activityTitle" label="活动" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">
                <router-link :to="`/activity/detail/${row.activityId}`">{{ row.activityTitle }}</router-link>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="报名说明" min-width="160" show-overflow-tooltip />
            <el-table-column prop="createTime" label="报名时间" width="170" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="['warning','success','danger'][row.status]">
                  {{ ['待审批','已通过','已拒绝'][row.status] }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination v-model:current-page="signupPage" :total="signupTotal" :page-size="10"
                         layout="prev, pager, next" style="margin-top: 16px" @current-change="loadSignups" />
        </el-tab-pane>
        <!-- 我的发布 -->
        <el-tab-pane label="我的发布" name="published">
          <el-table :data="published" v-loading="loading">
            <el-table-column prop="title" label="活动" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">
                <router-link :to="`/activity/detail/${row.id}`">{{ row.title }}</router-link>
              </template>
            </el-table-column>
            <el-table-column label="审核状态" width="100">
              <template #default="{ row }">
                <el-tag :type="['warning','success','danger'][row.auditStatus]">
                  {{ ['待审核','已通过','已驳回'][row.auditStatus] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="auditReason" label="驳回理由" min-width="140" show-overflow-tooltip />
            <el-table-column label="报名数" width="90">
              <template #default="{ row }">{{ row.memberCount }}</template>
            </el-table-column>
            <el-table-column prop="createTime" label="发布时间" width="170" />
          </el-table>
          <el-pagination v-model:current-page="pubPage" :total="pubTotal" :page-size="10"
                         layout="prev, pager, next" style="margin-top: 16px" @current-change="loadPublished" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import WtPageHeader from '../../components/wt/WtPageHeader.vue'
import { mySignups, myActivities } from '../../api/activity'

const tab = ref('signup')
const loading = ref(false)
const signups = ref([])
const signupPage = ref(1)
const signupTotal = ref(0)
const published = ref([])
const pubPage = ref(1)
const pubTotal = ref(0)

async function loadSignups() {
  loading.value = true
  try {
    const res = await mySignups({ pageNum: signupPage.value, pageSize: 10 })
    signups.value = res.list
    signupTotal.value = res.total
  } finally {
    loading.value = false
  }
}

async function loadPublished() {
  loading.value = true
  try {
    const res = await myActivities({ pageNum: pubPage.value, pageSize: 10 })
    published.value = res.list
    pubTotal.value = res.total
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSignups()
  loadPublished()
})
</script>
