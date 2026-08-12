/**
 * 轻量 Markdown → HTML（小程序 rich-text 渲染用）
 * 支持：标题、加粗、斜体、行内代码、代码块、无序/有序列表、引用、分隔线、段落与换行。
 * 说明：不做完整 Markdown 解析（小程序包体与性能考虑），覆盖 AI 输出的常见结构即可；
 *       复制场景用 format.md2plain 取纯文本。
 */

/** 转义 HTML 特殊字符（含单引号，保证安全可复用） */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 行内样式：`code` 先提取为占位符，再处理 **bold** / *italic*，最后还原（code 内不再误加粗） */
function inline(s) {
  const codes = []
  const t = esc(s).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c)
    return '\u0000' + (codes.length - 1) + '\u0000'
  })
  const styled = t
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  return styled.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + codes[Number(i)] + '</code>')
}

/**
 * Markdown 文本 → HTML 字符串（rich-text 可用）。
 * @param {String} md
 * @returns {String} html
 */
function mdToHtml(md) {
  if (!md) return ''
  const lines = String(md).replace(/\r\n/g, '\n').split('\n')
  const out = []
  let i = 0
  let inCode = false
  let codeBuf = []
  let listType = '' // '' | 'ul' | 'ol'
  let listBuf = []

  const flushList = () => {
    if (listType && listBuf.length) {
      const tag = listType === 'ol' ? 'ol' : 'ul'
      out.push(`<${tag}>${listBuf.map((t) => `<li>${t}</li>`).join('')}</${tag}>`)
    }
    listType = ''
    listBuf = []
  }

  while (i < lines.length) {
    const line = lines[i]
    const codeMatch = /^```(\w*)\s*$/.exec(line)
    if (codeMatch) {
      flushList()
      if (inCode) {
        out.push(`<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`)
        codeBuf = []
        inCode = false
      } else {
        inCode = true
      }
      i++
      continue
    }
    if (inCode) {
      codeBuf.push(line)
      i++
      continue
    }
    if (!line.trim()) {
      flushList()
      i++
      continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      flushList()
      const level = Math.min(h[1].length, 4)
      out.push(`<h${level}>${inline(h[2])}</h${level}>`)
      i++
      continue
    }
    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      flushList()
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`)
      i++
      continue
    }
    const hr = /^(-{3,}|\*{3,}|_{3,})$/.exec(line)
    if (hr) {
      flushList()
      out.push('<hr/>')
      i++
      continue
    }
    const ul = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (ul) {
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
      }
      listBuf.push(inline(ul[1]))
      i++
      continue
    }
    const ol = /^\s*(\d+)[.、)]\s+(.*)$/.exec(line)
    if (ol) {
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
      }
      listBuf.push(inline(ol[2]))
      i++
      continue
    }
    flushList()
    out.push(`<p>${inline(line)}</p>`)
    i++
  }
  flushList()
  if (inCode) {
    out.push(`<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`)
  }
  return out.join('')
}

module.exports = { mdToHtml }
