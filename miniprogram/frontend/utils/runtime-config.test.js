const assert = require('node:assert/strict')
const test = require('node:test')

function loadModule(initialStorage = {}) {
  const storage = { ...initialStorage }
  global.wx = {
    getStorageSync(key) {
      return storage[key]
    },
    setStorageSync(key, value) {
      storage[key] = value
    },
    removeStorageSync(key) {
      delete storage[key]
    }
  }
  global.getApp = () => ({ globalData: {} })
  delete require.cache[require.resolve('./runtime-config')]
  const mod = require('./runtime-config')
  return {
    mod,
    storage,
    cleanup() {
      delete global.wx
      delete global.getApp
    }
  }
}

test('runtime config normalizes and falls back', () => {
  const { mod, cleanup } = loadModule()
  try {
    assert.equal(mod.normalizeBaseUrl('192.168.10.105:8080'), 'http://192.168.10.105:8080/api')
    assert.equal(mod.normalizeBaseUrl('192.168.10.105:8080/api/'), 'http://192.168.10.105:8080/api')
    assert.equal(mod.normalizeBaseUrl('https://example.com/api///'), 'https://example.com/api')
    assert.equal(mod.normalizeBaseUrl('https://example.com'), 'https://example.com/api')
    assert.equal(mod.getApiBaseUrl(), 'http://192.168.10.105:8080/api')
  } finally {
    cleanup()
  }
})

test('runtime config persists and clears api base url', () => {
  const { mod, storage, cleanup } = loadModule()
  try {
    assert.equal(mod.setApiBaseUrl('192.168.10.105:8080'), 'http://192.168.10.105:8080/api')
    assert.equal(storage[mod.STORAGE_KEY], 'http://192.168.10.105:8080/api')
    assert.equal(mod.resetApiBaseUrl(), 'http://192.168.10.105:8080/api')
    assert.equal(storage[mod.STORAGE_KEY], undefined)
  } finally {
    cleanup()
  }
})

test('runtime config migrates legacy defaults', () => {
  const { mod, storage, cleanup } = loadModule({
    [require('./runtime-config').STORAGE_KEY]: 'http://127.0.0.1:8080/api'
  })
  try {
    assert.equal(mod.getApiBaseUrl(), 'http://192.168.10.105:8080/api')
    assert.equal(storage[mod.STORAGE_KEY], 'http://192.168.10.105:8080/api')
  } finally {
    cleanup()
  }
})
