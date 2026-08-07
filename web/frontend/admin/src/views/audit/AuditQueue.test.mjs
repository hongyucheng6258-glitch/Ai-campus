import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const source = await fs.readFile(new URL('./AuditQueue.vue', import.meta.url), 'utf8')

test('审核页为图片加载失败提供占位内容', () => {
  assert.match(source, /@error/)
  assert.match(source, /图片加载失败|暂无图片/)
})

test('审核页使用统一日期和图片工具', () => {
  assert.match(source, /utils\/date/)
  assert.match(source, /utils\/image/)
  assert.match(source, /formatTime\(/)
  assert.match(source, /normalizeImages\(/)
})
