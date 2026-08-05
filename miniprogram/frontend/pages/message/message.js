// 消息中心：GET /message/list（分页+类型筛选）、GET /message/unread-count（30s 轮询角标）
// PUT /message/{id}/read 单条已读、PUT /message/read-all 全部已读
const { request } = require('../../utils/request')
const { fromNow } = require('../../utils/format')
const { isLoggedIn } = require('../../utils/auth')
const chatManager = require('../../utils/chat-manager')

/** 消息类型筛选项（与后端 Constants.MSG_* 一致） */
const TYPE_TABS = [
  { key: '', name: '全部' },
  { key: 'system', name: '系统' },
  { key: 'interact', name: '互动' },
  { key: 'audit', name: '审核' }
]

/** 业务类型 → 详情页路径映射（点击消息跳转对应业务） */
const BIZ_URL_MAP = {
  idle: '/pages-idle/detail/detail?id=',
  activity: '/pages-activity/detail/detail?id=',
  lostfound: '/pages-lostfound/detail/detail?id=',
  post: ''
}

Page({
  data: {
    typeTabs: TYPE_TABS,
    activeType: '',   // 当前筛选类型
    list: [],         // 消息列表
    pageNum: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    inited: false,
    unread: 0,        // 未读数
    logged: false     // 登录态
  },

  onLoad() {
    this.timer = null // 轮询定时器句柄
  },

  onShow() {
    const logged = isLoggedIn()
    this.setData({ logged })
    if (!logged) {
      this.setData({ inited: true, list: [] })
      return
    }
    this.loadList(true)
    this.refreshUnread()
    this.startPolling()
  },

  onHide() {
    this.stopPolling()
  },

  onUnload() {
    this.stopPolling()
  },

  onPullDownRefresh() {
    if (!this.data.logged) {
      wx.stopPullDownRefresh()
      return
    }
    Promise.all([this.loadList(true), this.refreshUnread()])
      .then(() => wx.stopPullDownRefresh())
      .catch(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.logged && this.data.hasMore && !this.data.loading) {
      this.loadList(false)
    }
  },

  /** 开启 30s 未读数轮询（小程序无长连接，用短轮询实现角标刷新） */
  startPolling() {
    this.stopPolling()
    this.timer = setInterval(() => {
      this.refreshUnread()
    }, 30000)
  },

  /** 停止轮询，避免页面隐藏后继续耗电 */
  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  /** 拉取未读数并刷新 tabBar 角标 */
  async refreshUnread() {
    if (!isLoggedIn()) return
    try {
      const data = await request({ url: '/message/unread-count' })
      const count = Number(data.count || 0)
      this.setData({ unread: count })
      chatManager.setNotificationUnread(count)
      await chatManager.refreshUnread()
    } catch (e) {
      // 轮询失败静默处理，避免频繁弹 toast
    }
  },

  /**
   * 加载消息列表。
   * @param {Boolean} reset true=重置第一页
   */
  async loadList(reset) {
    if (this.data.loading) return
    const pageNum = reset ? 1 : this.data.pageNum + 1
    this.setData({ loading: true })
    try {
      const params = { pageNum, pageSize: this.data.pageSize }
      if (this.data.activeType) {
        params.type = this.data.activeType
      }
      const data = await request({ url: '/message/list', data: params })
      const rows = (data.list || []).map((item) => ({
        ...item,
        timeText: fromNow(item.createTime)
      }))
      const list = reset ? rows : this.data.list.concat(rows)
      this.setData({
        list,
        pageNum,
        total: data.total || 0,
        hasMore: list.length < (data.total || 0),
        inited: true
      })
    } catch (e) {
      this.setData({ inited: true })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 切换类型筛选 */
  switchType(e) {
    const type = e.currentTarget.dataset.key
    if (type === this.data.activeType) return
    this.setData({ activeType: type, list: [], pageNum: 1, hasMore: true })
    this.loadList(true)
  },

  /** 点击消息：标记已读 + 跳转业务详情 */
  async tapItem(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.list[index]
    if (!item) return

    if (item.type === 'private_message' && item.bizType === 'conversation' && item.bizId) {
      wx.navigateTo({ url: `/pages-chat/room/room?id=${item.bizId}` })
      return
    }

    if (item.isRead === 0) {
      try {
        await request({ url: `/message/${item.id}/read`, method: 'PUT' })
        const key = `list[${index}].isRead`
        this.setData({ [key]: 1 })
        this.refreshUnread()
      } catch (err) {
        // 标记失败不阻塞跳转
      }
    }

    const prefix = BIZ_URL_MAP[item.bizType]
    if (prefix && item.bizId) {
      wx.navigateTo({ url: prefix + item.bizId })
    }
  },

  /** 一键全部已读 */
  async markAllRead() {
    if (this.data.unread === 0) {
      wx.showToast({ title: '没有未读消息', icon: 'none' })
      return
    }
    try {
      await request({ url: '/message/read-all', method: 'PUT' })
      const list = this.data.list.map((x) => ({ ...x, isRead: 1 }))
      this.setData({ list, unread: 0 })
      chatManager.setNotificationUnread(0)
      wx.showToast({ title: '已全部标记已读', icon: 'success' })
    } catch (e) {
      // 错误提示已统一处理
    }
  },

  /** 打开私信会话列表 */
  goChat() {
    wx.navigateTo({ url: '/pages-chat/conversations/conversations' })
  },

  /** 未登录时跳转登录页 */
  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  }
})
