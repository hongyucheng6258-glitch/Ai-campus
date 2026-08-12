const { getApiBaseUrl } = require('./runtime-config')
const { normalizeAssetUrl } = require('./avatar')

function getToken() {
  return wx.getStorageSync('token') || ''
}

function getBaseUrl() {
  const app = typeof getApp === 'function' ? getApp() : null
  if (app && app.globalData && app.globalData.baseUrl) return app.globalData.baseUrl
  return getApiBaseUrl()
}

/** 清理 undefined 字段：微信 wx.request 会把 undefined 序列化为字符串 "undefined"，
 *  导致后端收到字面量 "undefined" 参数（如 keyword=undefined 过滤掉所有数据）。 */
function cleanData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data
  const out = {}
  Object.keys(data).forEach((k) => {
    if (data[k] !== undefined && data[k] !== null) out[k] = data[k]
  })
  return out
}

/**
 * 响应数据统一 URL 归一化（递归）：
 * 数据库/后端返回的图片地址可能是
 *   1) MinIO 原始绝对地址（http://host:9000/...、localhost、127.0.0.1）→ 替换为后端 /api/assets 代理；
 *   2) 后端代理相对路径（/api/assets/...）→ 拼上 baseUrl 主机，得到完整可加载地址。
 * 真机上 localhost 指向手机自身、9000 端口不一定可达，统一走后端 8080 即可显示。
 */
function normalizeDeep(value, baseUrl) {
  if (typeof value === 'string') {
    if (/^\/api\/assets\//.test(value)) {
      // 相对代理路径 → 完整地址（baseUrl 形如 http://host:8080/api）
      const origin = String(baseUrl || '').replace(/\/api\/?$/, '')
      return origin + value
    }
    return normalizeAssetUrl(value, baseUrl)
  }
  if (Array.isArray(value)) {
    return value.map((v) => normalizeDeep(v, baseUrl))
  }
  if (value && typeof value === 'object') {
    const out = {}
    Object.keys(value).forEach((k) => {
      out[k] = normalizeDeep(value[k], baseUrl)
    })
    return out
  }
  return value
}

function request(options) {
  return new Promise((resolve, reject) => {
    const token = getToken()
    wx.request({
      url: getBaseUrl() + options.url,
      method: options.method || 'GET',
      data: cleanData(options.data || {}),
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(options.header || {})
      },
      success(res) {
        const body = res.data || {}
        if (body.code === 200) {
          // 统一把 MinIO 原始 URL 替换为后端代理地址
          resolve(normalizeDeep(body.data, getBaseUrl()))
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
            // 上传返回的 URL 同样归一化为后端代理地址
            resolve(normalizeDeep(body.data, getBaseUrl()))
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
