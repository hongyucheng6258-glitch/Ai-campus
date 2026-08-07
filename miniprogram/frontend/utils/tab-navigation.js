const { isLoggedIn } = require('./auth')

const MY_TAB_STORAGE_KEY = 'my_active_tab'
const MY_TAB_PAGE = '/pages/my/my'
const LOGIN_PAGE = '/pages/login/login'

function goMyTab(tab) {
  if (tab) {
    wx.setStorageSync(MY_TAB_STORAGE_KEY, tab)
  }
  if (isLoggedIn()) {
    wx.switchTab({ url: MY_TAB_PAGE })
    return
  }
  wx.navigateTo({ url: LOGIN_PAGE })
}

function peekPendingMyTab() {
  return wx.getStorageSync(MY_TAB_STORAGE_KEY) || ''
}

function consumePendingMyTab() {
  const tab = peekPendingMyTab()
  if (tab) {
    wx.removeStorageSync(MY_TAB_STORAGE_KEY)
  }
  return tab
}

module.exports = {
  MY_TAB_STORAGE_KEY,
  consumePendingMyTab,
  goMyTab,
  peekPendingMyTab
}
