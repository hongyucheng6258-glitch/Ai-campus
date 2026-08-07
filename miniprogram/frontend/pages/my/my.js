const { request } = require('../../utils/request')
const { shortTime, parseImages } = require('../../utils/format')
const { isLoggedIn, getUserInfo, logout, setLogin } = require('../../utils/auth')
const { normalizeUserInfo } = require('../../utils/avatar')
const { consumePendingMyTab } = require('../../utils/tab-navigation')

const MY_TABS = [
  { key: 'idle', name: '我的闲置', url: '/idle/my' },
  { key: 'activity', name: '我的活动', url: '/activity/my' },
  { key: 'lostfound', name: '我的失物', url: '/lostfound/my' },
  { key: 'signup', name: '我的报名', url: '/activity/my/signups' },
  { key: 'appoint', name: '我的预约', url: '/idle/appoint/my' }
]

const AUDIT_TEXT = { 0: '待审核', 1: '已通过', 2: '已驳回' }
const AUDIT_TYPE = { 0: 'warning', 1: 'success', 2: 'danger' }
const MEMBER_TEXT = { 0: '待审核', 1: '已通过', 2: '未通过' }
const MEMBER_TYPE = { 0: 'warning', 1: 'success', 2: 'danger' }
const ACTIVITY_STATUS_TEXT = { 0: '报名中', 1: '已满员', 2: '已结束', 3: '已下架' }
const ACTIVITY_STATUS_TYPE = { 0: 'success', 1: 'warning', 2: '', 3: 'danger' }
const LOST_FOUND_STATUS_TEXT = { 0: '寻找中', 1: '已完成', 2: '已下架' }
const LOST_FOUND_STATUS_TYPE = { 0: 'warning', 1: 'success', 2: 'danger' }
const APPOINT_TEXT = { 0: '待确认', 1: '已接受', 2: '已拒绝', 3: '已完成', 4: '已取消' }
const APPOINT_TYPE = { 0: 'warning', 1: 'success', 2: 'danger', 3: '', 4: 'danger' }

