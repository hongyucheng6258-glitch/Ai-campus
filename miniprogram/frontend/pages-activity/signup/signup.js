// 活动报名（分包 pages-activity）：POST /activity/{id}/signup { remark }
// 报名后进入待审批状态（MEMBER_PENDING），由发起人在详情页审批
const { request } = require('../../utils/request')
const { requireLogin, getUserInfo } = require('../../utils/auth')

Page({
  data: {
    id: null,          // 活动ID
    activityTitle: '', // 活动标题
    remark: '',        // 报名备注
    nickname: '',      // 展示当前报名人
    studentNo: '',
    submitting: false
  },

  onLoad(options) {
    if (!requireLogin()) return
    const id = options.id ? Number(options.id) : null
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    const user = getUserInfo() || {}
    this.setData({
      id,
      activityTitle: options.title ? decodeURIComponent(options.title) : '',
      nickname: user.nickname || '校园用户',
      studentNo: user.studentNo || '未绑定'
    })
  },

  /** 备注输入 */
  onInput(e) {
    this.setData({ remark: e.detail.value })
  },

  /** 提交报名 */
  async submit() {
    if (!this.data.id) return
    const remark = (this.data.remark || '').trim()
    if (remark.length > 255) {
      wx.showToast({ title: '备注最长255字', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    if (!requireLogin()) return

    this.setData({ submitting: true })
    try {
      await request({
        url: `/activity/${this.data.id}/signup`,
        method: 'POST',
        data: { remark }
      })
      wx.showModal({
        title: '报名成功',
        content: '报名申请已提交，等待发起人审批。审批结果会通过站内消息通知你。',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
    } catch (e) {
      // 重复报名(1005) 等错误由 request 统一提示
    } finally {
      this.setData({ submitting: false })
    }
  }
})
