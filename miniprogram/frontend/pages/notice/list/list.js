// 校园公告列表页：GET /notice/list（分页 pageNum/pageSize，后端仅返回已发布 status=1）
const { request } = require('../../../utils/request')
const { shortTime } = require('../../../utils/format')

Page({
  data: {
    list: [],        // 公告列表
    pageNum: 1,      // 当前页码（共享约定：分页参数 pageNum/pageSize）
    pageSize: 10,    // 每页条数
    total: 0,        // 总条数
    hasMore: true,   // 是否还有下一页
    loading: false,  // 加载中标记，防抖
    inited: false    // 首次加载完成标记，用于区分"空列表"与"未加载"
  },

  onLoad() {
    this.loadList(true)
  },

  /** 下拉刷新：重置到第一页 */
  onPullDownRefresh() {
    this.loadList(true).then(() => wx.stopPullDownRefresh())
  },

  /** 触底加载下一页 */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadList(false)
    }
  },

  /**
   * 加载公告列表。
   * @param {Boolean} reset true=重置到第一页，false=追加下一页
   */
  async loadList(reset) {
    if (this.data.loading) return
    const pageNum = reset ? 1 : this.data.pageNum + 1
    this.setData({ loading: true })
    try {
      const data = await request({
        url: '/notice/list',
        data: { pageNum, pageSize: this.data.pageSize }
      })
      // 后端统一分页响应：{ total, pages, list }
      const rows = (data.list || []).map((item) => ({
        ...item,
        publishTimeText: shortTime(item.publishTime || item.createTime)
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

  /** 跳转公告详情 */
  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/notice/detail/detail?id=${id}` })
  }
})
