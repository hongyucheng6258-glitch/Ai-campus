import request from './request'

/** 内容管理 API */
export function contentOff(type, id) {
  return request.put(`/content/${type}/${id}/off`)
}

export function contentOn(type, id) {
  return request.put(`/content/${type}/${id}/on`)
}

export function signinReport(id) {
  return request.get(`/content/activity/${id}/signin-report`)
}
