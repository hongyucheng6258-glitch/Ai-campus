const chatApi = require('../services/chat')
const { buildSocketUrl, nextReconnectDelay, parseSocketEvent } = require('./chat-core')

class ChatSocket {
  constructor(options = {}) {
    this.onEvent = options.onEvent || function () {}
    this.onState = options.onState || function () {}
    this.socketTask = null
    this.state = 'disconnected'
    this.manualClose = false
    this.foreground = true
    this.connecting = null
    this.reconnectAttempt = 0
    this.reconnectTimer = null
    this.heartbeatTimer = null
    this.pongTimer = null
    this.sequence = 0
  }

  setState(state) {
    if (this.state === state) return
    this.state = state
    this.onState(state)
  }

  async connect() {
    if (this.manualClose || !this.foreground || this.state === 'connected') return
    if (this.connecting) return this.connecting
    this.connecting = this.openWithTicket().finally(() => { this.connecting = null })
    return this.connecting
  }

  async openWithTicket() {
    this.clearReconnect()
    this.setState('connecting')
    try {
      const result = await chatApi.getWsTicket()
      if (!result || !result.ticket || this.manualClose || !this.foreground) {
        this.setState('disconnected')
        if (!this.manualClose && this.foreground) this.scheduleReconnect()
        return
      }
      const url = buildSocketUrl(getApp().globalData.baseUrl, result.ticket)
      const task = wx.connectSocket({ url })
      this.socketTask = task
      task.onOpen(() => {
        if (this.socketTask !== task) return
        this.reconnectAttempt = 0
        this.setState('connected')
        this.startHeartbeat()
      })
      task.onMessage((message) => this.handleMessage(message.data))
      task.onClose(() => this.handleDisconnect(task))
      task.onError(() => this.handleDisconnect(task))
      setTimeout(() => {
        if (this.socketTask === task && this.state === 'connecting') task.close({ code: 4001, reason: 'connect timeout' })
      }, 10000)
    } catch (e) {
      this.setState('disconnected')
      this.scheduleReconnect()
    }
  }

  handleMessage(raw) {
    const event = parseSocketEvent(raw)
    if (!event) return
    if (event.type === 'pong') {
      if (this.pongTimer) clearTimeout(this.pongTimer)
      this.pongTimer = null
    }
    this.onEvent(event)
  }

  handleDisconnect(task) {
    if (this.socketTask !== task) return
    this.socketTask = null
    this.stopHeartbeat()
    this.setState('disconnected')
    this.scheduleReconnect()
  }

  startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (!this.send({ type: 'ping' })) return
      if (this.pongTimer) clearTimeout(this.pongTimer)
      this.pongTimer = setTimeout(() => {
        if (this.socketTask) this.socketTask.close({ code: 4000, reason: 'heartbeat timeout' })
      }, 10000)
    }, 25000)
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.pongTimer) clearTimeout(this.pongTimer)
    this.heartbeatTimer = null
    this.pongTimer = null
  }

  scheduleReconnect() {
    if (this.manualClose || !this.foreground || this.reconnectTimer) return
    const delay = nextReconnectDelay(this.reconnectAttempt++)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  clearReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  createRequestId(prefix) {
    this.sequence += 1
    return `${prefix}-${Date.now().toString(36)}-${this.sequence.toString(36)}`
  }

  send(payload) {
    if (this.state !== 'connected' || !this.socketTask) return false
    try {
      this.socketTask.send({ data: JSON.stringify(payload) })
      return true
    } catch (e) {
      return false
    }
  }

  sendMessage(payload) {
    const requestId = this.createRequestId('send')
    return { requestId, sent: this.send({ type: 'chat.send', requestId, ...payload }) }
  }

  markRead(conversationId, lastReadMessageId) {
    return this.send({
      type: 'chat.read',
      requestId: this.createRequestId('read'),
      conversationId,
      ...(lastReadMessageId ? { lastReadMessageId } : {})
    })
  }

  enterForeground() {
    this.foreground = true
    this.manualClose = false
    this.reconnectAttempt = 0
    this.connect()
  }

  enterBackground() {
    this.foreground = false
    this.clearReconnect()
    this.stopHeartbeat()
    if (this.socketTask) this.socketTask.close({ code: 1000, reason: 'background' })
    this.socketTask = null
    this.setState('disconnected')
  }

  close() {
    this.manualClose = true
    this.foreground = false
    this.clearReconnect()
    this.stopHeartbeat()
    if (this.socketTask) this.socketTask.close({ code: 1000, reason: 'logout' })
    this.socketTask = null
    this.setState('disconnected')
  }
}

module.exports = ChatSocket
