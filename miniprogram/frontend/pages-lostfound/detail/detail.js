// 失物招领详情（分包 pages-lostfound）：GET /lostfound/{id}
// 本人可标记完成：PUT /lostfound/{id}/finish
const { request } = require('../../utils/request')
const { shortTime, parseImages } = require('../../utils/format')
const startChat = require('../../utils/start-chat')

/** 处理状态文案（lost_found.status） */
const STATUS_TEXT = { 0: '寻找中', 1: '已完成', 2: '已下架' }
const STATUS_TYPE = { 0: 'warning', 1: 'success', 2: 'danger' }

Page({
  data: {
    id: null,
    detail: null,
    images: [],
    typeText: '',
    statusText: '',
    statusType: '',
    happenTimeText: '',
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
    this.loadDetail()
  },

  /** 加载详情 */
  async loadDetail() {
    try {
      const data = await request({ url: `/lostfound/${this.data.id}` })
      const images = data.imageList && data.imageList.length
        ? data.imageList
        : parseImages(data.images)
      this.setData({
        detail: data,
        images,
        typeText: data.type === 0 ? '失物' : '招领',
        statusText: STATUS_TEXT[data.status] || '',
        statusType: STATUS_TYPE[data.status] || '',
        happenTimeText: shortTime(data.happenTime) || '未填写',
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

  /** 联系发布者并创建或复用带失物上下文的会话 */
  contactPublisher() {
    const d = this.data.detail
    if (!d || d.isOwner) return
    startChat(d.userId, { type: 'lostfound', id: d.id, title: d.title })
  },

  /** 复制联系方式 */
  copyContact() {
    const contact = this.data.detail && this.data.detail.contact
    if (!contact) {
      wx.showToast({ title: '未提供联系方式', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: contact,
      success() {
        wx.showToast({ title: '联系方式已复制', icon: 'success' })
      }
    })
  },

  /** 本人标记完成（已找回/已归还） */
  finish() {
    const d = this.data.detail
    if (!d || !d.isOwner) return
    wx.showModal({
      title: '提示',
      content: d.type === 0 ? '确认物品已找回？' : '确认物品已归还失主？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request({ url: `/lostfound/${d.id}/finish`, method: 'PUT' })
          wx.showToast({ title: '已标记完成', icon: 'success' })
          this.loadDetail()
        } catch (err) {
          // 错误已统一提示
        }
      }
    })
  }
})
