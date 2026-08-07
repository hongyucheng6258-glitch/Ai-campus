const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pageDir = __dirname

function read(file) {
  return fs.readFileSync(path.join(pageDir, file), 'utf8')
}

test('register page returns to my tab when a pending tab exists', () => {
  const js = read('register.js')

  assert.match(js, /const { peekPendingMyTab } = require\('\.\.\/\.\.\/utils\/tab-navigation'\)/)
  assert.match(js, /function finishRegisterPage\(\)/)
  assert.match(js, /wx\.switchTab\(\{ url: '\/pages\/my\/my' \}\)/)
})
