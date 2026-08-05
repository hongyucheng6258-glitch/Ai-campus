// 登录页：wx.login 一键登录 + 绑定学号（账号合并 A3）
const { wxLogin } = require('../../utils/auth')
const { request } = require('../../utils/request')
const { setLogin } = require('../../utils/auth')

Page({
  data: {
    showBind: false,
    studentNo: '',
    password: '',
    phone: ''
  },

  // 一键登录：code 换 openid 自动建号
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
        wx.navigateBack()
      }
    } catch (e) {
      wx.hideLoading()
    }
  },

  // 绑定学号（若学号已有 Web 账号需密码校验，合并账号）
  async bind() {
    if (!this.data.studentNo) {
      wx.showToast({ title: '请输入学号', icon: 'none' })
      return
    }
    try {
      const data = await request({
        url: '/auth/wx-bind',
        method: 'POST',
        data: {
          studentNo: this.data.studentNo,
          password: this.data.password,
          phone: this.data.phone
        }
      })
      setLogin(data.token, data.userInfo)
      wx.showToast({ title: '绑定成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (e) {
      // 错误提示已由 request 统一弹出
    }
  },

  skipBind() {
    wx.navigateBack()
  }
})
