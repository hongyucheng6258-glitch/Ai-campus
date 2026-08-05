import request from './request'

/** 失物招领 API */
export function publishLostFound(data) {
  return request.post('/lostfound', data)
}

export function listLostFound(params) {
  return request.get('/lostfound/list', { params })
}

export function lostFoundDetail(id) {
  return request.get(`/lostfound/${id}`)
}

export function finishLostFound(id) {
  return request.put(`/lostfound/${id}/finish`)
}

export function myLostFound(params) {
  return request.get('/lostfound/my', { params })
}
