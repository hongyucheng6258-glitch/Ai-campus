// 小程序入口：全局登录态与基础配置
const { getToken } = require('./utils/auth')
const chatManager = require('./utils/chat-manager')

App({
  globalData: {
    // 后端地址（本地联调；真机预览需改为局域网IP或部署地址，且需在mp后台配置合法域名）
    baseUrl: 'http://localhost:8080/api',
    token: '',
    userInfo: null
  },

  onLaunch() {
    // 启动时恢复本地登录态
    this.globalData.token = getToken()
    try {
      this.globalData.userInfo = wx.getStorageSync('userInfo') || null
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
