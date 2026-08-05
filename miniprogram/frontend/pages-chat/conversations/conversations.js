const chatApi = require('../../services/chat')
const chatManager = require('../../utils/chat-manager')
const { fromNow } = require('../../utils/format')
const { isLoggedIn } = require('../../utils/auth')

Page({
  data: {
    list: [],
    loading: false,
    inited: false,
    logged: false,
    connectionText: '正在连接'
  },

  onLoad() {
    this.unsubscribe = chatManager.subscribe((event) => {
      if (event.type === 'socket.state') {
        this.setData({ connectionText: event.state === 'connected' ? '实时连接中' : '离线同步' })
      }
      if (['chat.message', 'chat.unread', 'chat.sync'].includes(event.type)) this.loadList()
    })
  },

  onShow() {
    const logged = isLoggedIn()
    this.setData({ logged })
    if (logged) {
      chatManager.start()
      this.loadList()
    } else {
      this.setData({ inited: true, list: [] })
    }
  },

  onUnload() {
    if (this.unsubscribe) this.unsubscribe()
  },

  onPullDownRefresh() {
    this.loadList().finally(() => wx.stopPullDownRefresh())
  },

  async loadList() {
    if (!this.data.logged || this.data.loading) return
    this.setData({ loading: true })
    try {
      const result = await chatApi.listConversations()
      const list = (result || []).map((item) => ({
        ...item,
        timeText: fromNow(item.lastMessageTime),
        summary: item.lastMessageSummary || '开始聊天吧'
      }))
      this.setData({ list, inited: true })
      chatManager.refreshUnread()
    } catch (e) {
      this.setData({ inited: true })
    } finally {
      this.setData({ loading: false })
    }
  },

  openRoom(e) {
    wx.navigateTo({ url: `/pages-chat/room/room?id=${e.currentTarget.dataset.id}` })
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  }
})
