// 노트 API 클라이언트. 주소는 항상 상대 경로(/api/...)로 호출한다.
// 새 노트의 빈 필기 데이터 (형식은 src/note/content.js)
export { EMPTY_CONTENT } from '../note/content'

const BASE = '/api/notes'

export async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })

  if (!res.ok) {
    // 로그인이 풀렸으면(세션 만료 등) 앱이 로그인 화면으로 돌아가게 알린다. 내 정보 확인(/api/auth/me)은 제외
    if (res.status === 401 && !path.startsWith('/api/auth/') && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ddobak:unauthorized'))
    }
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

// folderId는 새 노트를 만들 때만 쓴다 (폴더 이동은 moveNoteToFolder)
export function createNote({ title, content, folderId }) {
  const body = { title, content }
  if (folderId !== undefined) body.folderId = folderId
  return request(BASE, { method: 'POST', body: JSON.stringify(body) })
}

// thumbnail이 없으면 서버가 기존 썸네일을 유지한다
export const updateNote = (id, { title, content, thumbnail }) =>
  request(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify({ title, content, thumbnail }) })

/** folderId: 폴더 id, null이면 미분류 */
export const moveNoteToFolder = (id, folderId) =>
  request(`${BASE}/${id}/folder`, { method: 'PATCH', body: JSON.stringify({ folderId }) })

export async function deleteNote(id) {
  await request(`${BASE}/${id}`, { method: 'DELETE' })
}
