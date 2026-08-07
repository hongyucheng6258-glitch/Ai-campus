const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pageDir = __dirname

function read(file) {
  return fs.readFileSync(path.join(pageDir, file), 'utf8')
}

test('idle list exposes my appointments entry', () => {
  const js = read('list.js')
  const wxml = read('list.wxml')
  const wxss = read('list.wxss')

  assert.match(js, /goMyAppointments\s*\(\)/)
  assert.match(js, /goMyTab\('appoint'\)/)
  assert.match(wxml, /class="tool-bar"/)
  assert.match(wxml, /bindtap="goMyAppointments"/)
  assert.match(wxss, /\.my-btn\s*\{/)
})
