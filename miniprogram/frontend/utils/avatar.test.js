const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const { normalizeAssetUrl } = require('./avatar')

test('将本地 MinIO 图片改为后端公开代理地址', () => {
  const baseUrl = 'http://127.0.0.1:8080/api'
  assert.equal(
    normalizeAssetUrl('http://localhost:9000/campus/images/a.jpg', baseUrl),
    'http://127.0.0.1:8080/api/assets/campus/images/a.jpg'
  )
})

test('将局域网 MinIO 图片也改为后端公开代理地址', () => {
  const baseUrl = 'http://127.0.0.1:8080/api'
  assert.equal(
    normalizeAssetUrl('http://127.0.0.1:9000/campus/images/a.jpg', baseUrl),
    'http://127.0.0.1:8080/api/assets/campus/images/a.jpg'
  )
})

test('保留已可访问的远程头像地址', () => {
  const baseUrl = 'http://127.0.0.1:8080/api'
  assert.equal(
    normalizeAssetUrl('https://cdn.example.com/a.jpg', baseUrl),
    'https://cdn.example.com/a.jpg'
  )
})

test('我的页面展示用户资料前必须归一化头像地址', () => {
  const source = fs.readFileSync(path.join(__dirname, '../pages/my/my.js'), 'utf8')
  assert.match(source, /normalizeUserInfo\(getUserInfo\(\)\)/)
  assert.match(source, /normalizeUserInfo\(await request\(\{ url: '\/user\/info' \}\)\)/)
})

test('AI 答疑页面展示用户头像前必须引入并调用归一化函数', () => {
  const source = fs.readFileSync(path.join(__dirname, '../pages-ai/chat/chat.js'), 'utf8')
  assert.match(source, /const \{ normalizeUserInfo \} = require\('\.\.\/\.\.\/utils\/avatar'\)/)
  assert.match(source, /normalizeUserInfo\(getUserInfo\(\) \|\| \{\}\)/)
})

test('聊天头像加载失败时必须回退到昵称首字', () => {
  const js = fs.readFileSync(path.join(__dirname, '../components/chat-bubble/chat-bubble.js'), 'utf8')
  const wxml = fs.readFileSync(path.join(__dirname, '../components/chat-bubble/chat-bubble.wxml'), 'utf8')
  assert.match(js, /avatarError/)
  assert.match(wxml, /binderror="avatarError"/)
})

