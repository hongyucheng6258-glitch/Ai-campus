import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./Home.vue', import.meta.url), 'utf8')

test('首页最新消息最多展示五条并使用紧凑头像', () => {
  assert.match(source, /arr\.slice\(0,\s*5\)\.map/)
  assert.match(source, /<WtAvatar[^>]*size="sm"/)
})

test('首页推荐最多展示三条并使用紧凑卡片', () => {
  assert.match(source, /const visibleFeedList = computed\(\(\) => feedList\.value\.slice\(0,\s*3\)\)/)
  assert.match(source, /v-for="item in visibleFeedList"/)
  assert.match(source, /<WtFeedCard[\s\S]*?compact/)
  assert.match(source, /class="feed-more"/)
})
