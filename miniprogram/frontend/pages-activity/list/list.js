// 活动组队列表（分包 pages-activity）：GET /activity/list?keyword&category&pageNum&pageSize
// 后端仅返回 audit_status=1 的活动（共享约定 #3）
const { request } = require('../../utils/request')
const { shortTime, parseImages } = require('../../utils/format')
const { requireLogin } = require('../../utils/auth')
const { goMyTab } = require('../../utils/tab-navigation')

/** 活动分类 */
const CATEGORIES = ['全部', '学习竞赛', '文体活动', '志愿公益', '社团招新', '讲座沙龙', '其他']

/** 活动状态文案（后端 displayStatus：0报名中 1已满员 2报名已截止 3活动进行中 4已结束 5已下架） */
const STATUS_TEXT = { 0: '报名中', 1: '已满员', 2: '报名已截止', 3: '活动进行中', 4: '已结束', 5: '已下架' }
const STATUS_TYPE = { 0: 'success', 1: 'warning', 2: '', 3: '', 4: '', 5: 'danger' }

Page({
  data: {
    categories: CATEGORIES,
    activeCategory: '全部',
    keyword: '',
    list: [],
    pageNum: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    inited: false
  },

  onLoad() {
    this.loadList(true)
  },

  onShow() {
    if (this.data.needRefresh) {
      this.data.needRefresh = false
      this.loadList(true)
    }
  },

  onPullDownRefresh() {
    this.loadList(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadList(false)
    }
  },

  /**
   * 加载活动列表。
   * @param {Boolean} reset true=重置第一页
   */
  async loadList(reset) {
    if (this.data.loading) return
    const pageNum = reset ? 1 : this.data.pageNum + 1
    this.setData({ loading: true })
    try {
      const params = { pageNum, pageSize: this.data.pageSize }
      if (this.data.keyword.trim()) {
        params.keyword = this.data.keyword.trim()
      }
      if (this.data.activeCategory && this.data.activeCategory !== '全部') {
        params.category = this.data.activeCategory
      }
      const data = await request({ url: '/activity/list', data: params })
      const rows = (data.list || []).map((item) => {
        const images = item.imageList && item.imageList.length ? item.imageList : parseImages(item.images)
        const limit = item.maxMembers ? `/${item.maxMembers}` : ''
        return {
          id: item.id,
          cover: images[0] || '',
          title: item.title || '',
          desc: '📍 ' + (item.location || '地点待定') + ' · 已报名 ' + (item.memberCount || 0) + limit + ' 人',
          extra: '开始：' + (shortTime(item.startTime) || '待定'),
          tagText: item.displayStatusText || STATUS_TEXT[item.displayStatus ?? item.status] || '',
          tagType: STATUS_TYPE[item.displayStatus ?? item.status] || ''
        }
      })
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

  /** 关键词输入 */
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  /** 触发搜索 */
  doSearch() {
    this.setData({ list: [], pageNum: 1, hasMore: true, inited: false })
    this.loadList(true)
  },

  /** 切换分类 */
  switchCategory(e) {
    const category = e.currentTarget.dataset.category
    if (category === this.data.activeCategory) return
    this.setData({ activeCategory: category, list: [], pageNum: 1, hasMore: true, inited: false })
    this.loadList(true)
  },

  /** 跳转详情 */
  goDetail(e) {
    wx.navigateTo({ url: `/pages-activity/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  /** 跳转发布页 */
  goPublish() {
    if (!requireLogin()) return
    this.data.needRefresh = true
    wx.navigateTo({ url: '/pages-activity/publish/publish' })
  },

  /** 跳转扫码签到页 */
  /** 璺宠浆鎴戠殑鎶ュ悕 */
  goMySignups() {
    goMyTab('signup')
  },

  goSignin() {
    if (!requireLogin()) return
    wx.navigateTo({ url: '/pages-activity/signin/signin' })
  }
})
