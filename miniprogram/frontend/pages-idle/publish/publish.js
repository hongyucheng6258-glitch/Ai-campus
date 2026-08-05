// 发布闲置（分包 pages-idle）：POST /idle
// 图片通过 upload-grid 组件上传（内部走 /upload/image），提交时传 URL 数组
// 发布后进入待审核（audit_status=0），审核通过后才在前台列表可见
const { request } = require('../../utils/request')
const { requireLogin } = require('../../utils/auth')

/** 分类选项（与列表页保持一致，去掉"全部"） */
const CATEGORIES = ['书籍教材', '数码电子', '生活用品', '运动器材', '服饰鞋包', '其他']

Page({
  data: {
    categories: CATEGORIES,
    categoryIndex: 0,
    title: '',
    description: '',
    expectItem: '',
    images: [],       // 已上传图片 URL 数组
    submitting: false
  },

  onLoad() {
    requireLogin()
  },

  /** 文本输入统一处理 */
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  /** 分类选择 */
  onCategoryChange(e) {
    this.setData({ categoryIndex: Number(e.detail.value) })
  },

  /** upload-grid 图片变更回调 */
  onImagesChange(e) {
    this.setData({ images: e.detail || [] })
  },

  /** 提交发布 */
  async submit() {
    const title = (this.data.title || '').trim()
    if (!title) {
      wx.showToast({ title: '请填写物品标题', icon: 'none' })
      return
    }
    if (title.length > 64) {
      wx.showToast({ title: '标题最长64字', icon: 'none' })
      return
    }
    if (this.data.images.length === 0) {
      wx.showToast({ title: '请至少上传一张实物图', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    if (!requireLogin()) return

    this.setData({ submitting: true })
    try {
      await request({
        url: '/idle',
        method: 'POST',
        data: {
          title,
          description: (this.data.description || '').trim(),
          images: this.data.images,
          expectItem: (this.data.expectItem || '').trim(),
          category: this.data.categories[this.data.categoryIndex]
        }
      })
      wx.showModal({
        title: '发布成功',
        content: '内容已提交审核，管理员通过后会展示在闲置列表中。',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
    } catch (e) {
      // 敏感词(1001)等错误由 request 统一 toast
    } finally {
      this.setData({ submitting: false })
    }
  }
})
