// 登录态工具：token 存 storage（共享约定 #3）
const { request } = require('./request')

function getToken() {
  return wx.getStorageSync('token') || ''
}

function setLogin(token, userInfo) {
  wx.setStorageSync('token', token)
  wx.setStorageSync('userInfo', userInfo)
  getApp().globalData.token = token
  getApp().globalData.userInfo = userInfo
}

function getUserInfo() {
  return getApp().globalData.userInfo || wx.getStorageSync('userInfo') || null
}

function isLoggedIn() {
  return !!getToken()
}

function logout() {
  try {
    require('./chat-manager').close()
  } catch (e) {}
  wx.removeStorageSync('token')
  wx.removeStorageSync('userInfo')
  getApp().globalData.token = ''
  getApp().globalData.userInfo = null
}

/** 需要登录的操作守卫：未登录跳登录页 */
function requireLogin() {
  if (!isLoggedIn()) {
    wx.navigateTo({ url: '/pages/login/login' })
    return false
  }
  return true
}

/**
 * 小程序一键登录：wx.login → code 换 openid 自动建号 → JWT
 */
function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        request({ url: '/auth/wx-login', method: 'POST', data: { code: res.code } })
          .then((data) => {
            setLogin(data.token, data.userInfo)
            resolve(data)
          })
          .catch(reject)
      },
      fail: reject
    })
  })
}

module.exports = {
  getToken,
  setLogin,
  getUserInfo,
  isLoggedIn,
  logout,
  requireLogin,
  wxLogin
}
