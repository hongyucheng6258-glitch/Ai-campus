const { request } = require('../../utils/request')
const { requireLogin } = require('../../utils/auth')
const { fromNow, parseImages } = require('../../utils/format')
const { normalizeAssetUrl } = require('../../utils/avatar')
const startChat = require('../../utils/start-chat')

Page({
  data: {
    list: [],
    pageNum: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    inited: false
  },

  onShow() {
    this.loadList(true)
  },

  onPullDownRefresh() {
    this.loadList(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadList(false)
    }
  },

  async loadList(reset) {
    if (this.data.loading) return
    const pageNum = reset ? 1 : this.data.pageNum + 1
    this.setData({ loading: true })
    try {
      const data = await request({ url: '/post/list', data: { pageNum, pageSize: this.data.pageSize } })
      const rows = (data.list || []).map((item) => this.normalize(item))
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

  normalize(item) {
    const images = item.imageList && item.imageList.length ? item.imageList : parseImages(item.images)
    return {
      id: item.id,
      userId: item.userId,
      nickname: item.nickname || '校园用户',
      avatar: normalizeAssetUrl(item.avatar, getApp().globalData.baseUrl),
      content: item.content || '',
      images,
      likeCount: item.likeCount || 0,
      commentCount: item.commentCount || 0,
      liked: !!item.liked,
      time: fromNow(item.createTime)
    }
  },

  async toggleLike(e) {
    if (!requireLogin()) return
    const index = e.currentTarget.dataset.index
    const post = this.data.list[index]
    if (!post) return
    const liked = post.liked
    this.setData({ [`list[${index}].liked`]: !liked, [`list[${index}].likeCount`]: post.likeCount + (liked ? -1 : 1) })
    try {
      if (liked) {
        await request({ url: `/post/${post.id}/like`, method: 'DELETE' })
      } else {
        await request({ url: `/post/${post.id}/like`, method: 'POST' })
      }
    } catch (e) {
      this.setData({ [`list[${index}].liked`]: liked, [`list[${index}].likeCount`]: post.likeCount })
    }
  },

  previewImages(e) {
    const { urls, current } = e.currentTarget.dataset
    wx.previewImage({ current, urls })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages-post/detail/detail?id=${id}` })
  },

  goPublish() {
    if (!requireLogin()) return
    wx.navigateTo({ url: '/pages-post/publish/publish' })
  },

  goChat(e) {
    if (!requireLogin()) return
    const index = e.currentTarget.dataset.index
    const post = this.data.list[index]
    if (!post) return
    const title = String(post.content || '').trim().slice(0, 60) || '校园动态'
    startChat(post.userId, { type: 'post', id: post.id, title })
  }
})
