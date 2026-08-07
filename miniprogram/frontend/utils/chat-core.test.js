const assert = require('node:assert/strict')
const test = require('node:test')
const { mergeMessages } = require('./chat-core')

test('聊天消息合并后按消息时间从旧到新排列', () => {
  const messages = mergeMessages([
    { id: 3, createTime: '2026-08-06T22:33:00' },
    { id: 1, createTime: '2026-08-06T22:30:00' }
  ], [
    { id: 2, createTime: '2026-08-06T22:31:00' }
  ])
  assert.deepEqual(messages.map((message) => message.id), [1, 2, 3])
})
