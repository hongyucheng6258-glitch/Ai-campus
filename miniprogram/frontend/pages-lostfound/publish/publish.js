// 发布失物/招领（分包 pages-lostfound）：POST /lostfound
// type：0=我丢了东西（失物）1=我捡到东西（招领）
const { request } = require('../../utils/request')
const { requireLogin } = require('../../utils/auth')

/**
 * 组合日期与时间为后端 LocalDateTime 可解析的字符串。
 * @param {String} date "2024-06-01"
 * @param {String} time "14:30"
 * @returns {String|null}
 */
function joinDateTime(date, time) {
  if (!date) return null
  return `${date} ${time || '00:00'}:00`
}

Page({
  data: {
    type: 0,          // 0失物 1招领
    title: '',
    description: '',
    location: '',
    contact: '',
    happenDate: '',
    happenTime: '',
    images: [],
    submitting: false
  },

  onLoad(options) {
    requireLogin()
    // 支持从列表页带默认类型进入
    if (options.type === '1') {
      this.setData({ type: 1 })
    }
  },

  /** 切换失物/招领 */
  switchType(e) {
    this.setData({ type: Number(e.currentTarget.dataset.type) })
  },

  /** 文本输入统一处理 */
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  /** 日期/时间选择 */
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
      wx.showToast({ title: '请填写物品名称', icon: 'none' })
      return
    }
    if (title.length > 64) {
      wx.showToast({ title: '标题最长64字', icon: 'none' })
      return
    }
    const contact = (this.data.contact || '').trim()
    if (!contact) {
      wx.showToast({ title: '请填写联系方式', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    if (!requireLogin()) return

    this.setData({ submitting: true })
    try {
      await request({
        url: '/lostfound',
        method: 'POST',
        data: {
          type: this.data.type,
          title,
          description: (this.data.description || '').trim(),
          images: this.data.images,
          location: (this.data.location || '').trim(),
          happenTime: joinDateTime(this.data.happenDate, this.data.happenTime),
          contact
        }
      })
      wx.showModal({
        title: '发布成功',
        content: '信息已提交审核，管理员通过后将展示在失物招领列表中。',
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
