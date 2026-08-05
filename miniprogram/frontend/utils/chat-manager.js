const chatApi = require('../services/chat')
const { request } = require('./request')
const ChatSocket = require('./chat-socket')
const { badgeText } = require('./chat-core')
const { isLoggedIn } = require('./auth')

class ChatManager {
  constructor() {
    this.listeners = []
    this.notificationUnread = 0
    this.chatUnread = 0
    this.notificationSyncing = null
    this.socket = new ChatSocket({
      onEvent: (event) => this.emit(event),
      onState: (state) => {
        this.emit({ type: 'socket.state', state })
        if (state === 'connected') this.sync()
      }
    })
  }

  subscribe(listener) {
    this.listeners.push(listener)
    return () => { this.listeners = this.listeners.filter((item) => item !== listener) }
  }

  emit(event) {
    if (event.type === 'chat.unread') this.refreshUnread()
    this.listeners.slice().forEach((listener) => listener(event))
  }

  start() {
    if (!isLoggedIn()) return
    this.socket.enterForeground()
    this.sync()
  }

  stop() {
    this.socket.enterBackground()
  }

  close() {
    this.socket.close()
    this.notificationUnread = 0
    this.chatUnread = 0
    this.updateBadge()
  }

  async sync() {
    if (!isLoggedIn()) return
    await Promise.all([this.refreshUnread(), this.refreshNotificationUnread()])
    this.emit({ type: 'chat.sync' })
  }

  async refreshNotificationUnread() {
    if (!isLoggedIn()) return 0
    if (this.notificationSyncing) return this.notificationSyncing
    this.notificationSyncing = request({ url: '/message/unread-count' })
      .then((result) => {
        this.notificationUnread = Number((result && result.count) || 0)
        this.updateBadge()
        return this.notificationUnread
      })
      .catch(() => this.notificationUnread)
      .finally(() => { this.notificationSyncing = null })
    return this.notificationSyncing
  }

  async refreshUnread() {
    if (!isLoggedIn()) return 0
    try {
      const result = await chatApi.getUnreadCount()
      this.chatUnread = Number((result && result.count) || 0)
      this.updateBadge()
      return this.chatUnread
    } catch (e) {
      return this.chatUnread
    }
  }

  setNotificationUnread(count) {
    this.notificationUnread = Number(count || 0)
    this.updateBadge()
  }

  updateBadge() {
    const text = badgeText(this.notificationUnread, this.chatUnread)
    try {
      if (text) wx.setTabBarBadge({ index: 1, text })
      else wx.removeTabBarBadge({ index: 1 })
    } catch (e) {}
  }
}

module.exports = new ChatManager()
