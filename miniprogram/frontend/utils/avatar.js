function normalizeAssetUrl(url, baseUrl) {
  if (typeof url !== 'string' || !url.trim()) return ''
  const value = url.trim()
  if (!/^https?:\/\//i.test(value)) return value

  // 不依赖小程序运行时是否提供 URL 构造器，直接替换本地对象存储主机。
  const match = value.match(/^(https?):\/\/([^/:]+)(:\d+)?(\/.*)?$/i)
  if (!match) return value
  const host = (match[2] || '').toLowerCase()
  const port = match[3] || ''
  const path = match[4] || ''
  if (port === ':9000' || host === 'localhost' || host === '127.0.0.1') {
    const base = String(baseUrl || '').replace(/\/$/, '')
    if (!base) return value
    return `${base}/assets${path}`
  }
  return value
}

function normalizeUserInfo(userInfo) {
  if (!userInfo) return userInfo
  const app = typeof getApp === 'function' ? getApp() : null
  const baseUrl = app && app.globalData ? app.globalData.baseUrl : ''
  return { ...userInfo, avatar: normalizeAssetUrl(userInfo.avatar, baseUrl) }
}

module.exports = { normalizeAssetUrl, normalizeUserInfo }
