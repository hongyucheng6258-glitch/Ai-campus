// 交易互评（分包 pages-idle）：POST /idle/appoint/{id}/review { score, content }
// 仅对已完成（status=3）的预约可评价，评分 1-5 星
const { request } = require('../../utils/request')
const { requireLogin } = require('../../utils/auth')

/** 星级对应的文案，提升可读性 */
const SCORE_TEXT = {
  1: '很不满意',
  2: '不太满意',
  3: '一般',
  4: '比较满意',
  5: '非常满意'
}

Page({
  data: {
    appointmentId: null,  // 预约记录ID
    itemTitle: '',        // 物品标题
    score: 5,             // 评分 1-5
    scoreText: SCORE_TEXT[5],
    stars: [1, 2, 3, 4, 5],
    content: '',          // 评价内容
    submitting: false
  },

  onLoad(options) {
    if (!requireLogin()) return
    const appointmentId = options.appointmentId ? Number(options.appointmentId) : null
    if (!appointmentId) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    this.setData({
      appointmentId,
      itemTitle: options.title ? decodeURIComponent(options.title) : ''
    })
  },

  /** 点击星星打分 */
  chooseScore(e) {
    const score = Number(e.currentTarget.dataset.score)
    this.setData({ score, scoreText: SCORE_TEXT[score] || '' })
  },

  /** 评价内容输入 */
  onInput(e) {
    this.setData({ content: e.detail.value })
  },

  /** 提交评价 */
  async submit() {
    if (!this.data.appointmentId) return
    const content = (this.data.content || '').trim()
    if (content.length > 255) {
      wx.showToast({ title: '评价最长255字', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    if (!requireLogin()) return

    this.setData({ submitting: true })
    try {
      await request({
        url: `/idle/appoint/${this.data.appointmentId}/review`,
        method: 'POST',
        data: { score: this.data.score, content }
      })
      wx.showToast({ title: '评价成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (e) {
      // 重复评价(1005)等错误由 request 统一提示
    } finally {
      this.setData({ submitting: false })
    }
  }
})
