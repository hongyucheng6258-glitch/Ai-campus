// 错题本（分包 pages-ai）
// GET /wrong-question/list（分页 + subject 筛选）、GET /wrong-question/subjects
// POST /wrong-question 新增、DELETE /wrong-question/{id} 删除
// POST /ai/quiz { wrongQuestionId } → { answer } 生成同类题
const { request } = require('../../utils/request')
const { shortTime } = require('../../utils/format')
const { requireLogin } = require('../../utils/auth')
const { getAiAnswer } = require('../../utils/ai-response')

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

    // 新增错题弹窗
    showAdd: false,
    form: { subject: '', tag: '', question: '', answer: '', analysis: '' },
    submitting: false,

    // 同类题结果弹窗
    showQuiz: false,
    quizContent: '',
    quizLoading: false
  },

  onLoad() {
    if (!requireLogin()) return
    this.loadSubjects()
    this.loadList(true)
  },

  onPullDownRefresh() {
    Promise.all([this.loadSubjects(), this.loadList(true)])
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
        timeText: shortTime(item.createTime)
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
        } catch (err) {
          // 错误已统一提示
        }
      }
    })
  },

  /** 生成同类题：POST /ai/quiz { wrongQuestionId } */
  async generateQuiz(e) {
    const id = e.currentTarget.dataset.id
    if (this.data.quizLoading) return
    this.setData({ quizLoading: true, showQuiz: true, quizContent: 'AI 正在出题…' })
    try {
      const data = await request({
        url: '/ai/quiz',
        method: 'POST',
        data: { wrongQuestionId: id }
      })
      this.setData({ quizContent: getAiAnswer(data) || '（AI 未返回内容）' })
    } catch (err) {
      this.setData({ quizContent: '出题失败，请稍后重试。' })
    } finally {
      this.setData({ quizLoading: false })
    }
  },

  /** 关闭同类题弹窗 */
  closeQuiz() {
    this.setData({ showQuiz: false, quizContent: '' })
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

  /** 打开新增错题弹窗 */
  openAdd() {
    this.setData({
      showAdd: true,
      form: { subject: this.data.activeSubject || '', tag: '', question: '', answer: '', analysis: '' }
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

  /** 提交新增错题 */
  async submitAdd() {
    const form = this.data.form
    if (!form.subject.trim()) {
      wx.showToast({ title: '请填写学科', icon: 'none' })
      return
    }
    if (!form.question.trim()) {
      wx.showToast({ title: '请填写题目', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      await request({
        url: '/wrong-question',
        method: 'POST',
        data: {
          subject: form.subject.trim(),
          tag: form.tag.trim(),
          question: form.question.trim(),
          answer: form.answer.trim(),
          analysis: form.analysis.trim()
        }
      })
      wx.showToast({ title: '已收录', icon: 'success' })
      this.setData({ showAdd: false })
      this.loadSubjects()
      this.loadList(true)
    } catch (e) {
      // 错误已统一提示
    } finally {
      this.setData({ submitting: false })
    }
  },

  /** 阻止弹窗内部点击穿透到遮罩 */
  stopPropagation() {}
})
