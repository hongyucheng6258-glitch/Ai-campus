import request from './request'

/** 举报 API */
export function submitReport(data) {
  return request.post('/report', data)
}
