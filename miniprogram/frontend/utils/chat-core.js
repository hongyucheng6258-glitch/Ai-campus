function messageIdentity(message) {
  if (message && message.id != null) return `id:${message.id}`
  return message && message.clientMessageId ? `client:${message.clientMessageId}` : null
}

function mergeMessages(current = [], incoming = []) {
  const result = new Map()
  const clientIds = new Set()
  current.concat(incoming).forEach((message, index) => {
    if (!message) return
    if (message.clientMessageId && clientIds.has(message.clientMessageId)) {
      const oldKey = Array.from(result.keys()).find((key) => result.get(key).clientMessageId === message.clientMessageId)
      if (oldKey) result.delete(oldKey)
    }
    const key = messageIdentity(message) || `temp:${index}`
    result.set(key, message)
    if (message.clientMessageId) clientIds.add(message.clientMessageId)
  })
  return Array.from(result.values()).sort((a, b) => {
    if (a.id != null && b.id != null) return Number(a.id) - Number(b.id)
    if (a.id == null && b.id != null) return 1
    if (a.id != null && b.id == null) return -1
    return String(a.createTime || '').localeCompare(String(b.createTime || ''))
  })
}

function historyBeforeId(messages = []) {
  const ids = messages.filter((item) => item && item.id != null).map((item) => Number(item.id))
  return ids.length ? Math.min.apply(null, ids) : null
}

function normalizeHistory(data) {
  const list = Array.isArray(data) ? data : ((data && data.list) || [])
  return { list, beforeId: historyBeforeId(list) }
}

function applyReadReceipt(messages = [], event = {}, currentUserId) {
  const lastReadId = Number(event.lastReadMessageId || 0)
  return messages.map((message) => (
    Number(message.senderId) === Number(currentUserId) && message.id != null && Number(message.id) <= lastReadId
      ? { ...message, readTime: message.readTime || event.readTime || '已读' }
      : message
  ))
}

function buildSocketUrl(baseUrl, ticket) {
  const base = String(baseUrl || '').replace(/\/+$/, '').replace(/\/api$/, '')
  const socketBase = base.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')
  return `${socketBase}/ws/chat?ticket=${encodeURIComponent(ticket || '')}`
}

function nextReconnectDelay(attempt, random = Math.random) {
  const base = Math.min(30000, 1000 * (2 ** Math.max(0, Number(attempt) || 0)))
  return Math.min(30000, base + Math.floor(base * 0.2 * random()))
}

function parseSocketEvent(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw
    return value && typeof value.type === 'string' ? value : null
  } catch (e) {
    return null
  }
}

function badgeText(notificationUnread, chatUnread) {
  const count = Math.max(0, Number(notificationUnread) || 0) + Math.max(0, Number(chatUnread) || 0)
  if (!count) return ''
  return count > 99 ? '99+' : String(count)
}

module.exports = {
  applyReadReceipt,
  badgeText,
  buildSocketUrl,
  historyBeforeId,
  mergeMessages,
  nextReconnectDelay,
  normalizeHistory,
  parseSocketEvent
}
