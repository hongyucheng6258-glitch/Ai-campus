import request from './request'
import { getToken } from '../utils/auth'

/** AI 学习中心 API */

// ---------- 会话 ----------
export function createSession(data) {
  return request.post('/ai/session', data)
}

export function listSessions(scene) {
  return request.get('/ai/sessions', { params: { scene } })
}

export function renameSession(id, title) {
  return request.put(`/ai/session/${id}`, { title })
}

export function deleteSession(id) {
  return request.delete(`/ai/session/${id}`)
}

export function bindPdfDocument(sessionId, docId) {
  return request.put(`/ai/session/${sessionId}/pdf`, { docId })
}

export function listMessages(sessionId, pageNum = 1, pageSize = 20) {
  return request.get(`/ai/session/${sessionId}/messages`, { params: { pageNum, pageSize } })
}

// ---------- 代码纠错 / 提纲 / 习题 / PDF（一次性返回） ----------
export function codeFix(data) {
  return request.post('/ai/code-fix', data)
}

export function generateOutline(data) {
  return request.post('/ai/outline', data)
}

export function generateQuiz(wrongQuestionId) {
  return request.post('/ai/quiz', { wrongQuestionId })
}

export function pdfUpload(file) {
  const form = new FormData()
  form.append('file', file)
  return request.post('/pdf/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function pdfDoc(docId) {
  return request.get(`/pdf/${docId}`)
}

export function pdfAsk(data) {
  return request.post('/ai/pdf/ask', data)
}

/**
 * Web 端 SSE 流式答疑（POST + fetch 流读取，EventSource 不支持 POST/自定义Header）。
 *
 * @param {Object} payload { sessionId, question }
 * @param {Object} handlers { onDelta(text), onDone(), onError(code,message) }
 */
export async function chatStream(payload, handlers) {
  const resp = await fetch('/api/ai/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify(payload)
  })
  if (!resp.ok || !resp.body) {
    handlers.onError(500, '连接AI服务失败')
    return
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let completed = false

  const finish = () => {
    if (completed) return
    completed = true
    handlers.onDone()
  }

  const fail = (code, message) => {
    if (completed) return
    completed = true
    handlers.onError(code, message)
  }

  const dispatch = (evt) => {
    const lines = evt.split(/\r?\n/)
    let eventName = 'message'
    const dataLines = []
    for (const line of lines) {
      if (line.startsWith('event:')) eventName = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
    }
    const data = dataLines.join('\n')
    if (eventName === 'delta' || eventName === 'message') {
      if (data) handlers.onDelta(data)
    } else if (eventName === 'done') {
      finish()
    } else if (eventName === 'error') {
      try {
        const err = JSON.parse(data)
        fail(err.code || 1002, err.message || 'AI服务调用失败')
      } catch {
        fail(1002, data || 'AI服务调用失败')
      }
    }
  }

  const consume = (flush = false) => {
    const normalized = buffer.replace(/\r\n/g, '\n')
    const events = normalized.split('\n\n')
    buffer = events.pop() || ''
    events.forEach(dispatch)
    if (flush && buffer.trim()) {
      dispatch(buffer)
      buffer = ''
    }
  }

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        buffer += decoder.decode()
        consume(true)
        if (!completed) finish()
        break
      }
      buffer += decoder.decode(value, { stream: true })
      consume()
    }
  } catch (error) {
    if (error?.name === 'AbortError') return
    fail(1002, error?.message || 'AI服务连接中断')
  }
}
