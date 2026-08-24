const STORAGE_KEY = 'api_base_url'
const DEFAULT_BASE_URL = 'http://43.143.248.211/api'

// 预设环境列表，供设置页面快速选择
const PRESET_ENVIRONMENTS = [
  { label: '生产环境（已部署）', value: 'http://43.143.248.211/api' },
  { label: '本地开发', value: 'http://127.0.0.1:8080/api' },
  { label: '局域网调试', value: 'http://192.168.10.105:8080/api' }
]

const LEGACY_BASE_URLS = new Set([
  'http://127.0.0.1:8080/api',
  'http://192.168.12.30:8080/api'
])

function getWx() {
  return typeof wx !== 'undefined' ? wx : null
}

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return DEFAULT_BASE_URL
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`
  const normalized = withScheme.replace(/\/+$/, '')
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`
}

function getStoredBaseUrl() {
  try {
    const wxApi = getWx()
    const value = wxApi ? wxApi.getStorageSync(STORAGE_KEY) : ''
    if (!value) return DEFAULT_BASE_URL
    const baseUrl = normalizeBaseUrl(value)
    if (LEGACY_BASE_URLS.has(baseUrl) && wxApi) {
      wxApi.setStorageSync(STORAGE_KEY, DEFAULT_BASE_URL)
      return DEFAULT_BASE_URL
    }
    return baseUrl
  } catch (e) {
    return DEFAULT_BASE_URL
  }
}

function syncAppBaseUrl(baseUrl) {
  try {
    const app = typeof getApp === 'function' ? getApp() : null
    if (app && app.globalData) {
      app.globalData.baseUrl = baseUrl
    }
  } catch (e) {}
}

function getApiBaseUrl() {
  return getStoredBaseUrl()
}

function setApiBaseUrl(value) {
  const baseUrl = normalizeBaseUrl(value)
  const wxApi = getWx()
  if (wxApi) wxApi.setStorageSync(STORAGE_KEY, baseUrl)
  syncAppBaseUrl(baseUrl)
  return baseUrl
}

function resetApiBaseUrl() {
  try {
    const wxApi = getWx()
    if (wxApi) wxApi.removeStorageSync(STORAGE_KEY)
  } catch (e) {}
  syncAppBaseUrl(DEFAULT_BASE_URL)
  return DEFAULT_BASE_URL
}

module.exports = {
  DEFAULT_BASE_URL,
  PRESET_ENVIRONMENTS,
  STORAGE_KEY,
  getApiBaseUrl,
  normalizeBaseUrl,
  resetApiBaseUrl,
  setApiBaseUrl
}
