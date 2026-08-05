const { request, uploadFile } = require('../utils/request')

function createConversation(data) {
  return request({ url: '/chat/conversations', method: 'POST', data })
}

function listConversations() {
  return request({ url: '/chat/conversations' })
}

function getConversation(id) {
  return request({ url: `/chat/conversations/${id}` })
}

function listMessages(id, beforeId, limit = 20) {
  const data = { limit }
  if (beforeId) data.beforeId = beforeId
  return request({ url: `/chat/conversations/${id}/messages`, data })
}

function sendMessage(id, data) {
  return request({ url: `/chat/conversations/${id}/messages`, method: 'POST', data })
}

function markRead(id, lastReadMessageId) {
  return request({
    url: `/chat/conversations/${id}/read`,
    method: 'PUT',
    data: lastReadMessageId ? { lastReadMessageId } : {}
  })
}

function getUnreadCount() {
  return request({ url: '/chat/unread-count' })
}

function getWsTicket() {
  return request({ url: '/chat/ws-ticket', method: 'POST' })
}

function uploadChatImage(filePath) {
  return uploadFile(filePath, 'image')
}

module.exports = {
  createConversation,
  getConversation,
  getUnreadCount,
  getWsTicket,
  listConversations,
  listMessages,
  markRead,
  sendMessage,
  uploadChatImage
}
