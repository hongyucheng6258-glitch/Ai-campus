// PDF 文档问答（分包 pages-ai）
// 流程：wx.chooseMessageFile 选文件 → POST /ai/pdf/upload（multipart）→ POST /ai/pdf/ask 多轮提问
// 注意：/ai/pdf/upload 不属于通用 /upload/* 接口，故此处单独封装 wx.uploadFile，
//       目的是能拿到业务码 1004（扫描件PDF无法解析）并给出针对性引导。
const { request, getBaseUrl } = require('../../utils/request')
const { getToken, requireLogin } = require('../../utils/auth')

/** 扫描件错误码（后端 ResultCode.PDF_SCANNED） */
const CODE_PDF_SCANNED = 1004

Page({
  data: {
    doc: null,        // { docId, fileName, pageCount, status }
    sessionId: null,  // PDF 问答会话，首次提问后由后端建立（此处保持 null 由后端自动创建）
    qaList: [],       // [{ question, answer }]
    input: '',
    uploading: false,
    asking: false,
    scrollTop: 0
  },

  onLoad() {
    requireLogin()
  },

  /** 选择微信聊天中的 PDF 文件并上传 */
  choosePdf() {
    if (!requireLogin()) return
    if (this.data.uploading) return
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return
        if (!/\.pdf$/i.test(file.name || '')) {
          wx.showToast({ title: '仅支持 PDF 文件', icon: 'none' })
          return
        }
        // 限制 20MB，避免上传超时
        if (file.size && file.size > 20 * 1024 * 1024) {
          wx.showToast({ title: '文件不能超过 20MB', icon: 'none' })
          return
        }
        this.uploadPdf(file.path, file.name)
      },
      fail: () => {
        // 用户取消选择，无需提示
      }
    })
  },

  /**
   * 上传 PDF 到 /ai/pdf/upload。
   * @param {String} filePath 本地临时路径
   * @param {String} fileName 原始文件名
   */
  uploadPdf(filePath, fileName) {
    this.setData({ uploading: true })
    wx.showLoading({ title: '解析中…', mask: true })
    const token = getToken()
    wx.uploadFile({
      url: getBaseUrl() + '/ai/pdf/upload',
      filePath,
      name: 'file',
      header: token ? { Authorization: 'Bearer ' + token } : {},
      success: (res) => {
        let body = {}
        try {
          body = JSON.parse(res.data)
        } catch (e) {
          wx.showToast({ title: '解析响应失败', icon: 'none' })
          return
        }
        if (body.code === 200) {
          const doc = body.data || {}
          this.setData({
            doc: { ...doc, fileName: doc.fileName || fileName },
            qaList: [],
            sessionId: null
          })
          wx.showToast({ title: '解析完成', icon: 'success' })
        } else if (body.code === CODE_PDF_SCANNED) {
          // 1004：扫描件（图片型）PDF，提取不到文本，给出可操作的友好引导
          this.showScannedTip()
        } else if (body.code === 401) {
          wx.removeStorageSync('token')
          wx.navigateTo({ url: '/pages/login/login' })
        } else {
          wx.showToast({ title: body.message || '上传失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '上传失败，请检查网络', icon: 'none' })
      },
      complete: () => {
        wx.hideLoading()
        this.setData({ uploading: false })
      }
    })
  },

  /** 扫描件专用提示（错误码 1004） */
  showScannedTip() {
    wx.showModal({
      title: '无法解析该 PDF',
      content: '这是一份扫描件（图片型 PDF），系统提取不到文字。\n\n建议：\n1. 使用可复制文字的电子版 PDF；\n2. 或先用 OCR 工具转成文本型 PDF 再上传。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  /** 输入框同步 */
  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  /** 提交问题：POST /ai/pdf/ask { docId, sessionId, question } */
  async ask() {
    if (!this.data.doc || !this.data.doc.docId) {
      wx.showToast({ title: '请先上传 PDF', icon: 'none' })
      return
    }
    const question = (this.data.input || '').trim()
    if (!question) {
      wx.showToast({ title: '请输入问题', icon: 'none' })
      return
    }
    if (this.data.asking) return
    if (!requireLogin()) return

    const qaList = this.data.qaList.concat([{ question, answer: 'AI 正在阅读文档…' }])
    const index = qaList.length - 1
    this.setData({ qaList, input: '', asking: true }, this.scrollToBottom)

    try {
      const data = await request({
        url: '/ai/pdf/ask',
        method: 'POST',
        data: {
          docId: this.data.doc.docId,
          sessionId: this.data.sessionId,
          question
        }
      })
      const key = `qaList[${index}].answer`
      this.setData({ [key]: data.answer || '（AI 未返回内容）' }, this.scrollToBottom)
    } catch (e) {
      const key = `qaList[${index}].answer`
      this.setData({ [key]: '回答失败，请稍后重试。' }, this.scrollToBottom)
    } finally {
      this.setData({ asking: false })
    }
  },

  /** 滚动到底部 */
  scrollToBottom() {
    this.setData({ scrollTop: this.data.qaList.length * 100000 })
  },

  /** 更换文档 */
  changeDoc() {
    this.setData({ doc: null, qaList: [], sessionId: null, input: '' })
  },

  /** 复制某条回答 */
  copyAnswer(e) {
    const item = this.data.qaList[e.currentTarget.dataset.index]
    if (!item) return
    wx.setClipboardData({
      data: item.answer,
      success() {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  }
})