Page({
  data: {
    logged: false,
    userInfo: null,
    tabs: MY_TABS,
    activeTab: 'idle',
    appointRole: 'buyer',
    list: [],
    pageNum: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    inited: false,
    entries: [
      { icon: '🐞', name: '错题本', url: '/pages-ai/wrong/wrong' },
      { icon: '🤖', name: 'AI答疑', url: '/pages-ai/chat/chat' },
      { icon: '📑', name: '提纲生成', url: '/pages-ai/outline/outline' },
      { icon: '📄', name: 'PDF问答', url: '/pages-ai/pdf/pdf' },
      { icon: '🧩', name: '代码纠错', url: '/pages-ai/code-fix/code-fix' },
      { icon: '📷', name: '活动签到', url: '/pages-activity/signin/signin' },
      { icon: '⚙️', name: '后端设置', url: '/pages/settings/backend/backend' },
      { icon: '🔥', name: '动态广场', url: '/pages-post/square/square' }
    ]
  },

  onShow() {
    const pendingTab = consumePendingMyTab()
    if (pendingTab && pendingTab !== this.data.activeTab) {
      this.setData({ activeTab: pendingTab }, () => {
        this.refreshPage()
      })
      return
    }
    this.refreshPage()
  },

  refreshPage() {
    const logged = isLoggedIn()
    this.setData({ logged, userInfo: normalizeUserInfo(getUserInfo()) })
    if (!logged) {
      this.setData({ list: [], inited: true })
      return
    }
    this.loadUserInfo()
    this.loadList(true)
  },

  async onPullDownRefresh() {
    if (!this.data.logged) {
      wx.stopPullDownRefresh()
      return
    }
    try {
      await this.loadList(true)
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  onReachBottom() {
    if (this.data.logged && this.data.hasMore && !this.data.loading) {
      this.loadList(false)
    }
  },

  async loadUserInfo() {
    try {
      const data = normalizeUserInfo(await request({ url: '/user/info' }))
      this.setData({ userInfo: data })
      setLogin(wx.getStorageSync('token') || '', data)
    } catch (e) {}
  },

  async loadList(reset) {
    if (this.data.loading) return
    const tab = MY_TABS.find((t) => t.key === this.data.activeTab)
    if (!tab) return

    const pageNum = reset ? 1 : this.data.pageNum + 1
    this.setData({ loading: true })
    try {
      const params = { pageNum, pageSize: this.data.pageSize }
      if (tab.key === 'appoint') {
        params.role = this.data.appointRole
      }
      const data = await request({ url: tab.url, data: params })
      const rows = (data.list || []).map((item) => this.normalize(tab.key, item))
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

  normalize(key, item) {
    if (key === 'idle') {
      const images = item.imageList && item.imageList.length ? item.imageList : parseImages(item.images)
      return {
        id: item.id,
        cover: images[0] || '',
        title: item.title || '',
        desc: `期待物：${item.expectItem || '面议'}`,
        extra: shortTime(item.createTime),
        tagText: AUDIT_TEXT[item.auditStatus] || '',
        tagType: AUDIT_TYPE[item.auditStatus] || '',
        url: `/pages-idle/detail/detail?id=${item.id}`
      }
    }

    if (key === 'activity') {
      const images = item.imageList && item.imageList.length ? item.imageList : parseImages(item.images)
      return {
        id: item.id,
        cover: images[0] || '',
        title: item.title || '',
        desc: `${item.location || '地点待定'} · 已报名 ${item.memberCount || 0} 人`,
        extra: shortTime(item.startTime || item.createTime),
        tagText: item.auditStatus !== 1 ? (AUDIT_TEXT[item.auditStatus] || '') : (ACTIVITY_STATUS_TEXT[item.status] || '已通过'),
        tagType: item.auditStatus !== 1 ? (AUDIT_TYPE[item.auditStatus] || '') : (ACTIVITY_STATUS_TYPE[item.status] || 'success'),
        url: `/pages-activity/detail/detail?id=${item.id}`
      }
    }

    if (key === 'lostfound') {
      const images = item.imageList && item.imageList.length ? item.imageList : parseImages(item.images)
      return {
        id: item.id,
        cover: images[0] || '',
        title: `${item.type === 0 ? '[失物]' : '[招领]'} ${item.title || ''}`,
        desc: item.location || '地点未填',
        extra: shortTime(item.createTime),
        tagText: item.auditStatus !== 1 ? (AUDIT_TEXT[item.auditStatus] || '') : (LOST_FOUND_STATUS_TEXT[item.status] || '已通过'),
        tagType: item.auditStatus !== 1 ? (AUDIT_TYPE[item.auditStatus] || '') : (LOST_FOUND_STATUS_TYPE[item.status] || 'success'),
        url: `/pages-lostfound/detail/detail?id=${item.id}`
      }
    }

    if (key === 'signup') {
      return {
        id: item.id,
        cover: '',
        title: item.activityTitle || '活动',
        desc: `备注：${item.remark || '无'}`,
        extra: `${item.signedIn ? '已签到 · ' : ''}${shortTime(item.createTime)}`,
        tagText: MEMBER_TEXT[item.status] || '',
        tagType: MEMBER_TYPE[item.status] || '',
        url: `/pages-activity/detail/detail?id=${item.activityId}`
      }
    }

    return {
      id: item.id,
      cover: item.itemImage || '',
      title: item.itemTitle || '闲置物品',
      desc: `留言：${item.message || '无'}`,
      extra: shortTime(item.createTime),
      tagText: APPOINT_TEXT[item.status] || '',
      tagType: APPOINT_TYPE[item.status] || '',
      appointStatus: item.status,
      appointRole: this.data.appointRole,
      reviewed: !!item.reviewed,
      url:
        item.status === 3 && !item.reviewed
          ? `/pages-idle/review/review?appointmentId=${item.id}&title=${encodeURIComponent(item.itemTitle || '')}`
          : `/pages-idle/detail/detail?id=${item.itemId}`
    }
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeTab) return
    this.setData({ activeTab: key, list: [], pageNum: 1, hasMore: true, inited: false })
    this.loadList(true)
  },

  tapItem(e) {
    const url = e.currentTarget.dataset.url
    if (url) wx.navigateTo({ url })
  },

  switchAppointRole(e) {
    const role = e.currentTarget.dataset.role
    if (role === this.data.appointRole) return
    this.setData({ appointRole: role, list: [], pageNum: 1, hasMore: true })
    this.loadList(true)
  },

  handleAppoint(e) {
    const { appointmentId, accept } = e.currentTarget.dataset
    if (!appointmentId) return
    const isAccept = accept === 'true'
    wx.showModal({
      title: '处理预约',
      content: isAccept ? '确定接受该预约吗？' : '确定拒绝该预约吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request({
            url: `/idle/appoint/${appointmentId}/handle`,
            method: 'PUT',
            data: { accept: isAccept }
          })
          wx.showToast({ title: isAccept ? '已接受' : '已拒绝', icon: 'success' })
          this.loadList(true)
        } catch (err) {}
      }
    })
  },

  finishAppoint(e) {
    const appointmentId = e.currentTarget.dataset.appointmentId
    if (!appointmentId) return
    wx.showModal({
      title: '确认完成',
      content: '确认这次互换已经完成吗？确认后将进入互评环节。',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request({
            url: `/idle/appoint/${appointmentId}/finish`,
            method: 'PUT'
          })
          wx.showToast({ title: '已完成', icon: 'success' })
          this.loadList(true)
        } catch (err) {}
      }
    })
  },

  goEntry(e) {
    const url = e.currentTarget.dataset.url
    if (url === '/pages/settings/backend/backend') {
      wx.navigateTo({ url })
      return
    }
    if (!isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    wx.navigateTo({ url })
  },

  goProfile() {
    if (!this.data.logged) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    wx.navigateTo({ url: '/pages/profile/profile' })
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  doLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (!res.confirm) return
        logout()
        try {
          wx.removeTabBarBadge({ index: 1 })
        } catch (e) {}
        this.setData({ logged: false, userInfo: null, list: [], total: 0 })
        wx.showToast({ title: '已退出登录', icon: 'success' })
      }
    })
  }
})
