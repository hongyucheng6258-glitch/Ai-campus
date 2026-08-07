const { request } = require('../../utils/request')
const { getToken, setLogin, logout } = require('../../utils/auth')
const { normalizeUserInfo, normalizeAssetUrl } = require('../../utils/avatar')

Page({
  data: {
    userInfo: null,
    nickname: '',
    phone: '',
    bio: '',
    gender: 0,
    oldPassword: '',
    newPassword: '',
    saving: false,
    uploading: false,
    changingPassword: false
  },

  onShow() {
    this.loadProfile()
  },

  async loadProfile() {
    try {
      const userInfo = normalizeUserInfo(await request({ url: '/user/info' }))
      this.applyUserInfo(userInfo)
    } catch (e) {}
  },

  applyUserInfo(userInfo) {
    setLogin(getToken(), userInfo)
    this.setData({
      userInfo,
      nickname: userInfo.nickname || '',
      phone: userInfo.phone || '',
      bio: userInfo.bio || '',
      gender: userInfo.gender || 0
    })
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    if (key) this.setData({ [key]: e.detail.value })
  },

  onGenderChange(e) {
    this.setData({ gender: Number(e.detail.value) })
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => this.uploadAvatar(res.tempFiles[0].tempFilePath)
    })
  },

  uploadAvatar(filePath) {
    if (this.data.uploading) return
    const app = getApp()
    this.setData({ uploading: true })
    wx.showLoading({ title: '上传中' })
    wx.uploadFile({
      url: app.globalData.baseUrl + '/upload/image',
      filePath,
      name: 'file',
      header: { Authorization: 'Bearer ' + getToken() },
      success: async (res) => {
        try {
          const body = JSON.parse(res.data || '{}')
          if (res.statusCode !== 200 || body.code !== 200) {
            throw new Error(body.message || '头像上传失败')
          }
          const avatar = normalizeAssetUrl(body.data.url, app.globalData.baseUrl)
          const userInfo = await request({
            url: '/user/profile',
            method: 'PUT',
            data: { avatar }
          })
          this.applyUserInfo(normalizeUserInfo(userInfo))
          wx.showToast({ title: '头像已更新', icon: 'success' })
        } catch (e) {
          wx.showToast({ title: e.message || '头像上传失败', icon: 'none' })
        }
      },
      fail: () => wx.showToast({ title: '头像上传失败', icon: 'none' }),
      complete: () => {
        wx.hideLoading()
        this.setData({ uploading: false })
      }
    })
  },

  async saveProfile() {
    if (!this.data.nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    if (this.data.saving) return
    this.setData({ saving: true })
    try {
      const userInfo = await request({
        url: '/user/profile',
        method: 'PUT',
        data: {
          nickname: this.data.nickname.trim(),
          phone: this.data.phone.trim(),
          bio: this.data.bio.trim(),
          gender: this.data.gender
        }
      })
      this.applyUserInfo(normalizeUserInfo(userInfo))
      wx.showToast({ title: '资料已保存', icon: 'success' })
    } catch (e) {
    } finally {
      this.setData({ saving: false })
    }
  },

  async changePassword() {
    const { oldPassword, newPassword } = this.data
    if (!oldPassword) return wx.showToast({ title: '请输入原密码', icon: 'none' })
    if (newPassword.length < 6) return wx.showToast({ title: '新密码至少6位', icon: 'none' })
    if (this.data.changingPassword) return
    this.setData({ changingPassword: true })
    try {
      await request({
        url: '/user/password',
        method: 'PUT',
        data: { oldPassword, newPassword }
      })
      this.setData({ oldPassword: '', newPassword: '' })
      wx.showModal({
        title: '密码修改成功',
        content: '请使用新密码重新登录',
        showCancel: false,
        success: () => {
          logout()
          wx.reLaunch({ url: '/pages/index/index' })
        }
      })
    } catch (e) {
    } finally {
      this.setData({ changingPassword: false })
    }
  }
})
