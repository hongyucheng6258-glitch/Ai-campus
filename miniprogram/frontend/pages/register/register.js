const { request } = require('../../utils/request')
const { setLogin } = require('../../utils/auth')
const { peekPendingMyTab } = require('../../utils/tab-navigation')

function finishRegisterPage() {
  if (peekPendingMyTab()) {
    wx.switchTab({ url: '/pages/my/my' })
    return
  }
  wx.navigateBack()
}

Page({
  data: {
    studentNo: '',
    nickname: '',
    password: '',
    confirmPassword: '',
    registering: false
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    if (key) this.setData({ [key]: e.detail.value })
  },

  async register() {
    const { studentNo, nickname, password, confirmPassword } = this.data
    if (!studentNo.trim()) return wx.showToast({ title: '请输入学号', icon: 'none' })
    if (!nickname.trim()) return wx.showToast({ title: '请输入昵称', icon: 'none' })
    if (password.length < 6) return wx.showToast({ title: '密码至少6位', icon: 'none' })
    if (password !== confirmPassword) return wx.showToast({ title: '两次密码不一致', icon: 'none' })
    if (this.data.registering) return

    this.setData({ registering: true })
    wx.showLoading({ title: '注册中' })
    try {
      const data = await request({
        url: '/auth/register',
        method: 'POST',
        data: { studentNo: studentNo.trim(), nickname: nickname.trim(), password }
      })
      setLogin(data.token, data.userInfo)
      wx.showToast({ title: '注册成功', icon: 'success' })
      setTimeout(() => finishRegisterPage(), 500)
    } catch (e) {
      // request 已展示后端返回的具体错误
    } finally {
      wx.hideLoading()
      this.setData({ registering: false })
    }
  }
})
