import request from './request'

/** 数据大屏 API（D7） */
export function statsOverview() {
  return request.get('/stats/overview')
}

export function statsTrend() {
  return request.get('/stats/trend')
}

export function statsModule() {
  return request.get('/stats/module')
}

export function statsPie() {
  return request.get('/stats/pie')
}
