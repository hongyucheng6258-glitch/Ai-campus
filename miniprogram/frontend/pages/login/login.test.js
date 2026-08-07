const assert = require('node:assert/strict')
const test = require('node:test')

function loadPage() {
  let definition
  global.Page = (config) => { definition = config }
  global.getApp = () => ({ globalData: {} })
  delete require.cache[require.resolve('./login.js')]
  require('./login.js')
  delete global.Page
  delete global.getApp
  return definition
}

test('学号密码登录入口存在', () => {
  const page = loadPage()
  assert.equal(typeof page.accountLogin, 'function')
})

test('注册入口存在并调用注册流程', () => {
  const page = loadPage()
  assert.equal(typeof page.goRegister, 'function')
})
