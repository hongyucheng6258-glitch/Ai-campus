// 活动扫码签到（分包 pages-activity）
// wx.scanCode 扫描发起人出示的二维码 → 解析 campus://signin/{activityId}/{token}
// → POST /activity/signin { activityId, token }
// token 为后端 HMAC-SHA256 签名前16位，前端不做任何伪造校验，仅负责解析与提交
const { request } = require('../../utils/request')
const { requireLogin } = require('../../utils/auth')

/** 二维码内容前缀（与后端 SignTokenUtils.QR_PREFIX 保持一致） */
const QR_PREFIX = 'campus://signin/'

Page({
  data: {
    manualInput: '',  // 手动输入的签到串（扫码失败时兜底）
    submitting: false,
    lastResult: ''    // 最近一次签到结果提示
  },

  onLoad() {
    requireLogin()
  },

  /**
   * 解析签到串。
   * @param {String} raw 形如 campus://signin/12/ab12cd34ef56gh78
   * @returns {Object|null} { activityId, token }，格式不合法返回 null
   */
  parseQr(raw) {
    if (!raw || typeof raw !== 'string') return null
    const text = raw.trim()
    if (text.indexOf(QR_PREFIX) !== 0) return null
    const rest = text.slice(QR_PREFIX.length)
    const parts = rest.split('/')
    if (parts.length < 2) return null
    const activityId = Number(parts[0])
    const token = parts[1]
    if (!activityId || !token) return null
    return { activityId, token }
  },

  /** 调起扫码 */
  scan() {
    if (!requireLogin()) return
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode'],
      success: (res) => {
        const parsed = this.parseQr(res.result)
        if (!parsed) {
          wx.showModal({
            title: '二维码无效',
            content: '这不是本平台的活动签到码，请扫描发起人出示的签到二维码。',
            showCancel: false
          })
          return
        }
        this.doSignin(parsed.activityId, parsed.token)
      },
      fail: () => {
        // 用户主动取消扫码，无需提示
      }
    })
  },

  /** 手动输入签到串 */
  onManualInput(e) {
    this.setData({ manualInput: e.detail.value })
  },

  /** 提交手动输入的签到串 */
  submitManual() {
    const parsed = this.parseQr(this.data.manualInput)
    if (!parsed) {
      wx.showToast({ title: '签到串格式不正确', icon: 'none' })
      return
    }
    this.doSignin(parsed.activityId, parsed.token)
  },

  /**
   * 调用签到接口。
   * @param {Number} activityId 活动ID
   * @param {String} token 签名 token
   */
  async doSignin(activityId, token) {
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      await request({
        url: '/activity/signin',
        method: 'POST',
        data: { activityId, token }
      })
      this.setData({ lastResult: `✅ 签到成功（活动ID：${activityId}）`, manualInput: '' })
      wx.showToast({ title: '签到成功', icon: 'success' })
    } catch (e) {
      // 常见失败：报名未通过(403)、重复签到(1005)、二维码无效(400)，
      // 具体文案已由 request 统一 toast，这里只做页面留痕
      this.setData({ lastResult: '❌ 签到失败：' + (e && e.message ? e.message : '请重试') })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
