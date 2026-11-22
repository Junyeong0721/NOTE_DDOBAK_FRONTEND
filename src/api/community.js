// 노트 공유 커뮤니티 API (또박 회원만). 공개하면 그 순간의 필기가 복사본으로 저장된다.
import { request } from './notes'

const BASE = '/api/community'
const json = (method, body) => ({ method, body: JSON.stringify(body) })

/** 이 노트의 공개 상태: { published: false } 또는 { published: true, postId, title, subject, intro, likeCount, commentCount, copyCount, hidden, outdated, ... } */
export const getPublish = (noteId) => request(`/api/notes/${noteId}/publish`)

/** 공개하기 / 정보 수정. refreshContent: true면 지금 노트로 공개본(필기·썸네일·요약)을 바꾼다 */
export const savePublish = (noteId, { title, subject, intro, refreshContent = false }) =>
  request(`/api/notes/${noteId}/publish`, json('PUT', { title, subject, intro: intro ?? '', refreshContent }))

/** 공개 그만하기 (좋아요·댓글도 사라진다) */
export const unpublish = (noteId) => request(`/api/notes/${noteId}/publish`, { method: 'DELETE' })

/** 목록: { items, hasMore }. sort = 'latest' | 'popular' */
export function listPosts({ sort = 'latest', subject = '', q = '', page = 0 } = {}) {
  const params = new URLSearchParams({ sort, page: String(page) })
  if (subject) params.set('subject', subject)
  if (q.trim()) params.set('q', q.trim())
  return request(`${BASE}?${params}`)
}

/** 공개 노트가 있는 과목 [{ subject, count }] 많은 순 */
export const listSubjects = () => request(`${BASE}/subjects`)

export const getPost = (postId) => request(`${BASE}/${postId}`)

/** 좋아요 켜기/끄기 → { liked, likeCount } */
export const setLike = (postId, on) => request(`${BASE}/${postId}/like`, { method: on ? 'PUT' : 'DELETE' })

/** 내 노트로 가져오기 → { noteId } */
export const copyPost = (postId) => request(`${BASE}/${postId}/copy`, { method: 'POST' })

export const listComments = (postId) => request(`${BASE}/${postId}/comments`)

export const addComment = (postId, body) => request(`${BASE}/${postId}/comments`, json('POST', { body }))

export const deleteComment = (postId, commentId) =>
  request(`${BASE}/${postId}/comments/${commentId}`, { method: 'DELETE' })

/** reason: 'inappropriate' | 'spam' | 'other' */
export const reportPost = (postId, reason) => request(`${BASE}/${postId}/report`, json('POST', { reason }))
