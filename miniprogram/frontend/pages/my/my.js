// 我的：资料展示 + 我的发布（闲置/活动/失物） + 我的报名 + 我的预约 + 错题本入口 + 退出登录
const { request } = require('../../utils/request')
const { shortTime, parseImages } = require('../../utils/format')
const { isLoggedIn, getUserInfo, logout, setLogin } = require('../../utils/auth')

/** 我的内容分组：key → 后端接口 */
const MY_TABS = [
  { key: 'idle', name: '我的闲置', url: '/idle/my' },
  { key: 'activity', name: '我的活动', url: '/activity/my' },
  { key: 'lostfound', name: '我的失物', url: '/lostfound/my' },
  { key: 'signup', name: '我的报名', url: '/activity/my/signups' },
  { key: 'appoint', name: '我的预约', url: '/idle/appoint/my' }
]

/** 审核状态文案（共享约定：0待审核/1通过/2驳回） */
const AUDIT_TEXT = { 0: '待审核', 1: '已通过', 2: '已驳回' }
const AUDIT_TYPE = { 0: 'warning', 1: 'success', 2: 'danger' }

/** 报名状态文案（Constants.MEMBER_*） */
const MEMBER_TEXT = { 0: '待审批', 1: '已通过', 2: '未通过' }
const MEMBER_TYPE = { 0: 'warning', 1: 'success', 2: 'danger' }

/** 预约状态文案（Constants.APPOINT_*） */
const APPOINT_TEXT = { 0: '待确认', 1: '已接受', 2: '已拒绝', 3: '已完成', 4: '已取消' }
const APPOINT_TYPE = { 0: 'warning', 1: 'success', 2: 'danger', 3: '', 4: 'danger' }

