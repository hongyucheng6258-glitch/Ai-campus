const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pageDir = __dirname

function read(file) {
  return fs.readFileSync(path.join(pageDir, file), 'utf8')
}

test('详情页展示卖家待处理预约卡片（含接受/拒绝按钮）', () => {
  const wxml = read('detail.wxml')

  assert.match(wxml, /detail\.isOwner && detail\.pendingAppointment/)
  assert.match(wxml, /pendingAppointment\.buyerNickname/)
  assert.match(wxml, /pending-avatar/)
  assert.match(wxml, /bindtap="handleAppoint" data-accept="false"/)
  assert.match(wxml, /bindtap="handleAppoint" data-accept="true"/)
})

test('详情页已接受预约显示确认完成按钮', () => {
  const wxml = read('detail.wxml')
  const js = read('detail.js')

  assert.match(wxml, /pendingAppointment\.status === 1/)
  assert.match(wxml, /bindtap="finishAppoint"/)
  assert.match(wxml, /确认完成/)
  assert.match(js, /finishAppoint\s*\(\)/)
  assert.match(js, /`\/idle\/appoint\/\$\{pending\.appointmentId\}\/finish`/)
  assert.match(js, /method: 'PUT'/)
})

test('详情页对可评价的预约显示去评价入口', () => {
  const wxml = read('detail.wxml')
  const js = read('detail.js')

  assert.match(wxml, /detail\.reviewAppointmentId && !detail\.reviewed/)
  assert.match(wxml, /bindtap="goReview"/)
  assert.match(js, /reviewAppointmentId/)
  assert.match(js, /appointmentId = d && \(d\.reviewAppointmentId \|\| d\.myAppointmentId\)/)
})

test('详情页提供处理预约的样式（头像/接受/拒绝按钮）', () => {
  const wxss = read('detail.wxss')

  assert.match(wxss, /\.appoint-pending\s*\{/)
  assert.match(wxss, /\.pending-avatar\s*\{/)
  assert.match(wxss, /\.pending-btn--accept\s*\{/)
  assert.match(wxss, /\.pending-btn--reject\s*\{/)
  assert.match(wxss, /\.pending-btn::after\s*\{\s*border:\s*none;/)
  assert.match(wxss, /\.pending-btn\s*\{[^}]*flex:\s*1;/s)
})

test('详情页调用接受/拒绝处理接口并刷新', () => {
  const js = read('detail.js')

  assert.match(js, /handleAppoint\s*\(e\)/)
  assert.match(js, /`\/idle\/appoint\/\$\{pending\.appointmentId\}\/handle`/)
  assert.match(js, /method: 'PUT'/)
  assert.match(js, /data: \{ accept \}/)
  assert.match(js, /this\.loadDetail\(\)/)
})
