<template>
  <WtPageHeader title="我的错题本" subtitle="收集你做错的题目，逐个击破" eyebrow="AI 学习" />

  <div class="wrongbook">
    <div class="head">
      <h3>📕 错题本</h3>
      <div>
        <el-button @click="outlineVisible = true">📝 生成复习提纲</el-button>
        <el-button type="primary" @click="openEdit()">＋ 手动收录</el-button>
      </div>
    </div>

    <!-- 学科筛选条 -->
    <div class="filter">
      <el-check-tag :checked="!subject" @change="selectSubject('')">全部</el-check-tag>
      <el-check-tag
        v-for="s in subjects"
        :key="s"
        :checked="subject === s"
        style="margin-left: 8px"
        @change="selectSubject(s)"
      >{{ s }}</el-check-tag>
    </div>

    <!-- 错题卡片列表 -->
    <div class="cards" v-loading="loading">
      <el-card v-for="wq in list" :key="wq.id" class="wq-card" shadow="hover">
        <div class="wq-head">
          <el-tag size="small">{{ wq.subject }}</el-tag>
          <el-tag v-if="wq.tag" size="small" type="info" style="margin-left: 6px">{{ wq.tag }}</el-tag>
          <span class="wq-source">{{ wq.source === 'ai' ? 'AI收录' : '手动收录' }}</span>
        </div>
        <div class="wq-q">{{ wq.question }}</div>
        <el-collapse>
          <el-collapse-item title="查看答案与解析">
            <p><b>答案：</b>{{ wq.answer || '（未填写）' }}</p>
            <p><b>解析：</b>{{ wq.analysis || '（未填写）' }}</p>
          </el-collapse-item>
        </el-collapse>
        <div class="wq-ops">
          <el-button size="small" type="primary" plain :loading="quizId === wq.id" @click="genQuiz(wq)">
            生成同类习题
          </el-button>
          <el-button size="small" @click="openEdit(wq)">编辑</el-button>
          <el-button size="small" type="danger" plain @click="remove(wq)">删除</el-button>
        </div>
      </el-card>
      <EmptyBox v-if="!loading && !list.length" description="暂无错题，点击右上角收录第一道吧" />
    </div>
    <el-pagination
      v-model:current-page="pageNum"
      :total="total"
      :page-size="pageSize"
      layout="prev, pager, next"
      @current-change="load"
    />

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑错题' : '收录错题'" width="560px">
      <el-form :model="editForm" label-width="70px">
        <el-form-item label="学科" required><el-input v-model="editForm.subject" /></el-form-item>
        <el-form-item label="标签"><el-input v-model="editForm.tag" /></el-form-item>
        <el-form-item label="题目" required><el-input v-model="editForm.question" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="答案"><el-input v-model="editForm.answer" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="解析"><el-input v-model="editForm.analysis" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 智能习题结果弹窗（B7） -->
    <el-dialog v-model="quizVisible" title="🤖 AI 生成同类习题" width="640px">
      <div class="md-body" v-html="renderMarkdown(quizResult)" />
    </el-dialog>

    <!-- 复习提纲弹窗（B5） -->
    <el-dialog v-model="outlineVisible" title="📝 AI 生成复习提纲" width="640px">
      <el-form inline>
        <el-form-item label="学科"><el-input v-model="outlineForm.subject" style="width: 140px" /></el-form-item>
        <el-form-item label="章节"><el-input v-model="outlineForm.chapter" style="width: 140px" /></el-form-item>
        <el-form-item label="主题"><el-input v-model="outlineForm.topic" style="width: 180px" /></el-form-item>
        <el-button type="primary" :loading="outlineLoading" @click="genOutline">生成</el-button>
      </el-form>
      <div v-if="outlineResult" class="md-body outline-result" v-html="renderMarkdown(outlineResult)" />
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import WtPageHeader from '../../components/wt/WtPageHeader.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import EmptyBox from '../../components/EmptyBox.vue'
import { listWrong, wrongSubjects, createWrong, updateWrong, deleteWrong } from '../../api/wrong'
import { generateQuiz, generateOutline } from '../../api/ai'
import { renderMarkdown } from '../../utils/markdown'

const list = ref([])
const subjects = ref([])
const subject = ref('')
const pageNum = ref(1)
const pageSize = 10
const total = ref(0)
const loading = ref(false)

const editVisible = ref(false)
const saving = ref(false)
const editForm = reactive({ id: null, subject: '', tag: '', question: '', answer: '', analysis: '' })

const quizVisible = ref(false)
const quizResult = ref('')
const quizId = ref(null)

const outlineVisible = ref(false)
const outlineLoading = ref(false)
const outlineResult = ref('')
const outlineForm = reactive({ subject: '', chapter: '', topic: '' })

onMounted(() => {
  load()
  loadSubjects()
})

async function load() {
  loading.value = true
  try {
    const res = await listWrong({ subject: subject.value || undefined, pageNum: pageNum.value, pageSize })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function loadSubjects() {
  subjects.value = await wrongSubjects()
}

function selectSubject(s) {
  subject.value = s
  pageNum.value = 1
  load()
}

function openEdit(wq) {
  if (wq) {
    Object.assign(editForm, wq)
  } else {
    Object.assign(editForm, { id: null, subject: '', tag: '', question: '', answer: '', analysis: '' })
  }
  editVisible.value = true
}

async function save() {
  if (!editForm.subject || !editForm.question) {
    ElMessage.warning('学科与题目必填')
    return
  }
  saving.value = true
  try {
    if (editForm.id) {
      await updateWrong(editForm.id, editForm)
    } else {
      await createWrong(editForm)
    }
    ElMessage.success('保存成功')
    editVisible.value = false
    load()
    loadSubjects()
  } finally {
    saving.value = false
  }
}

async function remove(wq) {
  await ElMessageBox.confirm('确定删除这道错题吗？', '提示', { type: 'warning' })
  await deleteWrong(wq.id)
  ElMessage.success('已删除')
  load()
}

/** 基于错题生成同类习题（B7） */
async function genQuiz(wq) {
  quizId.value = wq.id
  quizResult.value = ''
  quizVisible.value = true
  try {
    const res = await generateQuiz(wq.id)
    quizResult.value = res.answer
  } finally {
    quizId.value = null
  }
}

/** 复习提纲生成（B5） */
async function genOutline() {
  if (!outlineForm.subject || !outlineForm.topic) {
    ElMessage.warning('学科与主题必填')
    return
  }
  outlineLoading.value = true
  try {
    const res = await generateOutline(outlineForm)
    outlineResult.value = res.answer
  } finally {
    outlineLoading.value = false
  }
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.filter {
  margin-bottom: 16px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.wq-head {
  display: flex;
  align-items: center;
}
.wq-source {
  margin-left: auto;
  font-size: 12px;
  color: var(--ink-3);
}
.wq-q {
  margin: 10px 0;
  font-size: 14px;
  color: var(--ink);
  white-space: pre-wrap;
}
.wq-ops {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.outline-result {
  max-height: 400px;
  overflow-y: auto;
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}
</style>
