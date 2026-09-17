import request from './request'

/** 失物招领 API */
export function publishLostFound(data) {
  return request.post('/lostfound', data)
}
export function updateLostFound(id, data) {
  return request.put(`/lostfound/${id}`, data)
}

export function claimLostFound(id, data) {
  return request.post(`/lostfound/${id}/claim`, data)
}

export function lostFoundClaims(id) {
  return request.get(`/lostfound/${id}/claims`)
}

export function myClaim(id) {
  return request.get(`/lostfound/${id}/my-claim`)
}

export function handleClaim(claimId, accept) {
  return request.put(`/lostfound/claim/${claimId}/handle`, { accept })
}

export function confirmClaim(claimId) {
  return request.put(`/lostfound/claim/${claimId}/confirm`)
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
