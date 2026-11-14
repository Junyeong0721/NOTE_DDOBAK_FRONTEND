// 연습할 글씨체. 처음엔 설정의 목표 글씨체로 시작하고, 연습에서 바꾼 값은 연습용으로만 기억한다(노트 보정 글씨체는 그대로).
import { FONTS } from '../note/fonts'
import { loadSettings } from '../settings'

const KEY = 'ddobak.practice'

export function loadPracticeFont() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (FONTS.some((f) => f.id === raw?.fontId)) return raw.fontId
  } catch {
    // 저장값이 깨졌으면 설정 글씨체로
  }
  return loadSettings().fontId
}

export function savePracticeFont(fontId) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ fontId }))
  } catch {
    // 저장소를 쓸 수 없으면 이번 화면에서만 적용
  }
}
