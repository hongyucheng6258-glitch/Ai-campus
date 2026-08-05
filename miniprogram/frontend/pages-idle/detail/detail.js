// 闲置详情（分包 pages-idle）：GET /idle/{id}
// 本人可下架（DELETE /idle/{id}），他人可发起预约（跳 appoint 页）
const { request } = require('../../utils/request')
const { shortTime, parseImages } = require('../../utils/format')
const { requireLogin } = require('../../utils/auth')
const startChat = require('../../utils/start-chat')

/** 物品状态文案（idle_item.status） */
const STATUS_TEXT = { 0: '在架', 1: '已预约', 2: '已完成', 3: '已下架' }
const STATUS_TYPE = { 0: 'success', 1: 'warning', 2: '', 3: 'danger' }

Page({
  data: {
    id: null,
    detail: null,
    images: [],
    statusText: '',
    statusType: '',
    createTimeText: '',
    loading: true
  },

  onLoad(options) {
    const id = options.id ? Number(options.id) : null
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      this.setData({ loading: false })
      return
    }
    this.setData({ id })
  },

  onShow() {
    // 预约成功返回后需要刷新状态
    if (this.data.id) {
      this.loadDetail()
    }
  },

  /** 加载详情 */
  async loadDetail() {
    try {
      const data = await request({ url: `/idle/${this.data.id}` })
      const images = data.imageList && data.imageList.length
        ? data.imageList
        : parseImages(data.images)
      this.setData({
        detail: data,
        images,
        statusText: STATUS_TEXT[data.status] || '',
        statusType: STATUS_TYPE[data.status] || '',
        createTimeText: shortTime(data.createTime)
      })
    } catch (e) {
      this.setData({ detail: null })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 预览图片 */
  previewImage(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({ current: this.data.images[index], urls: this.data.images })
  },

  /** 联系卖家并创建或复用带商品上下文的会话 */
  contactPublisher() {
    const d = this.data.detail
    if (!d || d.isOwner) return
    startChat(d.userId, { type: 'idle', id: d.id, title: d.title })
  },

  /** 发起预约（非本人 && 物品在架） */
  goAppoint() {
    if (!requireLogin()) return
    const d = this.data.detail
    if (!d) return
    if (d.isOwner) {
      wx.showToast({ title: '不能预约自己的物品', icon: 'none' })
      return
    }
    if (d.status !== 0) {
      wx.showToast({ title: '该物品当前不可预约', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages-idle/appoint/appoint?id=${d.id}&title=${encodeURIComponent(d.title || '')}`
    })
  },

  /** 去评价（已完成的预约） */
  goReview() {
    const d = this.data.detail
    if (!d || !d.myAppointmentId) return
    wx.navigateTo({
      url: `/pages-idle/review/review?appointmentId=${d.myAppointmentId}&title=${encodeURIComponent(d.title || '')}`
    })
  },

  /** 本人下架物品 */
  offline() {
    const d = this.data.detail
    if (!d || !d.isOwner) return
    wx.showModal({
      title: '提示',
      content: '确定下架该闲置物品吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request({ url: `/idle/${d.id}`, method: 'DELETE' })
          wx.showToast({ title: '已下架', icon: 'success' })
          this.loadDetail()
        } catch (err) {
          // 错误已统一提示
        }
      }
    })
  }
})
