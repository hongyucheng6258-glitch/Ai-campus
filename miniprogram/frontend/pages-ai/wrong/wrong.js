// 错题本（分包 pages-ai，v2/v3 同步）
// 列表/筛选/快速收录（学科可选）/复习反馈/今日复习/AI 智能整理/同类题
const { request } = require('../../utils/request')
const { shortTime } = require('../../utils/format')
const { requireLogin } = require('../../utils/auth')
const { getAiAnswer } = require('../../utils/ai-response')

const STATUS_TEXT = { 0: '待复习', 1: '复习中', 2: '基本掌握', 3: '已掌握' }
const STATUS_CLS = { 0: 'st-pending', 1: 'st-reviewing', 2: 'st-basic', 3: 'st-mastered' }
const LEVELS = [
  { v: 0, label: '仍然不会', desc: '回到待复习' },
  { v: 1, label: '有点理解', desc: '1 天后复习' },
  { v: 2, label: '基本掌握', desc: '3 天后复习' },
  { v: 3, label: '已完全掌握', desc: '7 天后复习' }
]

Page({
  data: {
    subjects: [],       // 学科筛选项
    activeSubject: '',  // 当前学科（''=全部）
    list: [],
    pageNum: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    inited: false,
    expandId: null,     // 当前展开查看答案解析的错题ID

    // 顶部数据概览
    stats: { todayPending: 0 },

    // 新增错题弹窗
    showAdd: false,
    form: { subject: '', question: '', myAnswer: '', answer: '', analysis: '' },
    submitting: false,

    // 复习弹窗
    showReview: false,
    reviewItem: null,
    reviewLevel: null,
    reviewSubmitting: false,
    fromToday: false,

    // 今日复习弹窗
    showToday: false,
    todayList: [],
    todayError: false,

    // 同类题结果弹窗
    showQuiz: false,
    quizContent: '',
    quizLoading: false,
    quizFailed: false,

    // 展示映射
    statusText: STATUS_TEXT,
    statusCls: STATUS_CLS,
    levels: LEVELS
  },

  onLoad() {
    if (!requireLogin()) return
    this.loadSubjects()
    this.loadStats()
    this.loadList(true)
  },

  onPullDownRefresh() {
    Promise.all([this.loadSubjects(), this.loadStats(), this.loadList(true)])
      .then(() => wx.stopPullDownRefresh())
      .catch(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadList(false)
    }
  },

  /** 加载学科标签（用于顶部筛选条） */
  async loadSubjects() {
    try {
      const data = await request({ url: '/wrong-question/subjects' })
      this.setData({ subjects: data || [] })
    } catch (e) {
      this.setData({ subjects: [] })
    }
  },

  /** 加载顶部数据概览 */
  async loadStats() {
    try {
      const data = await request({ url: '/wrong-question/stats' })
      this.setData({ stats: data || { todayPending: 0 } })
    } catch (e) {
      // 忽略
    }
  },

  /**
   * 加载错题列表。
   * @param {Boolean} reset true=重置第一页
   */
  async loadList(reset) {
    if (this.data.loading) return
    const pageNum = reset ? 1 : this.data.pageNum + 1
    this.setData({ loading: true })
    try {
      const params = { pageNum, pageSize: this.data.pageSize }
      if (this.data.activeSubject) {
        params.subject = this.data.activeSubject
      }
      const data = await request({ url: '/wrong-question/list', data: params })
      const rows = (data.list || []).map((item) => ({
        ...item,
        timeText: shortTime(item.createTime),
        statusLabel: STATUS_TEXT[item.status] || '待复习',
        statusCls: STATUS_CLS[item.status] || 'st-pending'
      }))
      const list = reset ? rows : this.data.list.concat(rows)
      this.setData({
        list,
        pageNum,
        total: data.total || 0,
        hasMore: list.length < (data.total || 0),
        inited: true
      })
    } catch (e) {
      this.setData({ inited: true })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 切换学科筛选 */
  switchSubject(e) {
    const subject = e.currentTarget.dataset.subject || ''
    if (subject === this.data.activeSubject) return
    this.setData({ activeSubject: subject, list: [], pageNum: 1, hasMore: true, inited: false })
    this.loadList(true)
  },

  /** 展开/收起答案解析 */
  toggleExpand(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ expandId: this.data.expandId === id ? null : id })
  },

  /** 删除错题 */
  removeItem(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '提示',
      content: '确定删除这道错题吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request({ url: `/wrong-question/${id}`, method: 'DELETE' })
          this.setData({ list: this.data.list.filter((x) => x.id !== id) })
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadStats()
        } catch (err) {
          // 错误已统一提示
        }
      }
    })
  },

  // ---------- 复习闭环 ----------

  /** 打开今日复习列表 */
  async openTodayReview() {
    this.setData({ showToday: true, todayError: false })
    try {
      const data = await request({ url: '/wrong-question/today' })
      const rows = (data || []).map((item) => ({
        ...item,
        statusLabel: STATUS_TEXT[item.status] || '待复习'
      }))
      this.setData({ todayList: rows })
    } catch (e) {
      this.setData({ todayList: [], todayError: true })
    }
  },

  closeToday() {
    this.setData({ showToday: false })
  },

  /** 从今日列表开始复习 */
  startReviewFromToday(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.todayList.find((x) => x.id === id)
    if (!item) return
    this.setData({ showToday: false, fromToday: true })
    this.openReview(item)
  },

  /** 从卡片开始复习 */
  startReviewFromCard(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.list.find((x) => x.id === id)
    if (!item) return
    this.setData({ fromToday: false })
    this.openReview(item)
  },

  openReview(item) {
    this.setData({
      showReview: true,
      reviewItem: item,
      reviewLevel: null
    })
  },

  closeReview() {
    this.setData({ showReview: false, reviewItem: null })
  },

  chooseLevel(e) {
    this.setData({ reviewLevel: e.currentTarget.dataset.v })
  },

  /** 提交复习反馈（掌握程度 → 更新状态与下次复习时间） */
  async submitReview() {
    const { reviewItem, reviewLevel, reviewSubmitting } = this.data
    if (reviewLevel === null || reviewLevel === undefined) {
      wx.showToast({ title: '请选择掌握程度', icon: 'none' })
      return
    }
    if (reviewSubmitting) return
    this.setData({ reviewSubmitting: true })
    try {
      await request({
        url: '/wrong-question/review',
        method: 'POST',
        data: {
          wrongQuestionId: reviewItem.id,
          masteryLevel: reviewLevel,
          isCorrect: reviewLevel >= 2 ? 1 : 0
        }
      })
      wx.showToast({ title: '复习反馈已记录', icon: 'success' })
      // 今日列表移除该题
      if (this.data.fromToday) {
        this.setData({
          todayList: this.data.todayList.filter((x) => x.id !== reviewItem.id)
        })
      }
      this.setData({ showReview: false, reviewItem: null })
      this.loadList(true)
      this.loadStats()
    } catch (e) {
      // 错误已统一提示
    } finally {
      this.setData({ reviewSubmitting: false })
    }
  },

  // ---------- AI 智能整理 ----------

  /** 重试/触发智能整理（卡片上 analyzeStatus=1 时显示按钮） */
  async retryAnalyze(e) {
    const id = e.currentTarget.dataset.id
    try {
      await request({ url: `/wrong-question/${id}/analyze`, method: 'POST', data: {} })
      wx.showToast({ title: '智能整理完成', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: '暂未完成智能整理，可稍后重试', icon: 'none' })
    }
    this.loadList(true)
  },

  // ---------- AI 同类题（文本展示 + 复制 + 重试） ----------

  /** 生成同类题：POST /ai/quiz { wrongQuestionId } */
  async generateQuiz(e) {
    const id = e.currentTarget.dataset.id
    if (this.data.quizLoading) return
    this.setData({ quizLoading: true, showQuiz: true, quizFailed: false, quizContent: 'AI 正在出题…' })
    this._quizId = id
    try {
      const data = await request({
        url: '/ai/quiz',
        method: 'POST',
        data: { wrongQuestionId: id }
      })
      this.setData({ quizContent: getAiAnswer(data) || '（AI 未返回内容）' })
    } catch (err) {
      this.setData({
        quizFailed: true,
        quizContent: '出题失败：' + (err.message || 'AI 服务暂不可用') + '\n点击「重试」再试一次。'
      })
    } finally {
      this.setData({ quizLoading: false })
    }
  },

  retryQuiz() {
    if (!this._quizId) return
    this.setData({ showQuiz: true, quizFailed: false, quizContent: 'AI 正在出题…' })
    this.generateQuiz({ currentTarget: { dataset: { id: this._quizId } } })
  },

  /** 关闭同类题弹窗 */
  closeQuiz() {
    this.setData({ showQuiz: false, quizContent: '', quizFailed: false })
    this._quizId = null
  },

  /** 复制同类题内容 */
  copyQuiz() {
    if (!this.data.quizContent) return
    wx.setClipboardData({
      data: this.data.quizContent,
      success() {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  // ---------- 快速收录（学科可选） ----------

  /** 打开新增错题弹窗 */
  openAdd() {
    this.setData({
      showAdd: true,
      form: { subject: this.data.activeSubject || '', question: '', myAnswer: '', answer: '', analysis: '' }
    })
  },

  /** 关闭新增错题弹窗 */
  closeAdd() {
    this.setData({ showAdd: false })
  },

  /** 表单输入统一处理（data-field 指定字段名） */
  onFormInput(e) {
    const field = e.currentTarget.dataset.field
    const key = `form.${field}`
    this.setData({ [key]: e.detail.value })
  },

  /** 提交新增错题（仅题目必填；保存后异步触发智能整理） */
  async submitAdd() {
    const form = this.data.form
    if (!form.question.trim()) {
      wx.showToast({ title: '请填写题目', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      const data = await request({
        url: '/wrong-question',
        method: 'POST',
        data: {
          subject: form.subject.trim(), // 空 → 后端归一为「待整理」
          question: form.question.trim(),
          myAnswer: form.myAnswer.trim(),
          correctAnswer: form.answer.trim(),
          analysis: form.analysis.trim()
        }
      })
      wx.showToast({ title: '已收录，正在智能整理…', icon: 'success' })
      this.setData({ showAdd: false })
      // fire-and-forget：AI 智能整理（失败仅标记，不影响收录）
      if (data && data.id) {
        request({ url: `/wrong-question/${data.id}/analyze`, method: 'POST', data: {} }).catch(() => {})
      }
      this.loadSubjects()
      this.loadList(true)
      this.loadStats()
    } catch (e) {
      // 错误已统一提示
    } finally {
      this.setData({ submitting: false })
    }
  },

  /** 阻止弹窗内部点击穿透到遮罩 */
  stopPropagation() {}
})
