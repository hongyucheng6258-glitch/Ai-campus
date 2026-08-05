// AI 代码纠错（分包 pages-ai）：POST /ai/code/fix { code, language, extra } → { answer }
const { request } = require('../../utils/request')
const { requireLogin } = require('../../utils/auth')

/** 支持的编程语言（与后端提示词模板占位一致，传语言名字符串即可） */
const LANGUAGES = ['Java', 'Python', 'JavaScript', 'C', 'C++', 'Go', 'SQL']

Page({
  data: {
    languages: LANGUAGES,
    languageIndex: 0,     // picker 选中下标
    code: '',             // 待纠错代码
    extra: '',            // 补充说明（报错信息/期望行为）
    answer: '',           // AI 返回的纠错结果
    loading: false,
    codeLength: 0
  },

  onLoad() {
    requireLogin()
  },

  /** 语言选择 */
  onLanguageChange(e) {
    this.setData({ languageIndex: Number(e.detail.value) })
  },

  /** 代码输入（同步字数，后端限制 8000 字符） */
  onCodeInput(e) {
    const code = e.detail.value
    this.setData({ code, codeLength: code.length })
  },

  /** 补充说明输入 */
  onExtraInput(e) {
    this.setData({ extra: e.detail.value })
  },

  /** 从剪贴板粘贴代码，方便手机端输入 */
  pasteCode() {
    wx.getClipboardData({
      success: (res) => {
        const code = res.data || ''
        if (!code) {
          wx.showToast({ title: '剪贴板为空', icon: 'none' })
          return
        }
        this.setData({ code, codeLength: code.length })
      }
    })
  },

  /** 提交纠错请求 */
  async submit() {
    const code = (this.data.code || '').trim()
    if (!code) {
      wx.showToast({ title: '请输入代码', icon: 'none' })
      return
    }
    if (code.length > 8000) {
      wx.showToast({ title: '代码最长8000字符', icon: 'none' })
      return
    }
    if (this.data.loading) return
    if (!requireLogin()) return

    this.setData({ loading: true, answer: '' })
    wx.showLoading({ title: 'AI 分析中…', mask: true })
    try {
      const data = await request({
        url: '/ai/code/fix',
        method: 'POST',
        data: {
          code,
          language: this.data.languages[this.data.languageIndex],
          extra: (this.data.extra || '').trim()
        }
      })
      this.setData({ answer: data.answer || '（AI 未返回内容）' })
    } catch (e) {
      this.setData({ answer: '' })
    } finally {
      wx.hideLoading()
      this.setData({ loading: false })
    }
  },

  /** 复制纠错结果 */
  copyAnswer() {
    if (!this.data.answer) return
    wx.setClipboardData({
      data: this.data.answer,
      success() {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  /** 清空重来 */
  reset() {
    this.setData({ code: '', extra: '', answer: '', codeLength: 0 })
  }
})
