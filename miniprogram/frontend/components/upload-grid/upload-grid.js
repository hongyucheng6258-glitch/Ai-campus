// 九宫格图片上传组件：wx.chooseMedia → /upload/image → URL 数组
const { uploadFile } = require('../../utils/request')

Component({
  properties: {
    value: { type: Array, value: [] },
    max: { type: Number, value: 9 }
  },
  methods: {
    // 选择并上传图片
    choose() {
      const remain = this.data.max - this.data.value.length
      if (remain <= 0) return
      wx.chooseMedia({
        count: remain,
        mediaType: ['image'],
        success: async (res) => {
          wx.showLoading({ title: '上传中' })
          try {
            const urls = [...this.data.value]
            for (const f of res.tempFiles) {
              const data = await uploadFile(f.tempFilePath, 'image')
              urls.push(data.url)
            }
            this.triggerEvent('change', urls)
          } finally {
            wx.hideLoading()
          }
        }
      })
    },
    remove(e) {
      const urls = [...this.data.value]
      urls.splice(e.currentTarget.dataset.index, 1)
      this.triggerEvent('change', urls)
    },
    preview(e) {
      wx.previewImage({
        current: this.data.value[e.currentTarget.dataset.index],
        urls: this.data.value
      })
    }
  }
})
