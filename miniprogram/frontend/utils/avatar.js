const { getApiBaseUrl } = require('./runtime-config')

/**
 * 获取小程序后端 baseUrl（app.globalData.baseUrl 未设置时回退 runtime-config）。
 * 注意：不可 require request.js（避免循环依赖）。
 */
function getAppBaseUrl() {
  const app = typeof getApp === 'function' ? getApp() : null
  if (app && app.globalData && app.globalData.baseUrl) return app.globalData.baseUrl
  return getApiBaseUrl()
}

/**
 * 图片 URL 归一化：
 *   1) 后端代理相对路径（/api/assets/...）→ 拼上 baseUrl 主机，得到完整可加载地址；
 *   2) MinIO 原始绝对地址（http://host:9000/...、localhost、127.0.0.1）→ 替换为后端 /api/assets 代理。
 * 已归一化的完整代理地址幂等返回。
 */
function normalizeAssetUrl(url, baseUrl) {
  if (typeof url !== 'string' || !url.trim()) return ''
  const value = url.trim()
  if (/^data:/i.test(value)) return value
  const base = String(baseUrl || getAppBaseUrl()).replace(/\/$/, '')
  // 后端代理相对路径 → 完整地址（baseUrl 形如 http://host:8080/api）
  if (/^\/api\/assets\//.test(value)) {
    const origin = base.replace(/\/api\/?$/, '')
    return origin + value
  }
  if (!/^https?:\/\//i.test(value)) return value

  // 替换本地对象存储主机为后端代理。
  const match = value.match(/^(https?):\/\/([^/:]+)(:\d+)?(\/.*)?$/i)
  if (!match) return value
  const host = (match[2] || '').toLowerCase()
  const port = match[3] || ''
  const path = match[4] || ''
  if (port === ':9000' || host === 'localhost' || host === '127.0.0.1') {
    if (!base) return value
    return `${base}/assets${path}`
  }
  return value
}

function normalizeUserInfo(userInfo) {
  if (!userInfo) return userInfo
  return { ...userInfo, avatar: normalizeAssetUrl(userInfo.avatar, getAppBaseUrl()) }
}

module.exports = { normalizeAssetUrl, normalizeUserInfo, getAppBaseUrl }
