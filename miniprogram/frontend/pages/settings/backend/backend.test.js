const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pageDir = __dirname

function read(file) {
  return fs.readFileSync(path.join(pageDir, file), 'utf8')
}

test('后端设置页绑定 runtime-config', () => {
  const js = read('backend.js')
  const wxml = read('backend.wxml')

  assert.match(js, /getApiBaseUrl/)
  assert.match(js, /setApiBaseUrl/)
  assert.match(js, /resetApiBaseUrl/)
  assert.match(wxml, /api_base_url/)
  assert.match(wxml, /恢复默认/)
  assert.match(wxml, /保存/)
})
