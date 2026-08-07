const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pageDir = __dirname

function read(file) {
  return fs.readFileSync(path.join(pageDir, file), 'utf8')
}

test('chat room opens linked business context including post square', () => {
  const js = read('room.js')

  assert.match(js, /post: '\/pages-post\/square\/square'/)
  assert.match(js, /if \(c\.contextType === 'post'\) \{/)
  assert.match(js, /wx\.navigateTo\(\{ url: map\.post \}\)/)
})
