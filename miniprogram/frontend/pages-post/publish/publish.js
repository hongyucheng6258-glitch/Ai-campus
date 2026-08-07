const { request, uploadFile } = require('../../utils/request')
const { normalizeAssetUrl } = require('../../utils/avatar')

Page({
  data: {
    content: '',
    images: [],
    submitting: false,
    uploading: false
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  chooseImages() {
    const remain = 9 - this.data.images.length
    if (remain <= 0) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImages(res.tempFiles.map((f) => f.tempFilePath))
      }
    })
  },

  async uploadImages(paths) {
    if (this.data.uploading) return
    this.setData({ uploading: true })
    wx.showLoading({ title: '上传中' })
    const app = getApp()
    try {
      const uploaded = []
      for (const path of paths) {
        const data = await uploadFile(path, 'image')
        uploaded.push(normalizeAssetUrl(data.url, app.globalData.baseUrl))
      }
      this.setData({ images: this.data.images.concat(uploaded) })
    } catch (e) {
      wx.showToast({ title: '部分图片上传失败', icon: 'none' })
    } finally {
      wx.hideLoading()
      this.setData({ uploading: false })
    }
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.images.filter((_, i) => i !== index)
    this.setData({ images })
  },

  previewImage(e) {
    const { current, urls } = e.currentTarget.dataset
    wx.previewImage({ current, urls })
  },

  async submit() {
    const content = this.data.content.trim()
    if (!content) {
      wx.showToast({ title: '请输入动态内容', icon: 'none' })
      return
    }
    if (content.length > 2000) {
      wx.showToast({ title: '内容不能超过2000字', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      await request({
        url: '/post',
        method: 'POST',
        data: { content, images: this.data.images }
      })
      wx.showToast({ title: '发布成功，待审核', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (e) {
    } finally {
      this.setData({ submitting: false })
    }
  }
})
