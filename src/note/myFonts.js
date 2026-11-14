// 내가 고를 수 있는 글씨체 = 기본 5종 + [글씨체 더 보기]에서 추가한 것. 이 기기(브라우저)에 저장한다.
import { BASE_FONTS, EXTRA_FONTS } from './fonts'

const KEY = 'ddobak.fonts'
export const FONTS_CHANGED = 'ddobak:fonts'

const extraIds = new Set(EXTRA_FONTS.map((f) => f.id))

/** 추가한 글씨체 id들 (알 수 없는 id는 버림) */
export function loadAddedFonts() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!Array.isArray(raw?.added)) return []
    return [...new Set(raw.added.filter((id) => extraIds.has(id)))]
  } catch {
    return []
  }
}

/** 고르는 목록에 나올 글씨체: 기본 5종 다음에 추가한 것을 목록 순서대로 */
export function availableFonts(added = loadAddedFonts()) {
  const on = new Set(added)
  return [...BASE_FONTS, ...EXTRA_FONTS.filter((f) => on.has(f.id))]
}

export const isAvailableFont = (id, added = loadAddedFonts()) => availableFonts(added).some((f) => f.id === id)

/** 더 보기 글씨체를 추가하거나 뺀다. 기본 글씨체는 뺄 수 없다. 바뀐 목록을 돌려준다 */
export function setFontAdded(id, on) {
  if (!extraIds.has(id)) return loadAddedFonts()
  const current = loadAddedFonts().filter((x) => x !== id)
  const next = on ? [...current, id] : current
  try {
    localStorage.setItem(KEY, JSON.stringify({ added: next }))
  } catch {
    // 저장소를 쓸 수 없으면 이번 화면에서만 적용
  }
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent(FONTS_CHANGED, { detail: next }))
  }
  return next
}
