// 网络请求封装：统一携带 JWT，解包 R 响应体（共享约定 #1）
function getToken() {
  return wx.getStorageSync('token') || ''
}

function getBaseUrl() {
  const app = getApp()
  return app && app.globalData ? app.globalData.baseUrl : 'http://localhost:8080/api'
}

/**
 * 发起请求（Promise 封装 wx.request）。
 * @param {Object} options { url, method, data, header }
 */
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
        } else {
          // 401 跳登录页
          if (body.code === 401) {
            wx.removeStorageSync('token')
            wx.navigateTo({ url: '/pages/login/login' })
          }
          wx.showToast({ title: body.message || '请求失败', icon: 'none' })
          reject(new Error(body.message || '请求失败'))
        }
      },
      fail(err) {
        wx.showToast({ title: '网络异常', icon: 'none' })
        reject(err)
      }
    })
  })
}

/**
 * 上传文件到 /upload/*，返回 { url }
 * @param {String} filePath 本地临时路径
 * @param {String} type image|file
 */
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
          } else {
            wx.showToast({ title: body.message || '上传失败', icon: 'none' })
            reject(new Error(body.message))
          }
        } catch (e) {
          reject(e)
        }
      },
      fail: reject
    })
  })
}

module.exports = {
  request,
  uploadFile,
  getBaseUrl
}
