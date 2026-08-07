const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pageDir = __dirname

function read(file) {
  return fs.readFileSync(path.join(pageDir, file), 'utf8')
}

test('message center routes idle notices to my appointments and supports post detail', () => {
  const js = read('message.js')

  assert.match(js, /post: '\/pages-post\/detail\/detail\?id='/)
  assert.match(js, /if \(item\.bizType === 'idle' && item\.bizId\) \{/)
  assert.match(js, /goMyTab\('appoint'\)/)
})
