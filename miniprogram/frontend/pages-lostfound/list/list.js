// 失物招领列表（分包 pages-lostfound）
// 接口前缀为 /lostfound（与后端 LostFoundController @RequestMapping("/api/lostfound") 一致）
// GET /lostfound/list?type&keyword&pageNum&pageSize，后端仅返回 audit_status=1
const { request } = require('../../utils/request')
const { shortTime, parseImages } = require('../../utils/format')
const { requireLogin } = require('../../utils/auth')

/** 类型筛选：'' 全部 / 0 失物 / 1 招领 */
const TYPE_TABS = [
  { key: '', name: '全部' },
  { key: 0, name: '我丢了（失物）' },
  { key: 1, name: '我捡到（招领）' }
]

/** 处理状态文案（lost_found.status 0进行中1已完成2已下架） */
const STATUS_TEXT = { 0: '寻找中', 1: '已完成', 2: '已下架' }
const STATUS_TYPE = { 0: 'warning', 1: 'success', 2: 'danger' }

Page({
  data: {
    typeTabs: TYPE_TABS,
    activeType: '',
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
   * 加载失物招领列表。
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
      // 注意 type=0 是合法值，不能用真值判断
      if (this.data.activeType === 0 || this.data.activeType === 1) {
        params.type = this.data.activeType
      }
      const data = await request({ url: '/lostfound/list', data: params })
      const rows = (data.list || []).map((item) => {
        const images = item.imageList && item.imageList.length ? item.imageList : parseImages(item.images)
        return {
          id: item.id,
          cover: images[0] || '',
          title: (item.type === 0 ? '[失物] ' : '[招领] ') + (item.title || ''),
          desc: '📍 ' + (item.location || '地点未填写'),
          extra: (item.publisherNickname || '同学') + ' · ' + shortTime(item.happenTime || item.createTime),
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

  /** 关键词输入 */
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  /** 触发搜索 */
  doSearch() {
    this.setData({ list: [], pageNum: 1, hasMore: true, inited: false })
    this.loadList(true)
  },

  /** 切换类型 */
  switchType(e) {
    const key = e.currentTarget.dataset.key
    // dataset 取到的是字符串，需要还原为 '' / 0 / 1
    const type = key === '' ? '' : Number(key)
    if (type === this.data.activeType) return
    this.setData({ activeType: type, list: [], pageNum: 1, hasMore: true, inited: false })
    this.loadList(true)
  },

  /** 跳转详情 */
  goDetail(e) {
    wx.navigateTo({ url: `/pages-lostfound/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  /** 跳转发布页 */
  goPublish() {
    if (!requireLogin()) return
    this.data.needRefresh = true
    wx.navigateTo({ url: '/pages-lostfound/publish/publish' })
  }
})
