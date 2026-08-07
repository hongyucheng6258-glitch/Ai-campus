// 兼容后端当前字符串响应与历史 { answer } 响应格式
function getAiAnswer(data) {
  if (typeof data === 'string') return data
  if (data && typeof data.answer === 'string') return data.answer
  return ''
}

module.exports = {
  getAiAnswer
}
