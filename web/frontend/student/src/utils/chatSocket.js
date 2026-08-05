import { getChatWsTicket } from '../api/chat'
import { buildWsUrl, createRequestId, parseChatEvent, reconnectDelay } from './chatSocketCore.mjs'

export class ChatSocket {
  constructor({ onEvent, onState }) {
    this.onEvent = onEvent
    this.onState = onState
    this.socket = null
    this.heartbeat = null
    this.reconnectTimer = null
    this.attempt = 0
    this.closedByUser = false
  }

  get connected() {
    return this.socket?.readyState === WebSocket.OPEN
  }

  async connect() {
    if (this.connected || this.socket?.readyState === WebSocket.CONNECTING) return
    this.closedByUser = false
    this.onState?.('connecting')
    try {
      const { ticket } = await getChatWsTicket()
      const socket = new WebSocket(buildWsUrl(ticket))
      this.socket = socket
      socket.onopen = () => {
        this.attempt = 0
        this.onState?.('connected')
        this.startHeartbeat()
      }
      socket.onmessage = ({ data }) => {
        const event = parseChatEvent(data)
        if (event) this.onEvent?.(event)
      }
      socket.onerror = () => this.onState?.('error')
      socket.onclose = () => {
        this.stopHeartbeat()
        this.socket = null
        this.onState?.('disconnected')
        if (!this.closedByUser) this.scheduleReconnect()
      }
    } catch {
      this.onState?.('disconnected')
      this.scheduleReconnect()
    }
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer)
    const delay = reconnectDelay(this.attempt++)
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeat = setInterval(() => this.send({ type: 'ping' }), 25000)
  }

  stopHeartbeat() {
    clearInterval(this.heartbeat)
    this.heartbeat = null
  }

  send(payload) {
    if (!this.connected) return false
    this.socket.send(JSON.stringify(payload))
    return true
  }

  sendMessage(payload) {
    const requestId = createRequestId('send')
    return { requestId, sent: this.send({ type: 'chat.send', requestId, ...payload }) }
  }

  markRead(conversationId, lastReadMessageId) {
    return this.send({ type: 'chat.read', requestId: createRequestId('read'), conversationId, lastReadMessageId })
  }

  close() {
    this.closedByUser = true
    clearTimeout(this.reconnectTimer)
    this.stopHeartbeat()
    this.socket?.close()
    this.socket = null
  }
}
