// 小程序入口：全局登录态与基础配置
const { getToken } = require('./utils/auth')
const chatManager = require('./utils/chat-manager')
const { normalizeUserInfo } = require('./utils/avatar')
const { getApiBaseUrl } = require('./utils/runtime-config')

App({
  globalData: {
    // 本地开发使用局域网地址访问后端，真机调试时需确保手机与电脑处于同一网络
    baseUrl: getApiBaseUrl(),
    token: '',
    userInfo: null
  },

  onLaunch() {
    // 启动时恢复本地登录态
    this.globalData.baseUrl = getApiBaseUrl()
    this.globalData.token = getToken()
    try {
      this.globalData.userInfo = normalizeUserInfo(wx.getStorageSync('userInfo') || null)
      if (this.globalData.userInfo) wx.setStorageSync('userInfo', this.globalData.userInfo)
    } catch (e) {
      this.globalData.userInfo = null
    }
  },

  onShow() {
    if (getToken()) chatManager.start()
  },

  onHide() {
    chatManager.stop()
  }
})
