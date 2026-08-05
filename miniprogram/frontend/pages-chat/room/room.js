const chatApi = require('../../services/chat')
const chatManager = require('../../utils/chat-manager')
const { getUserInfo, requireLogin } = require('../../utils/auth')
const { mergeMessages, normalizeHistory, applyReadReceipt, historyBeforeId } = require('../../utils/chat-core')
const { shortTime } = require('../../utils/format')

function decorate(message, userId) {
  return {
    ...message,
    mine: Number(message.senderId) === Number(userId),
    timeText: shortTime(message.createTime),
    sendState: message.sendState || 'sent'
  }
}

Page({
  data: {
    id: null,
    conversation: null,
    messages: [],
    inputValue: '',
    loading: true,
    historyLoading: false,
    historyDone: false,
    sendingImage: false,
    connectionText: '正在连接',
    scrollIntoView: '',
    userId: null
  },

  onLoad(options) {
    if (!requireLogin()) return
    const id = Number(options.id)
    if (!id) {
      wx.showToast({ title: '会话参数错误', icon: 'none' })
      return
    }
    const user = getUserInfo() || {}
    this.setData({ id, userId: user.id })
    this.pendingRequests = new Map()
    this.unsubscribe = chatManager.subscribe((event) => this.handleEvent(event))
  },

  onShow() {
    if (!this.data.id) return
    chatManager.start()
    if (!this.data.conversation) {
      Promise.all([this.loadConversation(), this.loadHistory(true)]).finally(() => {
        this.setData({ loading: false })
      })
    } else {
      this.loadHistory(true)
    }
  },

  onUnload() {
    if (this.unsubscribe) this.unsubscribe()
    if (this.pendingRequests) {
      this.pendingRequests.forEach((pending) => clearTimeout(pending.timer))
      this.pendingRequests.clear()
    }
  },

  async loadConversation() {
    const conversation = await chatApi.getConversation(this.data.id)
    this.setData({ conversation })
    if (conversation.peerNickname) wx.setNavigationBarTitle({ title: conversation.peerNickname })
  },

  async loadHistory(reset) {
    if (this.data.historyLoading || (!reset && this.data.historyDone)) return
    this.setData({ historyLoading: true })
    try {
      const current = reset
        ? this.data.messages.filter((item) => item.id == null)
        : this.data.messages
      const beforeId = reset ? null : this.earliestMessageId(current)
      const raw = await chatApi.listMessages(this.data.id, beforeId, 20)
      const normalized = normalizeHistory(raw)
      const messages = mergeMessages(current, normalized.list.map((item) => decorate(item, this.data.userId)))
      this.setData({ messages, historyDone: normalized.list.length < 20 })
      await this.markRead()
      if (reset) this.scrollBottom()
    } finally {
      this.setData({ historyLoading: false })
    }
  },

  earliestMessageId(messages) {
    return historyBeforeId(messages)
  },

  latestMessageId() {
    const ids = this.data.messages.filter((item) => item.id != null).map((item) => Number(item.id))
    return ids.length ? Math.max.apply(null, ids) : null
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  sendText() {
    const content = String(this.data.inputValue || '').trim()
    if (!content) return
    if (content.length > 2000) {
      wx.showToast({ title: '文字不能超过 2000 字', icon: 'none' })
      return
    }
    this.setData({ inputValue: '' })
    this.send('text', content)
  },

  chooseImage() {
    if (this.data.sendingImage) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (result) => {
        const file = result.tempFiles && result.tempFiles[0]
        if (!file) return
        this.setData({ sendingImage: true })
        try {
          const uploaded = await chatApi.uploadChatImage(file.tempFilePath)
          await this.send('image', uploaded.url)
        } finally {
          this.setData({ sendingImage: false })
        }
      }
    })
  },

  async send(messageType, content, retryClientId) {
    const conversation = this.data.conversation
    if (!conversation) return
    const clientMessageId = retryClientId || `${this.data.userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const pending = decorate({
      id: null,
      conversationId: this.data.id,
      senderId: this.data.userId,
      receiverId: conversation.peerUserId,
      clientMessageId,
      messageType,
      content,
      createTime: new Date().toISOString(),
      sendState: 'sending'
    }, this.data.userId)
    const messages = mergeMessages(this.data.messages.filter((item) => item.clientMessageId !== clientMessageId), [pending])
    this.setData({ messages })
    this.scrollBottom()
    const payload = { conversationId: this.data.id, clientMessageId, messageType, content }
    const socketResult = chatManager.socket.sendMessage(payload)
    if (socketResult.sent) {
      const timer = setTimeout(() => this.compensateSend(socketResult.requestId), 8000)
      this.pendingRequests.set(socketResult.requestId, { clientMessageId, messageType, content, timer })
      return
    }
    try {
      const confirmed = await chatApi.sendMessage(this.data.id, { clientMessageId, messageType, content })
      this.confirmMessage(clientMessageId, confirmed)
    } catch (e) {
      this.failMessage(clientMessageId, e.message)
    }
  },

  async compensateSend(requestId) {
    const pending = this.pendingRequests.get(requestId)
    if (!pending) return
    this.pendingRequests.delete(requestId)
    try {
      const confirmed = await chatApi.sendMessage(this.data.id, {
        clientMessageId: pending.clientMessageId,
        messageType: pending.messageType,
        content: pending.content
      })
      this.confirmMessage(pending.clientMessageId, confirmed)
    } catch (e) {
      this.failMessage(pending.clientMessageId, e.message)
    }
  },

  confirmMessage(clientMessageId, confirmed) {
    const messages = this.data.messages.map((message) => message.clientMessageId === clientMessageId
      ? decorate({ ...message, ...confirmed, sendState: 'sent' }, this.data.userId)
      : message)
    this.setData({ messages: mergeMessages([], messages) })
  },

  failMessage(clientMessageId, error) {
    this.setData({ messages: this.data.messages.map((message) => message.clientMessageId === clientMessageId
      ? { ...message, sendState: 'failed', error: error || '发送失败' }
      : message) })
  },

  retry(e) {
    const message = this.data.messages[e.currentTarget.dataset.index]
    if (message && message.sendState === 'failed') this.send(message.messageType, message.content, message.clientMessageId)
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.url
    const urls = this.data.messages.filter((item) => item.messageType === 'image').map((item) => item.content)
    wx.previewImage({ current, urls })
  },

  async markRead() {
    const lastId = this.latestMessageId()
    const socketMarked = chatManager.socket.state === 'connected'
      ? chatManager.socket.markRead(this.data.id, lastId)
      : false
    if (!socketMarked) await chatApi.markRead(this.data.id, lastId)
    chatManager.refreshUnread()
  },

  handleEvent(event) {
    if (event.type === 'socket.state') {
      this.setData({ connectionText: event.state === 'connected' ? '实时连接中' : '离线模式，发送自动降级' })
    } else if (event.type === 'chat.sync') {
      this.loadHistory(true)
    } else if (event.type === 'chat.message' && event.message && Number(event.message.conversationId) === this.data.id) {
      const messages = mergeMessages(this.data.messages, [decorate(event.message, this.data.userId)])
      this.setData({ messages })
      this.markRead()
      this.scrollBottom()
    } else if (event.type === 'chat.ack' && event.message) {
      const pending = this.pendingRequests.get(event.requestId)
      if (pending) clearTimeout(pending.timer)
      const clientId = (pending && pending.clientMessageId) || event.message.clientMessageId
      this.pendingRequests.delete(event.requestId)
      this.confirmMessage(clientId, event.message)
    } else if (event.type === 'chat.error') {
      const pending = this.pendingRequests.get(event.requestId)
      if (pending) {
        clearTimeout(pending.timer)
        this.failMessage(pending.clientMessageId, event.message)
      }
      this.pendingRequests.delete(event.requestId)
    } else if (event.type === 'chat.read-receipt' && Number(event.conversationId) === this.data.id) {
      this.setData({ messages: applyReadReceipt(this.data.messages, event, this.data.userId) })
    }
  },

  scrollBottom() {
    setTimeout(() => this.setData({ scrollIntoView: 'message-end' }), 20)
  },

  openContext() {
    const c = this.data.conversation
    if (!c || !c.contextId) return
    const map = {
      idle: '/pages-idle/detail/detail?id=',
      lostfound: '/pages-lostfound/detail/detail?id=',
      activity: '/pages-activity/detail/detail?id='
    }
    if (map[c.contextType]) wx.navigateTo({ url: map[c.contextType] + c.contextId })
  }
})
