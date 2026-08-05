// 活动详情（分包 pages-activity）：GET /activity/{id}
// 发布者：查看报名名单 GET /activity/{id}/members、审批 PUT /activity/member/{id}/handle、
//         生成签到码 GET /activity/{id}/signin-qrcode
// 参与者：报名跳 signup 页
const { request } = require('../../utils/request')
const { shortTime, parseImages } = require('../../utils/format')
const { requireLogin } = require('../../utils/auth')
const startChat = require('../../utils/start-chat')

/** 活动状态文案 */
const STATUS_TEXT = { 0: '报名中', 1: '已满员', 2: '已结束', 3: '已下架' }
const STATUS_TYPE = { 0: 'success', 1: 'warning', 2: '', 3: 'danger' }

/** 报名状态文案（Constants.MEMBER_*） */
const MEMBER_TEXT = { 0: '待审批', 1: '已通过', 2: '未通过' }

Page({
  data: {
    id: null,
    detail: null,
    images: [],
    statusText: '',
    statusType: '',
    startTimeText: '',
    endTimeText: '',
    deadlineText: '',
    mySignupText: '',
    loading: true,

    // 发布者：报名名单
    showMembers: false,
    members: [],
    membersLoading: false,

    // 发布者：签到码
    showQr: false,
    qrContent: ''
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
    if (this.data.id) {
      this.loadDetail()
    }
  },

  /** 加载活动详情 */
  async loadDetail() {
    try {
      const data = await request({ url: `/activity/${this.data.id}` })
      const images = data.imageList && data.imageList.length
        ? data.imageList
        : parseImages(data.images)
      this.setData({
        detail: data,
        images,
        statusText: STATUS_TEXT[data.status] || '',
        statusType: STATUS_TYPE[data.status] || '',
        startTimeText: shortTime(data.startTime) || '待定',
        endTimeText: shortTime(data.endTime) || '待定',
        deadlineText: shortTime(data.signupDeadline) || '不限',
        mySignupText: data.mySignupStatus === null || data.mySignupStatus === undefined
          ? ''
          : (MEMBER_TEXT[data.mySignupStatus] || '')
      })
    } catch (e) {
      this.setData({ detail: null })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 预览海报 */
  previewImage(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({ current: this.data.images[index], urls: this.data.images })
  },

  /** 联系活动发起人并创建或复用带活动上下文的会话 */
  contactPublisher() {
    const d = this.data.detail
    if (!d || d.isOwner) return
    startChat(d.userId, { type: 'activity', id: d.id, title: d.title })
  },

  /** 跳转报名页 */
  goSignup() {
    if (!requireLogin()) return
    const d = this.data.detail
    if (!d) return
    if (d.isOwner) {
      wx.showToast({ title: '不能报名自己发起的活动', icon: 'none' })
      return
    }
    if (d.status !== 0) {
      wx.showToast({ title: '该活动已停止报名', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages-activity/signup/signup?id=${d.id}&title=${encodeURIComponent(d.title || '')}`
    })
  },

  /** 跳转扫码签到页 */
  goSignin() {
    if (!requireLogin()) return
    wx.navigateTo({ url: '/pages-activity/signin/signin' })
  },

  /** 发布者：加载报名名单 */
  async loadMembers() {
    if (this.data.membersLoading) return
    this.setData({ membersLoading: true, showMembers: true })
    try {
      const data = await request({ url: `/activity/${this.data.id}/members` })
      const members = (data || []).map((m) => ({
        ...m,
        statusText: MEMBER_TEXT[m.status] || '',
        timeText: shortTime(m.createTime)
      }))
      this.setData({ members })
    } catch (e) {
      this.setData({ members: [] })
    } finally {
      this.setData({ membersLoading: false })
    }
  },

  /** 关闭名单弹窗 */
  closeMembers() {
    this.setData({ showMembers: false })
  },

  /**
   * 发布者审批报名：PUT /activity/member/{id}/handle { approve }
   */
  async handleMember(e) {
    const memberId = Number(e.currentTarget.dataset.id)
    const approve = e.currentTarget.dataset.approve === 'true' || e.currentTarget.dataset.approve === true
    try {
      await request({
        url: `/activity/member/${memberId}/handle`,
        method: 'PUT',
        data: { approve }
      })
      wx.showToast({ title: approve ? '已通过' : '已拒绝', icon: 'success' })
      this.loadMembers()
      this.loadDetail()
    } catch (err) {
      // 错误已统一提示
    }
  },

  /** 发布者：获取签到码内容并展示（格式 campus://signin/{id}/{token}） */
  async showSigninQr() {
    try {
      const data = await request({ url: `/activity/${this.data.id}/signin-qrcode` })
      const qrContent = typeof data === 'string' ? data : (data && data.qrContent) || ''
      if (!qrContent) {
        wx.showToast({ title: '签到内容生成失败，请重试', icon: 'none' })
        return
      }
      this.setData({ qrContent, showQr: true })
    } catch (e) {
      // 错误已统一提示
    }
  },

  /** 关闭签到码弹窗 */
  closeQr() {
    this.setData({ showQr: false })
  },

  /** 复制签到串（现场可用第三方工具生成二维码，或让同学手动录入） */
  copyQr() {
    if (!this.data.qrContent) return
    wx.setClipboardData({
      data: this.data.qrContent,
      success() {
        wx.showToast({ title: '签到串已复制', icon: 'success' })
      }
    })
  },

  /** 阻止弹窗内部点击穿透 */
  stopPropagation() {}
})
