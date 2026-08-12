// AI 学习中心（分包 pages-ai 首页）：集中进入各 AI 能力
const { requireLogin } = require('../../utils/auth')

const AI_ENTRIES = [
  { icon: '💬', name: 'AI 答疑', desc: '学科问题随时问，上下文记忆', url: '/pages-ai/chat/chat', login: true },
  { icon: '📕', name: '错题本', desc: '快速收录 · 复习闭环 · AI 讲解', url: '/pages-ai/wrong/wrong', login: true },
  { icon: '📋', name: '复习提纲', desc: '按学科/主题一键生成要点', url: '/pages-ai/outline/outline', login: true },
  { icon: '📄', name: 'PDF 问答', desc: '上传课件/论文，提问即答', url: '/pages-ai/pdf/pdf', login: true },
  { icon: '💻', name: '代码纠错', desc: '贴代码，AI 定位问题并修复', url: '/pages-ai/code-fix/code-fix', login: true }
]

Page({
  data: {
    entries: AI_ENTRIES
  },

  goEntry(e) {
    const item = e.currentTarget.dataset.item
    if (item.login && !requireLogin()) return
    wx.navigateTo({ url: item.url })
  }
})
