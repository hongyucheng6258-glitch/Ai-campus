// AI 智能答疑（分包 pages-ai）
// 小程序端不支持 SSE，走一次性返回接口 POST /ai/chat/sync，配合 loading 提升体感
// 会话管理：POST /ai/session（scene=chat）、GET /ai/session/{id}/messages 拉历史
const { request } = require('../../utils/request')
const { getUserInfo, requireLogin } = require('../../utils/auth')
const { normalizeUserInfo } = require('../../utils/avatar')
const { getAiAnswer } = require('../../utils/ai-response')

/** 常见问题快捷入口，降低毕设演示时的输入成本 */
const QUICK_ASKS = [
  '用通俗的话解释一下什么是数据库事务的 ACID',
  '帮我总结 Java 中 HashMap 的底层实现原理',
  '如何准备计算机专业的毕业设计答辩'
]

Page({
  data: {
    sessionId: null,   // 当前会话ID，null 表示由后端自动新建
    messages: [],      // [{ role: 'user'|'assistant', content }]
    input: '',         // 输入框内容
    sending: false,    // 发送中
    scrollTop: 0,      // 滚动位置
    nickname: '我',
    avatar: '',
    quickAsks: QUICK_ASKS
  },

  onLoad(options) {
    if (!requireLogin()) return
    const user = normalizeUserInfo(getUserInfo() || {})
    this.setData({
      nickname: user.nickname || '我',
      avatar: user.avatar || ''
    })
    // 支持从会话列表带 sessionId 进入，继续历史对话
    if (options.sessionId) {
      const sessionId = Number(options.sessionId)
      this.setData({ sessionId })
      this.loadHistory(sessionId)
    }
  },

  /**
   * 拉取历史消息（分页取第一页 50 条，按时间正序展示）。
   * @param {Number} sessionId 会话ID
   */
  async loadHistory(sessionId) {
    try {
      const data = await request({
        url: `/ai/session/${sessionId}/messages`,
        data: { pageNum: 1, pageSize: 50 }
      })
      const messages = (data.list || []).slice().reverse().map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || ''
      }))
      this.setData({ messages }, this.scrollToBottom)
    } catch (e) {
      // 历史加载失败不影响新提问
    }
  },

  /** 输入框同步 */
  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  /** 点击快捷提问 */
  tapQuick(e) {
    const text = e.currentTarget.dataset.text
    this.setData({ input: text })
  },

  /**
   * 发送问题：POST /ai/chat/sync { sessionId, question } → { answer }
   * 先本地插入用户气泡与"思考中"占位，返回后替换占位内容。
   */
  async send() {
    const question = (this.data.input || '').trim()
    if (!question) {
      wx.showToast({ title: '请输入问题', icon: 'none' })
      return
    }
    if (question.length > 2000) {
      wx.showToast({ title: '问题最长2000字', icon: 'none' })
      return
    }
    if (this.data.sending) return
    if (!requireLogin()) return

    const messages = this.data.messages.concat([
      { role: 'user', content: question },
      { role: 'assistant', content: 'AI 正在思考中…' }
    ])
    const placeholderIndex = messages.length - 1
    this.setData({ messages, input: '', sending: true }, this.scrollToBottom)

    try {
      let sessionId = this.data.sessionId
      if (!sessionId) {
        const session = await request({
          url: '/ai/session',
          method: 'POST',
          data: { scene: 'chat', title: question.slice(0, 30) || '新会话' }
        })
        sessionId = session && session.id
        if (!sessionId) throw new Error('创建会话失败')
        this.setData({ sessionId })
      }
      const data = await request({
        url: '/ai/chat/sync',
        method: 'POST',
        data: { sessionId, question }
      })
      const key = `messages[${placeholderIndex}].content`
      this.setData({ [key]: getAiAnswer(data) || '（AI 未返回内容）' }, this.scrollToBottom)
    } catch (e) {
      const key = `messages[${placeholderIndex}].content`
      this.setData({ [key]: '回答失败，请稍后重试。' }, this.scrollToBottom)
    } finally {
      this.setData({ sending: false })
    }
  },

  /** 滚动到底部（用足够大的 scrollTop 触底） */
  scrollToBottom() {
    this.setData({ scrollTop: this.data.messages.length * 100000 })
  },

  /** 清空当前对话（仅清本地展示，不删除服务端会话） */
  clearScreen() {
    wx.showModal({
      title: '提示',
      content: '确定清空当前对话记录吗？（不影响服务端历史）',
      success: (res) => {
        if (res.confirm) {
          this.setData({ messages: [] })
        }
      }
    })
  },

  /** 长按气泡复制内容 */
  copyMessage(e) {
    const content = this.data.messages[e.currentTarget.dataset.index]
    if (!content) return
    wx.setClipboardData({
      data: content.content,
      success() {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  }
})
