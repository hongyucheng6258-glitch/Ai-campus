const chatApi = require('../services/chat')
const { getUserInfo, requireLogin } = require('./auth')

async function startChat(targetUserId, context = {}) {
  if (!requireLogin()) return null
  const user = getUserInfo() || {}
  if (!targetUserId || Number(targetUserId) === Number(user.id)) {
    wx.showToast({ title: '不能给自己发私信', icon: 'none' })
    return null
  }
  const conversation = await chatApi.createConversation({
    targetUserId: Number(targetUserId),
    contextType: context.type,
    contextId: context.id,
    contextTitle: context.title
  })
  wx.navigateTo({ url: `/pages-chat/room/room?id=${conversation.id}` })
  return conversation
}

module.exports = startChat
