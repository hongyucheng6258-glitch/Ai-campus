const {
  DEFAULT_BASE_URL,
  PRESET_ENVIRONMENTS,
  getApiBaseUrl,
  normalizeBaseUrl,
  resetApiBaseUrl,
  setApiBaseUrl
} = require('../../../utils/runtime-config')

Page({
  data: {
    apiBaseUrl: DEFAULT_BASE_URL,
    presets: PRESET_ENVIRONMENTS,
    activePreset: -1,
    saving: false
  },

  onShow() {
    const current = getApiBaseUrl()
    const activeIndex = PRESET_ENVIRONMENTS.findIndex(p => p.value === current)
    this.setData({ apiBaseUrl: current, activePreset: activeIndex })
  },

  onInput(e) {
    const value = e.detail.value
    const activeIndex = PRESET_ENVIRONMENTS.findIndex(p => p.value === value)
    this.setData({ apiBaseUrl: value, activePreset: activeIndex })
  },

  selectPreset(e) {
    const index = e.currentTarget.dataset.index
    const preset = PRESET_ENVIRONMENTS[index]
    if (!preset) return
    this.setData({ apiBaseUrl: preset.value, activePreset: index })
  },

  save() {
    if (this.data.saving) return
    const apiBaseUrl = normalizeBaseUrl(this.data.apiBaseUrl)
    const activeIndex = PRESET_ENVIRONMENTS.findIndex(p => p.value === apiBaseUrl)
    this.setData({ saving: true, apiBaseUrl, activePreset: activeIndex })
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
    const activeIndex = PRESET_ENVIRONMENTS.findIndex(p => p.value === apiBaseUrl)
    this.setData({ apiBaseUrl, activePreset: activeIndex })
    wx.showToast({ title: '已恢复默认', icon: 'success' })
  }
})
