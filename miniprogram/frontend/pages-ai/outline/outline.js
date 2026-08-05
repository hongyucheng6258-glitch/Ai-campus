// 复习提纲生成（分包 pages-ai）：POST /ai/outline { subject, chapter, topic } → { answer }
const { request } = require('../../utils/request')
const { requireLogin } = require('../../utils/auth')

/** 演示用示例，答辩时可一键填充 */
const SAMPLES = [
  { subject: '数据结构', chapter: '第6章 树与二叉树', topic: '二叉树的遍历与线索化' },
  { subject: '计算机网络', chapter: '第3章 数据链路层', topic: 'CSMA/CD 与滑动窗口协议' },
  { subject: '软件工程', chapter: '第4章 需求分析', topic: '用例建模与需求规格说明书' }
]

Page({
  data: {
    subject: '',   // 学科（必填）
    chapter: '',   // 章节（选填）
    topic: '',     // 主题（必填）
    answer: '',    // 生成的提纲
    loading: false,
    samples: SAMPLES
  },

  onLoad() {
    requireLogin()
  },

  /** 表单输入统一处理 */
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  /** 一键填入示例 */
  fillSample(e) {
    const sample = this.data.samples[e.currentTarget.dataset.index]
    if (!sample) return
    this.setData({
      subject: sample.subject,
      chapter: sample.chapter,
      topic: sample.topic
    })
  },

  /** 提交生成请求 */
  async submit() {
    const subject = (this.data.subject || '').trim()
    const topic = (this.data.topic || '').trim()
    if (!subject) {
      wx.showToast({ title: '请填写学科', icon: 'none' })
      return
    }
    if (!topic) {
      wx.showToast({ title: '请填写复习主题', icon: 'none' })
      return
    }
    if (this.data.loading) return
    if (!requireLogin()) return

    this.setData({ loading: true, answer: '' })
    wx.showLoading({ title: '生成中…', mask: true })
    try {
      const data = await request({
        url: '/ai/outline',
        method: 'POST',
        data: { subject, chapter: (this.data.chapter || '').trim(), topic }
      })
      this.setData({ answer: data.answer || '（AI 未返回内容）' })
    } catch (e) {
      this.setData({ answer: '' })
    } finally {
      wx.hideLoading()
      this.setData({ loading: false })
    }
  },

  /** 复制提纲 */
  copyAnswer() {
    if (!this.data.answer) return
    wx.setClipboardData({
      data: this.data.answer,
      success() {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
      }
    })
  },

  /** 清空 */
  reset() {
    this.setData({ subject: '', chapter: '', topic: '', answer: '' })
  }
})
