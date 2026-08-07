const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pageDir = __dirname

function read(file) {
  return fs.readFileSync(path.join(pageDir, file), 'utf8')
}

test('my page supports buyer/seller appoint tabs', () => {
  const js = read('my.js')
  const wxml = read('my.wxml')

  assert.match(js, /appointRole: 'buyer'/)
  assert.match(js, /params\.role = this\.data\.appointRole/)
  assert.match(js, /switchAppointRole\s*\(e\)/)
  assert.match(wxml, /data-role="buyer"/)
  assert.match(wxml, /data-role="seller"/)
})

test('seller pending appointments show accept/reject actions', () => {
  const js = read('my.js')
  const wxml = read('my.wxml')

  assert.match(wxml, /item\.appointStatus === 0 && item\.appointRole === 'seller'/)
  assert.match(wxml, /catchtap="handleAppoint"/)
  assert.match(js, /`\/idle\/appoint\/\$\{appointmentId\}\/handle`/)
  assert.match(js, /method: 'PUT'/)
})

test('accepted appoints show finish action', () => {
  const js = read('my.js')
  const wxml = read('my.wxml')

  assert.match(wxml, /item\.appointStatus === 1/)
  assert.match(wxml, /catchtap="finishAppoint"/)
  assert.match(js, /`\/idle\/appoint\/\$\{appointmentId\}\/finish`/)
})

test('finished appoints can jump to review', () => {
  const js = read('my.js')
  const wxml = read('my.wxml')

  assert.match(wxml, /item\.appointStatus === 3 && !item\.reviewed/)
  assert.match(wxml, /去评价/)
  assert.match(js, /reviewed: !!item\.reviewed/)
})

test('my page consumes pending tab before refresh', () => {
  const js = read('my.js')

  assert.match(js, /consumePendingMyTab/)
  assert.match(js, /pendingTab && pendingTab !== this\.data\.activeTab/)
  assert.match(js, /refreshPage\(\)/)
})

test('my page exposes backend settings entry', () => {
  const js = read('my.js')
  const wxml = read('my.wxml')

  assert.match(js, /pages\/settings\/backend\/backend/)
  assert.match(wxml, /wx:for="\{\{entries\}\}"/)
})

test('backend settings entry bypasses the login guard', () => {
  const js = read('my.js')

  assert.match(js, /url === '\/pages\/settings\/backend\/backend'/)
})
