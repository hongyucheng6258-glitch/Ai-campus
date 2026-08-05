// 校园公告详情页：GET /notice/{id}
const { request } = require('../../../utils/request')
const { shortTime, md2plain } = require('../../../utils/format')

Page({
  data: {
    id: null,      // 公告ID
    notice: null,  // 公告详情对象
    loading: true  // 加载中
  },

  onLoad(options) {
    const id = options.id ? Number(options.id) : null
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      this.setData({ loading: false })
      return
    }
    this.setData({ id })
    this.loadDetail(id)
  },

  /**
   * 加载公告详情。
   * @param {Number} id 公告ID
   */
  async loadDetail(id) {
    try {
      const data = await request({ url: `/notice/${id}` })
      this.setData({
        notice: {
          ...data,
          publishTimeText: shortTime(data.publishTime || data.createTime),
          // 公告正文可能含简单 Markdown，无 towxml 时降级为纯文本展示
          plainContent: md2plain(data.content)
        }
      })
      wx.setNavigationBarTitle({ title: data.title || '公告详情' })
    } catch (e) {
      // 错误提示已由 request 统一 toast
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 复制公告正文，方便学生转发 */
  copyContent() {
    if (!this.data.notice) return
    wx.setClipboardData({
      data: this.data.notice.plainContent || '',
      success() {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  /** 预览封面大图 */
  previewCover() {
    const cover = this.data.notice && this.data.notice.cover
    if (!cover) return
    wx.previewImage({ current: cover, urls: [cover] })
  }
})
