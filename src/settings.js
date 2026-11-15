// 기기별 설정(이 iPad/PC의 브라우저에 저장). 목표 글씨체는 노트 보정과 연습 모드가 같이 쓴다.
import { DEFAULT_FONT_ID } from './note/fonts'
import { isAvailableFont } from './note/myFonts'

const KEY = 'ddobak.settings'

export const DEFAULT_SETTINGS = Object.freeze({ fontId: DEFAULT_FONT_ID, autoSuggest: true })

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    const fontOk = isAvailableFont(raw?.fontId)
    const autoOk = typeof raw?.autoSuggest === 'boolean'
    if (!fontOk || !autoOk) return { ...DEFAULT_SETTINGS }
    return { fontId: raw.fontId, autoSuggest: raw.autoSuggest }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ fontId: settings.fontId, autoSuggest: settings.autoSuggest }))
  } catch {
    // 저장소를 쓸 수 없으면 이번 화면에서만 적용
  }
}
