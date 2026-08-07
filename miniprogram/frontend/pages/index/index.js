// 首页：公告轮播 + 8宫格 + 最新内容流（/home/aggregate 聚合接口）
const { request } = require('../../utils/request')
const { parseImages } = require('../../utils/format')

Page({
  data: {
    notices: [],
    idleItems: [],
    activities: [],
    lostFounds: [],
    entries: [
      { icon: '🤖', name: 'AI答疑', url: '/pages-ai/chat/chat', login: true },
      { icon: '💻', name: '代码纠错', url: '/pages-ai/code-fix/code-fix', login: true },
      { icon: '📕', name: '错题本', url: '/pages-ai/wrong/wrong', login: true },
      { icon: '🔄', name: '闲置互换', url: '/pages-idle/list/list' },
      { icon: '🎉', name: '活动组队', url: '/pages-activity/list/list' },
      { icon: '🔍', name: '失物招领', url: '/pages-lostfound/list/list' },
      { icon: '📢', name: '校园公告', url: '/pages/notice/list/list' },
      { icon: '🌟', name: '动态广场', url: '/pages-post/square/square', login: true }
    ]
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const data = await request({ url: '/home/aggregate' })
      this.setData({
        notices: data.notices || [],
        idleItems: (data.idleItems || []).map((x) => ({ ...x, cover: parseImages(x.images)[0] || '' })),
        activities: (data.activities || []).map((x) => ({ ...x, cover: parseImages(x.images)[0] || '' })),
        lostFounds: data.lostFounds || []
      })
    } catch (e) {
      // 首页静默失败
    }
  },

  goEntry(e) {
    const item = e.currentTarget.dataset.item
    const { requireLogin } = require('../../utils/auth')
    if (item.login && !requireLogin()) return
    wx.navigateTo({ url: item.url })
  },

  goNotice(e) {
    wx.navigateTo({ url: `/pages/notice/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  goIdle(e) {
    wx.navigateTo({ url: `/pages-idle/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  goActivity(e) {
    wx.navigateTo({ url: `/pages-activity/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  goLostFound(e) {
    wx.navigateTo({ url: `/pages-lostfound/detail/detail?id=${e.currentTarget.dataset.id}` })
  }
})
