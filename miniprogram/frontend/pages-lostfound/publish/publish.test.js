const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const source = fs.readFileSync(path.join(__dirname, 'publish.js'), 'utf8')

function joinDateTime(date, time) {
  if (!date) return null
  return `${date}T${time || '00:00'}:00`
}

test('失物招领时间应使用ISO格式提交给LocalDateTime', () => {
  const oldValue = joinDateTime('2026-08-06', '14:30')
  assert.equal(oldValue, '2026-08-06T14:30:00')
  assert.match(source, /return `\$\{date\}T\$\{time \|\| '00:00'\}:00`/)
})
