// 登录页：学号密码登录为主，微信登录为备用入口
const { wxLogin, setLogin } = require('../../utils/auth')
const { request } = require('../../utils/request')
const { peekPendingMyTab } = require('../../utils/tab-navigation')

function finishLoginPage() {
  if (peekPendingMyTab()) {
    wx.switchTab({ url: '/pages/my/my' })
    return
  }
  wx.navigateBack()
}

Page({
  data: {
    showBind: false,
    studentNo: '',
    password: '',
    bindStudentNo: '',
    bindPassword: '',
    bindPhone: '',
    loggingIn: false
  },

  // 学号密码登录：与 Web 端共用 /auth/login 和同一用户数据
  async accountLogin() {
    const studentNo = this.data.studentNo.trim()
    const password = this.data.password
    if (!studentNo) {
      wx.showToast({ title: '请输入学号', icon: 'none' })
      return
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    if (this.data.loggingIn) return
    this.setData({ loggingIn: true })
    wx.showLoading({ title: '登录中' })
    try {
      const data = await request({
        url: '/auth/login',
        method: 'POST',
        data: { studentNo, password }
      })
      setLogin(data.token, data.userInfo)
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => finishLoginPage(), 500)
    } catch (e) {
      // 具体错误已由 request 使用后端 message 提示
    } finally {
      wx.hideLoading()
      this.setData({ loggingIn: false })
    }
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' })
  },

  // 微信一键登录：code 换 openid，未绑定时可继续合并 Web 账号
  async oneTapLogin() {
    wx.showLoading({ title: '登录中' })
    try {
      await wxLogin()
      wx.hideLoading()
      wx.showToast({ title: '登录成功', icon: 'success' })
      // 未绑定学号时提示绑定（可与 Web 账号合并）
      const userInfo = getApp().globalData.userInfo
      if (userInfo && !userInfo.studentNo) {
        this.setData({ showBind: true })
      } else {
        finishLoginPage()
      }
    } catch (e) {
      wx.hideLoading()
    }
  },

  // 同步绑定表单输入值，确保 bind() 能读取到最新内容
  onInput(e) {
    const key = e.currentTarget.dataset.key
    if (key) this.setData({ [key]: e.detail.value })
  },

  // 绑定学号（若学号已有 Web 账号需密码校验，合并账号）
  async bind() {
    const studentNo = this.data.bindStudentNo.trim()
    if (!studentNo) {
      wx.showToast({ title: '请输入学号', icon: 'none' })
      return
    }
    try {
      const data = await request({
        url: '/auth/wx-bind',
        method: 'POST',
        data: {
          studentNo,
          password: this.data.bindPassword,
          phone: this.data.bindPhone
        }
      })
      setLogin(data.token, data.userInfo)
      wx.showToast({ title: '绑定成功', icon: 'success' })
      setTimeout(() => finishLoginPage(), 800)
    } catch (e) {
      // 错误提示已由 request 统一弹出
    }
  },

  skipBind() {
    wx.navigateBack()
  }
})
