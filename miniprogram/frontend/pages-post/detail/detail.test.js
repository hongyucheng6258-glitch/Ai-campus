const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pageDir = __dirname

function read(file) {
  return fs.readFileSync(path.join(pageDir, file), 'utf8')
}

test('post detail opens chat through startChat context', () => {
  const js = read('detail.js')

  assert.match(js, /const startChat = require\('\.\.\/\.\.\/utils\/start-chat'\)/)
  assert.match(js, /goChat\s*\(\)/)
  assert.match(js, /startChat\(post\.userId, \{ type: 'post', id: post\.id, title \}\)/)
  assert.match(js, /title = String\(post\.content \|\| ''\)\.trim\(\)\.slice\(0, 60\) \|\|/)
})
