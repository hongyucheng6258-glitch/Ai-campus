// 通用内容卡片组件（闲置/活动/失物列表复用）
Component({
  properties: {
    cover: { type: String, value: '' },
    title: { type: String, value: '' },
    desc: { type: String, value: '' },
    tagText: { type: String, value: '' },
    tagType: { type: String, value: '' }, // danger/success/warning
    extra: { type: String, value: '' }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap')
    }
  }
})
