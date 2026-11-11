// 보정·연습에 쓰는 목표 글씨체. 모두 Google Fonts(OFL)에서 한글 11,172자가 다 있는 글꼴만 골랐다.
// 파일은 public/fonts/ (한글·영문·기호만 남겨 줄인 woff), 라이선스는 public/fonts/OFL/
export const FONTS = [
  { id: 'gowun-dodum', label: '고운돋움', note: '가장 반듯해요' },
  { id: 'nanum-pen-script', label: '나눔손글씨 펜', note: '펜으로 쓴 느낌' },
  { id: 'hi-melody', label: '하이멜로디', note: '동글동글' },
  { id: 'gamja-flower', label: '감자꽃', note: '귀엽고 또렷' },
  { id: 'poor-story', label: '푸어스토리', note: '단정한 손글씨' },
].map((f) => ({ ...f, file: `/fonts/${f.id}.woff` }))

export const DEFAULT_FONT_ID = 'gowun-dodum'

export const fontById = (id) => FONTS.find((f) => f.id === id) ?? FONTS.find((f) => f.id === DEFAULT_FONT_ID)

/** 페이지의 다른 글꼴과 겹치지 않게 앱 전용 이름을 쓴다 (fonts.css의 @font-face와 같아야 함) */
export const fontFamily = (id) => `"ddobak-${fontById(id).id}"`

const loading = new Map()

/** 캔버스에 그리기 전에 글꼴을 받아 둔다. 실패해도 기본 글꼴로 그려지므로 오류는 삼킨다 */
export function ensureFont(id) {
  const fid = fontById(id).id
  if (!loading.has(fid)) {
    const p = typeof document !== 'undefined' && document.fonts
      ? document.fonts.load(`32px ${fontFamily(fid)}`, '가').catch(() => [])
      : Promise.resolve([])
    loading.set(fid, p)
  }
  return loading.get(fid)
}
