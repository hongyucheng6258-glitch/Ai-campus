import request from './request'

/** 内容审核 API（D2） */
export function auditList(params) {
  return request.get('/audit/pending', { params })
}

export function auditPass(type, id) {
  return request.put(`/audit/${type}/${id}/pass`)
}

export function auditReject(type, id, reason) {
  return request.put(`/audit/${type}/${id}/reject`, { reason })
}
