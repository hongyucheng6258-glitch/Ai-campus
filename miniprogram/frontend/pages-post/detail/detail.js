const { request } = require('../../utils/request')
const { requireLogin } = require('../../utils/auth')
const { fromNow, parseImages } = require('../../utils/format')
const { normalizeAssetUrl } = require('../../utils/avatar')
const startChat = require('../../utils/start-chat')

Page({
  data: {
    id: null,
    post: null,
    comments: [],
    commentText: '',
    pageNum: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,
    loading: false,
    submitting: false
  },

  onLoad(options) {
    this.setData({ id: options.id })
    this.loadPost()
    this.loadComments(true)
  },

  async loadPost() {
    try {
      const data = await request({ url: '/post/list', data: { pageNum: 1, pageSize: 50 } })
      const post = (data.list || []).find((p) => String(p.id) === String(this.data.id))
      if (post) {
        const images = post.imageList && post.imageList.length ? post.imageList : parseImages(post.images)
        this.setData({
          post: {
            id: post.id,
            userId: post.userId,
            nickname: post.nickname || '校园用户',
            avatar: normalizeAssetUrl(post.avatar, getApp().globalData.baseUrl),
            content: post.content || '',
            images,
            likeCount: post.likeCount || 0,
            commentCount: post.commentCount || 0,
            liked: !!post.liked,
            time: fromNow(post.createTime)
          }
        })
      }
    } catch (e) {}
  },

  async loadComments(reset) {
    if (this.data.loading) return
    const pageNum = reset ? 1 : this.data.pageNum + 1
    this.setData({ loading: true })
    try {
      const data = await request({ url: `/post/${this.data.id}/comments`, data: { pageNum, pageSize: this.data.pageSize } })
      const rows = (data.list || []).map((c) => ({
        id: c.id,
        nickname: c.nickname || '校园用户',
        avatar: normalizeAssetUrl(c.avatar, getApp().globalData.baseUrl),
        content: c.content || '',
        time: fromNow(c.createTime)
      }))
      const comments = reset ? rows : this.data.comments.concat(rows)
      this.setData({
        comments,
        pageNum,
        total: data.total || 0,
        hasMore: comments.length < (data.total || 0)
      })
    } catch (e) {
    } finally {
      this.setData({ loading: false })
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadComments(false)
    }
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value })
  },

  async toggleLike() {
    if (!requireLogin()) return
    const post = this.data.post
    if (!post) return
    const liked = post.liked
    this.setData({ 'post.liked': !liked, 'post.likeCount': post.likeCount + (liked ? -1 : 1) })
    try {
      if (liked) {
        await request({ url: `/post/${post.id}/like`, method: 'DELETE' })
      } else {
        await request({ url: `/post/${post.id}/like`, method: 'POST' })
      }
    } catch (e) {
      this.setData({ 'post.liked': liked, 'post.likeCount': post.likeCount })
    }
  },

  previewImages(e) {
    const { urls, current } = e.currentTarget.dataset
    wx.previewImage({ current, urls })
  },

  async submitComment() {
    const text = this.data.commentText.trim()
    if (!text) return wx.showToast({ title: '请输入评论', icon: 'none' })
    if (text.length > 500) return wx.showToast({ title: '评论不能超过500字', icon: 'none' })
    if (!requireLogin()) return
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      await request({ url: `/post/${this.data.id}/comment`, method: 'POST', data: { content: text } })
      this.setData({ commentText: '' })
      wx.showToast({ title: '评论成功', icon: 'success' })
      this.loadComments(true)
      this.setData({ 'post.commentCount': this.data.post.commentCount + 1 })
    } catch (e) {
    } finally {
      this.setData({ submitting: false })
    }
  },

  goChat() {
    const post = this.data.post
    if (!post) return
    const title = String(post.content || '').trim().slice(0, 60) || '校园动态'
    startChat(post.userId, { type: 'post', id: post.id, title })
  }
})
