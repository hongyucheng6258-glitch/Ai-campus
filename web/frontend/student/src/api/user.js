import request from './request'

/** 用户与上传 API */
export function getUserInfo() {
  return request.get('/user/info')
}

export function updateProfile(data) {
  return request.put('/user/profile', data)
}

export function updatePassword(data) {
  return request.put('/user/password', data)
}

/** 图片上传（FormData） */
export function uploadImage(file) {
  const form = new FormData()
  form.append('file', file)
  return request.post('/upload/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/** 文件上传（PDF） */
export function uploadFile(file) {
  const form = new FormData()
  form.append('file', file)
  return request.post('/upload/file', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
