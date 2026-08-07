const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pageDir = __dirname

function read(file) {
  return fs.readFileSync(path.join(pageDir, file), 'utf8')
}

test('activity list exposes my signup entry', () => {
  const js = read('list.js')
  const wxml = read('list.wxml')
  const wxss = read('list.wxss')

  assert.match(js, /goMySignups\s*\(\)/)
  assert.match(js, /goMyTab\('signup'\)/)
  assert.match(wxml, /class="tool-bar"/)
  assert.match(wxml, /bindtap="goMySignups"/)
  assert.match(wxss, /\.my-btn\s*\{/)
})
