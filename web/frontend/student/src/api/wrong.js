import request from './request'

/** 错题本 API */
export function listWrong(params) {
  return request.get('/wrong-question/list', { params })
}

export function wrongSubjects() {
  return request.get('/wrong-question/subjects')
}

export function createWrong(data) {
  return request.post('/wrong-question', data)
}

export function updateWrong(id, data) {
  return request.put(`/wrong-question/${id}`, data)
}

export function deleteWrong(id) {
  return request.delete(`/wrong-question/${id}`)
}
