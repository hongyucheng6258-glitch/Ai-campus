// 展示格式化工具（不依赖第三方库，小程序包体最小化）

/** "2024-06-01 12:30:00" → "06-01 12:30" */
function shortTime(time) {
  if (!time) return ''
  return String(time).slice(5, 16)
}

/** 相对时间：x分钟前/x小时前/x天前 */
function fromNow(time) {
  if (!time) return ''
  const t = new Date(String(time).replace(/-/g, '/')).getTime()
  const diff = Date.now() - t
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 3600 * 1000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 24 * 3600 * 1000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 30 * 24 * 3600 * 1000) return Math.floor(diff / 86400000) + '天前'
  return shortTime(time)
}

/** 解析 images JSON 数组字符串 → 数组（DB 存 JSON 字符串，共享约定 #8） */
function parseImages(json) {
  if (!json) return []
  try {
    return JSON.parse(json)
  } catch (e) {
    return []
  }
}

/** 极简 Markdown → 纯文本降级（无 towxml 时兜底展示） */
function md2plain(md) {
  if (!md) return ''
  return String(md)
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, ''))
    .replace(/[#*`>-]/g, '')
    .trim()
}

module.exports = {
  shortTime,
  fromNow,
  parseImages,
  md2plain
}
