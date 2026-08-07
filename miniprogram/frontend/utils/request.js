const { getApiBaseUrl } = require('./runtime-config')

function getToken() {
  return wx.getStorageSync('token') || ''
}

function getBaseUrl() {
  const app = typeof getApp === 'function' ? getApp() : null
  if (app && app.globalData && app.globalData.baseUrl) return app.globalData.baseUrl
  return getApiBaseUrl()
}

function request(options) {
  return new Promise((resolve, reject) => {
    const token = getToken()
    wx.request({
      url: getBaseUrl() + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(options.header || {})
      },
      success(res) {
        const body = res.data || {}
        if (body.code === 200) {
          resolve(body.data)
          return
        }
        if (body.code === 401) {
          wx.removeStorageSync('token')
          wx.navigateTo({ url: '/pages/login/login' })
        }
        wx.showToast({ title: body.message || '请求失败', icon: 'none' })
        reject(new Error(body.message || '请求失败'))
      },
      fail(err) {
        wx.showToast({ title: '网络异常', icon: 'none' })
        reject(err)
      }
    })
  })
}

function uploadFile(filePath, type = 'image') {
  return new Promise((resolve, reject) => {
    const token = getToken()
    wx.uploadFile({
      url: `${getBaseUrl()}/upload/${type}`,
      filePath,
      name: 'file',
      header: token ? { Authorization: 'Bearer ' + token } : {},
      success(res) {
        try {
          const body = JSON.parse(res.data)
          if (body.code === 200) {
            resolve(body.data)
            return
          }
          wx.showToast({ title: body.message || '上传失败', icon: 'none' })
          reject(new Error(body.message))
        } catch (e) {
          reject(e)
        }
      },
      fail: reject
    })
  })
}

module.exports = {
  getBaseUrl,
  request,
  uploadFile
}
