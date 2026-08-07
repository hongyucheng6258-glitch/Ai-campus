const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pageDir = __dirname

function read(file) {
  return fs.readFileSync(path.join(pageDir, file), 'utf8')
}

test('私信发送栏为图片按钮、弹性输入框和发送按钮分配合理宽度', () => {
  const wxml = read('room.wxml')
  const wxss = read('room.wxss')

  assert.match(wxml, /placeholder="输入消息…"/)
  assert.match(wxml, /class="composer-input"/)
  assert.match(wxml, /class="composer-textarea"/)
  assert.match(wxml, /class="composer-action composer-action--image"/)
  assert.match(wxml, /class="composer-action composer-action--send"/)
  assert.match(wxss, /\.composer-input\s*\{[^}]*flex:\s*1;/s)
  assert.match(wxss, /\.composer-action\s*\{[^}]*flex-shrink:\s*0;/s)
  assert.match(wxss, /\.composer-action--image\s*\{[^}]*flex-basis:\s*104rpx;/s)
  assert.match(wxss, /\.composer-action--send\s*\{[^}]*flex-basis:\s*112rpx;/s)
  assert.match(wxss, /\.composer-textarea\s*\{[^}]*flex:\s*1;/s)
  assert.match(wxss, /\.composer-textarea\s*\{[^}]*min-width:\s*0;/s)
})
