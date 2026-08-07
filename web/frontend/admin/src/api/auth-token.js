export function shouldAttachAdminToken(url) {
  return url !== '/auth/login'
}
