const {
  DEFAULT_BASE_URL,
  getApiBaseUrl,
  normalizeBaseUrl,
  resetApiBaseUrl,
  setApiBaseUrl
} = require('../../../utils/runtime-config')

Page({
  data: {
    apiBaseUrl: DEFAULT_BASE_URL,
    saving: false
  },

  onShow() {
    this.setData({ apiBaseUrl: getApiBaseUrl() })
  },

  onInput(e) {
    this.setData({ apiBaseUrl: e.detail.value })
  },

  save() {
    if (this.data.saving) return
    const apiBaseUrl = normalizeBaseUrl(this.data.apiBaseUrl)
    this.setData({ saving: true, apiBaseUrl })
    try {
      const saved = setApiBaseUrl(apiBaseUrl)
      this.setData({ apiBaseUrl: saved })
      wx.showToast({ title: '已保存', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  reset() {
    if (this.data.saving) return
    const apiBaseUrl = resetApiBaseUrl()
    this.setData({ apiBaseUrl })
    wx.showToast({ title: '已恢复默认', icon: 'success' })
  }
})
