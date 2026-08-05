// 闲置互换列表（分包 pages-idle）：GET /idle/list?keyword&category&pageNum&pageSize
// 后端已强制过滤 audit_status=1（仅展示审核通过内容，共享约定 #3）
const { request } = require('../../utils/request')
const { shortTime, parseImages } = require('../../utils/format')
const { requireLogin } = require('../../utils/auth')

/** 闲置分类（与管理端字典保持一致） */
const CATEGORIES = ['全部', '书籍教材', '数码电子', '生活用品', '运动器材', '服饰鞋包', '其他']

/** 物品状态文案（idle_item.status 0在架1已预约2已完成3已下架） */
const STATUS_TEXT = { 0: '在架', 1: '已预约', 2: '已完成', 3: '已下架' }
const STATUS_TYPE = { 0: 'success', 1: 'warning', 2: '', 3: 'danger' }

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
    // 从发布页返回时刷新，保证新发布内容（待审核）状态及时体现
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
   * 加载闲置列表。
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
      const data = await request({ url: '/idle/list', data: params })
      const rows = (data.list || []).map((item) => {
        const images = item.imageList && item.imageList.length ? item.imageList : parseImages(item.images)
        return {
          id: item.id,
          cover: images[0] || '',
          title: item.title || '',
          desc: '期望换：' + (item.expectItem || '面议'),
          extra: (item.publisherNickname || '同学') + ' · ' + shortTime(item.createTime),
          tagText: STATUS_TEXT[item.status] || '',
          tagType: STATUS_TYPE[item.status] || ''
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

  /** 搜索关键词输入 */
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
    wx.navigateTo({ url: `/pages-idle/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  /** 跳转发布页（需登录） */
  goPublish() {
    if (!requireLogin()) return
    this.data.needRefresh = true
    wx.navigateTo({ url: '/pages-idle/publish/publish' })
  }
})
