const assert = require('node:assert/strict')
const test = require('node:test')

const {
  applyReadReceipt,
  badgeText,
  buildSocketUrl,
  historyBeforeId,
  mergeMessages,
  nextReconnectDelay,
  normalizeHistory,
  parseSocketEvent
} = require('./chat-core')

test('消息按 id 排序，并按 id 或 clientMessageId 去重', () => {
  const result = mergeMessages(
    [{ id: 2, clientMessageId: 'b' }, { id: null, clientMessageId: 'pending' }],
    [{ id: 1, clientMessageId: 'a' }, { id: 3, clientMessageId: 'pending' }, { id: 2, clientMessageId: 'b' }]
  )
  assert.deepEqual(result.map((item) => item.id), [1, 2, 3])
})

test('历史记录兼容数组和分页包装，且返回最早游标', () => {
  assert.deepEqual(normalizeHistory([{ id: 2 }, { id: 1 }]), {
    list: [{ id: 2 }, { id: 1 }],
    beforeId: 1
  })
  assert.deepEqual(normalizeHistory({ list: [{ id: 8 }, { id: 7 }] }), {
    list: [{ id: 8 }, { id: 7 }],
    beforeId: 7
  })
})

test('加载更早历史时忽略本地待发送消息，使用服务端最早消息作为游标', () => {
  assert.equal(historyBeforeId([
    { id: 12, clientMessageId: 'server-12' },
    { id: null, clientMessageId: 'pending' },
    { id: 7, clientMessageId: 'server-7' }
  ]), 7)
  assert.equal(historyBeforeId([{ id: null, clientMessageId: 'pending' }]), null)
})

test('已读回执只更新本人发送且不晚于 lastReadMessageId 的消息', () => {
  const result = applyReadReceipt([
    { id: 1, senderId: 10 },
    { id: 2, senderId: 20 },
    { id: 3, senderId: 10 }
  ], { lastReadMessageId: 2, readTime: '2026-08-05T10:00:00' }, 10)
  assert.equal(result[0].readTime, '2026-08-05T10:00:00')
  assert.equal(result[1].readTime, undefined)
  assert.equal(result[2].readTime, undefined)
})

test('WebSocket 地址从 API 地址推导并携带编码后的短票据', () => {
  assert.equal(
    buildSocketUrl('https://campus.example.com/api', 'a+b/c'),
    'wss://campus.example.com/ws/chat?ticket=a%2Bb%2Fc'
  )
  assert.equal(
    buildSocketUrl('http://127.0.0.1:8080/api', 'ticket'),
    'ws://127.0.0.1:8080/ws/chat?ticket=ticket'
  )
})

test('重连采用封顶指数退避并带抖动', () => {
  assert.equal(nextReconnectDelay(0, () => 0), 1000)
  assert.equal(nextReconnectDelay(2, () => 0.5), 4400)
  assert.equal(nextReconnectDelay(10, () => 1), 30000)
})

test('无效 WebSocket 数据被忽略', () => {
  assert.equal(parseSocketEvent('{bad json'), null)
  assert.equal(parseSocketEvent('{"hello":"world"}'), null)
  assert.deepEqual(parseSocketEvent('{"type":"pong"}'), { type: 'pong' })
})

test('消息角标合并通知与私信未读并限制为 99+', () => {
  assert.equal(badgeText(0, 0), '')
  assert.equal(badgeText(3, 4), '7')
  assert.equal(badgeText(60, 50), '99+')
})

test('消息角标不会把私信聚合通知重复计入通知未读', () => {
  assert.equal(badgeText(2, 4), '6')
})
