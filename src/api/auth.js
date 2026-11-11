// 회원가입·로그인 API. 로그인 상태는 서버 세션 쿠키(HttpOnly)로 유지되고, 화면은 내 정보만 들고 있는다.
import { request } from './notes'

export const signup = ({ email, password, nickname }) =>
  request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, nickname }) })

export const login = ({ email, password }) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })

export const logout = () => request('/api/auth/logout', { method: 'POST' })

/** 로그인돼 있으면 내 정보, 아니면 null */
export async function fetchMe() {
  try {
    return await request('/api/auth/me')
  } catch (e) {
    if (e.message === '로그인이 필요합니다.') return null
    throw e
  }
}
