import request from './request'

/** 闲置互换 API */
export function publishIdle(data) {
  return request.post('/idle', data)
}

export function listIdle(params) {
  return request.get('/idle/list', { params })
}

export function idleDetail(id) {
  return request.get(`/idle/${id}`)
}

export function updateIdle(id, data) {
  return request.put(`/idle/${id}`, data)
}

export function offlineIdle(id) {
  return request.delete(`/idle/${id}`)
}

export function myIdle(params) {
  return request.get('/idle/my', { params })
}

export function appoint(id, data) {
  return request.post(`/idle/${id}/appoint`, data)
}

export function handleAppoint(id, accept) {
  return request.put(`/idle/appoint/${id}/handle`, { accept })
}

export function finishAppoint(id) {
  return request.put(`/idle/appoint/${id}/finish`)
}

export function reviewAppoint(id, data) {
  return request.post(`/idle/appoint/${id}/review`, data)
}

export function myAppointments(params) {
  return request.get('/idle/appoint/my', { params })
}
