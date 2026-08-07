const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pageDir = __dirname

function read(file) {
  return fs.readFileSync(path.join(pageDir, file), 'utf8')
}

test('post square chat button opens post context chat', () => {
  const js = read('square.js')
  const wxml = read('square.wxml')

  assert.match(js, /const startChat = require\('\.\.\/\.\.\/utils\/start-chat'\)/)
  assert.match(js, /goChat\s*\(e\)/)
  assert.match(js, /const index = e\.currentTarget\.dataset\.index/)
  assert.match(js, /startChat\(post\.userId, \{ type: 'post', id: post\.id, title \}\)/)
  assert.match(wxml, /data-index="{{index}}"/)
  assert.match(wxml, /catchtap="goChat"/)
})
