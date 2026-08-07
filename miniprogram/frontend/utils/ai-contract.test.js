const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const frontendRoot = path.join(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8')
}

test('AI 回答兼容字符串与旧对象响应', () => {
  const { getAiAnswer } = require('./ai-response')
  assert.equal(getAiAnswer('直接回答'), '直接回答')
  assert.equal(getAiAnswer({ answer: '旧格式回答' }), '旧格式回答')
  assert.equal(getAiAnswer(null), '')
})

test('小程序通过 runtime-config 读取后端地址', () => {
  const source = read('app.js')
  assert.match(source, /getApiBaseUrl\(\)/)
  assert.match(source, /baseUrl:\s*getApiBaseUrl\(\)/)
  assert.doesNotMatch(source, /trycloudflare\.com/)
})

test('代码纠错请求使用后端实际路径', () => {
  const source = read('pages-ai/code-fix/code-fix.js')
  assert.match(source, /url:\s*'\/ai\/code-fix'/)
  assert.doesNotMatch(source, /\/ai\/code\/fix/)
})

test('PDF 上传使用后端实际路径', () => {
  const source = read('pages-ai/pdf/pdf.js')
  assert.match(source, /getBaseUrl\(\) \+ '\/pdf\/upload'/)
  assert.doesNotMatch(source, /\/ai\/pdf\/upload/)
})

test('普通问答首次发送前创建并保存会话', () => {
  const source = read('pages-ai/chat/chat.js')
  assert.match(source, /url:\s*'\/ai\/session'/)
  assert.match(source, /scene:\s*'chat'/)
  assert.match(source, /this\.setData\(\{ sessionId \}\)/)
})

test('PDF 上传成功后创建并保存文档会话', () => {
  const source = read('pages-ai/pdf/pdf.js')
  assert.match(source, /url:\s*'\/ai\/session'/)
  assert.match(source, /scene:\s*'pdf'/)
  assert.match(source, /docId/)
  assert.match(source, /this\.setData\(\{ sessionId:\s*session\.id \}\)/)
})

test('AI 页面统一通过回答归一化函数展示结果', () => {
  const files = [
    'pages-ai/chat/chat.js',
    'pages-ai/pdf/pdf.js',
    'pages-ai/code-fix/code-fix.js',
    'pages-ai/outline/outline.js',
    'pages-ai/wrong/wrong.js'
  ]
  for (const file of files) {
    const source = read(file)
    assert.match(source, /getAiAnswer\(data\)/)
  }
})

test('聊天历史按时间正序展示', () => {
  const source = read('pages-ai/chat/chat.js')
  assert.match(source, /\(data\.list \|\| \[\]\)\.slice\(\)\.reverse\(\)/)
})

