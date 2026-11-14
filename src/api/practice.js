// 글씨 연습 API. 점수는 앱이 계산해서 보내고, 서버는 기록을 저장한 뒤 AI 조언을 붙여 돌려준다.
import { request } from './notes'

const BASE = '/api/practice'

/** 기록 저장 + 조언. 응답의 adviceStatus가 'OK'면 advice에 조언이 있다 */
export const saveAttempt = (body) => request(`${BASE}/attempts`, { method: 'POST', body: JSON.stringify(body) })

/** 최근 연습 20개 (획 없이) */
export const listAttempts = () => request(`${BASE}/attempts`)

/** 기록 하나 (획 포함, 다시 보기용) */
export const getAttempt = (id) => request(`${BASE}/attempts/${id}`)

/** 연습한 글마다 최고 점수와 횟수 */
export const listBest = () => request(`${BASE}/best`)
