// 聊天气泡组件：用户右侧，AI 左侧（Markdown 以纯文本降级渲染，可接 towxml）
Component({
  properties: {
    role: { type: String, value: 'user' }, // user / assistant
    content: { type: String, value: '' },
    nickname: { type: String, value: '我' },
    avatar: { type: String, value: '' }
  },
  data: {
    avatarFailed: false
  },
  observers: {
    avatar() {
      this.setData({ avatarFailed: false })
    }
  },
  methods: {
    avatarError(e) {
      console.warn('聊天头像加载失败', this.properties.avatar, e.detail)
      this.setData({ avatarFailed: true })
    }
  }
})
