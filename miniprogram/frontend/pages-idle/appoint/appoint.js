// 发起闲置预约（分包 pages-idle）：POST /idle/{id}/appoint { message }
// 提交后后端会给卖家推送站内消息（MSG_INTERACT）
const { request } = require('../../utils/request')
const { requireLogin } = require('../../utils/auth')

/** 常用留言模板，方便手机端快速填写 */
const TEMPLATES = [
  '同学你好，我想用我的物品和你交换，方便约个时间面交吗？',
  '这件东西还在吗？我在图书馆附近，随时可以取。',
  '我很需要这个，可以详细聊聊成新度吗？'
]

Page({
  data: {
    id: null,          // 闲置物品ID
    itemTitle: '',     // 物品标题（列表页带过来，用于展示）
    message: '',       // 预约留言
    templates: TEMPLATES,
    submitting: false
  },

  onLoad(options) {
    if (!requireLogin()) return
    const id = options.id ? Number(options.id) : null
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    this.setData({
      id,
      itemTitle: options.title ? decodeURIComponent(options.title) : ''
    })
  },

  /** 留言输入 */
  onInput(e) {
    this.setData({ message: e.detail.value })
  },

  /** 选择留言模板 */
  useTemplate(e) {
    this.setData({ message: this.data.templates[e.currentTarget.dataset.index] })
  },

  /** 提交预约 */
  async submit() {
    if (!this.data.id) return
    const message = (this.data.message || '').trim()
    if (!message) {
      wx.showToast({ title: '请填写留言', icon: 'none' })
      return
    }
    if (message.length > 255) {
      wx.showToast({ title: '留言最长255字', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    if (!requireLogin()) return

    this.setData({ submitting: true })
    try {
      await request({
        url: `/idle/${this.data.id}/appoint`,
        method: 'POST',
        data: { message }
      })
      wx.showModal({
        title: '预约成功',
        content: '已通知对方，请在「我的-我的预约」中查看进度。',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
    } catch (e) {
      // 重复预约(1005)等错误由 request 统一提示
    } finally {
      this.setData({ submitting: false })
    }
  }
})
