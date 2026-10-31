// 노트 API 클라이언트. 주소는 항상 상대 경로(/api/...)로 호출한다.
export const EMPTY_CONTENT = '{"version":1,"pages":[{"strokes":[]}]}'

const BASE = '/api/notes'

async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })

  if (!res.ok) {
    let message = `요청에 실패했습니다. (${res.status})`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {
      // 서버가 꺼져 있거나 본문이 JSON이 아니면 기본 메시지를 쓴다.
    }
    throw new Error(message)
  }

  if (res.status === 204) return null
  return res.json()
}

export const listNotes = () => request(BASE)

export const getNote = (id) => request(`${BASE}/${id}`)

export const createNote = ({ title, content }) =>
  request(BASE, { method: 'POST', body: JSON.stringify({ title, content }) })

export const updateNote = (id, { title, content }) =>
  request(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify({ title, content }) })

export async function deleteNote(id) {
  await request(`${BASE}/${id}`, { method: 'DELETE' })
}