Page({
  data: {
    logged: false,
    userInfo: null,
    tabs: MY_TABS,
    activeTab: 'idle',
    list: [],
    pageNum: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    inited: false,
    // 常用功能入口
    entries: [
      { icon: '📕', name: '错题本', url: '/pages-ai/wrong/wrong' },
      { icon: '🤖', name: 'AI答疑', url: '/pages-ai/chat/chat' },
      { icon: '📝', name: '提纲生成', url: '/pages-ai/outline/outline' },
      { icon: '📄', name: 'PDF问答', url: '/pages-ai/pdf/pdf' },
      { icon: '💻', name: '代码纠错', url: '/pages-ai/code-fix/code-fix' },
      { icon: '📷', name: '活动签到', url: '/pages-activity/signin/signin' }
    ]
  },

  onShow() {
    const logged = isLoggedIn()
    this.setData({ logged, userInfo: getUserInfo() })
    if (!logged) {
      this.setData({ list: [], inited: true })
      return
    }
    this.loadUserInfo()
    this.loadList(true)
  },

  onPullDownRefresh() {
    if (!this.data.logged) {
      wx.stopPullDownRefresh()
      return
    }
    this.loadList(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.logged && this.data.hasMore && !this.data.loading) {
      this.loadList(false)
    }
  },

  /** 拉取最新用户资料（GET /user/info），同步刷新本地缓存 */
  async loadUserInfo() {
    try {
      const data = await request({ url: '/user/info' })
      this.setData({ userInfo: data })
      // 复用 auth.setLogin 只更新 userInfo，token 保持不变
      setLogin(wx.getStorageSync('token') || '', data)
    } catch (e) {
      // 静默失败，继续用本地缓存展示
    }
  },

  /**
   * 加载"我的"某个分组列表，并归一化为统一卡片结构。
   * @param {Boolean} reset true=重置第一页
   */
  async loadList(reset) {
    if (this.data.loading) return
    const tab = MY_TABS.find((t) => t.key === this.data.activeTab)
    if (!tab) return
    const pageNum = reset ? 1 : this.data.pageNum + 1
    this.setData({ loading: true })
    try {
      const params = { pageNum, pageSize: this.data.pageSize }
      // 我的预约默认看买家视角（我发起的预约）
      if (tab.key === 'appoint') {
        params.role = 'buyer'
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

  /**
   * 把不同业务的数据结构统一成卡片字段，便于 WXML 复用一套渲染。
   * @param {String} key  分组标识
   * @param {Object} item 原始数据
   * @returns {Object} { id, cover, title, desc, extra, tagText, tagType, url }
   */
  normalize(key, item) {
    if (key === 'idle') {
      const images = item.imageList && item.imageList.length ? item.imageList : parseImages(item.images)
      return {
        id: item.id,
        cover: images[0] || '',
        title: item.title || '',
        desc: '期望换：' + (item.expectItem || '面议'),
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
        desc: (item.location || '地点待定') + ' · 已报名 ' + (item.memberCount || 0) + ' 人',
        extra: shortTime(item.startTime || item.createTime),
        tagText: AUDIT_TEXT[item.auditStatus] || '',
        tagType: AUDIT_TYPE[item.auditStatus] || '',
        url: `/pages-activity/detail/detail?id=${item.id}`
      }
    }
    if (key === 'lostfound') {
      const images = item.imageList && item.imageList.length ? item.imageList : parseImages(item.images)
      return {
        id: item.id,
        cover: images[0] || '',
        title: (item.type === 0 ? '[失物] ' : '[招领] ') + (item.title || ''),
        desc: item.location || '地点未填写',
        extra: shortTime(item.createTime),
        tagText: AUDIT_TEXT[item.auditStatus] || '',
        tagType: AUDIT_TYPE[item.auditStatus] || '',
        url: `/pages-lostfound/detail/detail?id=${item.id}`
      }
    }
    if (key === 'signup') {
      // MemberVO：继承 ActivityMember，含 activityTitle / status / signedIn
      return {
        id: item.id,
        cover: '',
        title: item.activityTitle || '活动',
        desc: '备注：' + (item.remark || '无'),
        extra: (item.signedIn ? '已签到 · ' : '') + shortTime(item.createTime),
        tagText: MEMBER_TEXT[item.status] || '',
        tagType: MEMBER_TYPE[item.status] || '',
        url: `/pages-activity/detail/detail?id=${item.activityId}`
      }
    }
    // appoint：AppointmentVO 继承 IdleAppointment
    return {
      id: item.id,
      cover: item.itemImage || '',
      title: item.itemTitle || '闲置物品',
      desc: '留言：' + (item.message || '无'),
      extra: shortTime(item.createTime),
      tagText: APPOINT_TEXT[item.status] || '',
      tagType: APPOINT_TYPE[item.status] || '',
      // 已完成且未评价的预约，点击直接去评价页
      url: (item.status === 3 && !item.reviewed)
        ? `/pages-idle/review/review?appointmentId=${item.id}&title=${encodeURIComponent(item.itemTitle || '')}`
        : `/pages-idle/detail/detail?id=${item.itemId}`
    }
  },

  /** 切换分组 */
  switchTab(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeTab) return
    this.setData({ activeTab: key, list: [], pageNum: 1, hasMore: true, inited: false })
    this.loadList(true)
  },

  /** 点击卡片跳转业务详情 */
  tapItem(e) {
    const url = e.currentTarget.dataset.url
    if (url) wx.navigateTo({ url })
  },

  /** 功能入口跳转（均需登录） */
  goEntry(e) {
    const url = e.currentTarget.dataset.url
    if (!isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    wx.navigateTo({ url })
  },

  /** 跳转登录页 */
  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  /** 退出登录：清空本地登录态并回到首页 */
  doLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (!res.confirm) return
        logout()
        wx.removeTabBarBadge({ index: 1 }).catch(() => {})
        this.setData({ logged: false, userInfo: null, list: [], total: 0 })
        wx.showToast({ title: '已退出登录', icon: 'success' })
      }
    })
  }
})
