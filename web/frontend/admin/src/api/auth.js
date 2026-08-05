import request from './request'

/** 管理员登录 API */
export function adminLogin(data) {
  return request.post('/auth/login', data)
}
