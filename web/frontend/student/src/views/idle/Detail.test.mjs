import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function read(file) {
  return fs.readFileSync(path.join(__dirname, file), 'utf8')
}

test('闲置详情页提供已完成预约的评价入口', () => {
  const source = read('Detail.vue')

  assert.match(source, /reviewAppointmentId && !item\.reviewed/)
  assert.match(source, /@click="openReview"/)
  assert.match(source, /reviewAppoint\(appointmentId, reviewForm\)/)
  assert.match(source, /v-model="reviewVisible"/)
})
