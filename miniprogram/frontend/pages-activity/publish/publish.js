// 发布活动（分包 pages-activity）：POST /activity
// 时间字段后端为 LocalDateTime，统一提交 "yyyy-MM-dd HH:mm:ss" 字符串
const { request } = require('../../utils/request')
const { requireLogin } = require('../../utils/auth')

/** 活动分类（与列表页一致，去掉"全部"） */
const CATEGORIES = ['学习竞赛', '文体活动', '志愿公益', '社团招新', '讲座沙龙', '其他']

/**
 * 组合日期与时间为后端可解析的字符串。
 * @param {String} date "2024-06-01"
 * @param {String} time "14:30"
 * @returns {String} "2024-06-01 14:30:00"，任一为空返回 null
 */
function joinDateTime(date, time) {
  if (!date || !time) return null
  return `${date} ${time}:00`
}

Page({
  data: {
    categories: CATEGORIES,
    categoryIndex: 0,
    title: '',
    description: '',
    location: '',
    maxMembers: '',
    images: [],
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    deadlineDate: '',
    deadlineTime: '',
    submitting: false
  },

  onLoad() {
    requireLogin()
  },

  /** 文本输入统一处理 */
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  /** 分类选择 */
  onCategoryChange(e) {
    this.setData({ categoryIndex: Number(e.detail.value) })
  },

  /** 日期/时间选择器统一处理（data-field 指定要写入的字段） */
  onDateTimeChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  /** upload-grid 图片变更回调 */
  onImagesChange(e) {
    this.setData({ images: e.detail || [] })
  },

  /** 提交发布 */
  async submit() {
    const title = (this.data.title || '').trim()
    if (!title) {
      wx.showToast({ title: '请填写活动标题', icon: 'none' })
      return
    }
    if (title.length > 64) {
      wx.showToast({ title: '标题最长64字', icon: 'none' })
      return
    }
    const startTime = joinDateTime(this.data.startDate, this.data.startTime)
    const endTime = joinDateTime(this.data.endDate, this.data.endTime)
    const signupDeadline = joinDateTime(this.data.deadlineDate, this.data.deadlineTime)
    if (!startTime) {
      wx.showToast({ title: '请选择开始时间', icon: 'none' })
      return
    }
    if (!endTime) {
      wx.showToast({ title: '请选择结束时间', icon: 'none' })
      return
    }
    if (!signupDeadline) {
      wx.showToast({ title: '请选择报名截止时间', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    if (!requireLogin()) return

    this.setData({ submitting: true })
    try {
      await request({
        url: '/activity',
        method: 'POST',
        data: {
          title,
          description: (this.data.description || '').trim(),
          images: this.data.images,
          category: this.data.categories[this.data.categoryIndex],
          location: (this.data.location || '').trim(),
          startTime,
          endTime,
          signupDeadline,
          // 0 表示不限人数
          maxMembers: Number(this.data.maxMembers) || 0
        }
      })
      wx.showModal({
        title: '发布成功',
        content: '活动已提交审核，管理员通过后即可被同学看到并报名。',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
    } catch (e) {
      // 错误由 request 统一提示
    } finally {
      this.setData({ submitting: false })
    }
  }
})
