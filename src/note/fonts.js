// 보정·연습에 쓰는 목표 글씨체. 모두 Google Fonts(OFL)에서 한글 11,172자가 다 있는 글꼴만 골랐다.
// 파일은 public/fonts/ (한글·영문·기호만 남겨 줄인 woff), 라이선스는 public/fonts/OFL/
// - 기본 글씨체 5종: 처음부터 누구나 고를 수 있다
// - 더 보기 글씨체: [글씨체 더 보기]에서 추가한 것만 고르는 목록에 나온다 (myFonts.js). 파일은 쓸 때만 받는다

export const FONT_GROUPS = [
  { id: 'base', label: '기본 글씨체' },
  { id: 'handwriting', label: '손글씨·꾸밈' },
  { id: 'gothic', label: '반듯한 고딕' },
  { id: 'serif', label: '바탕·명조' },
]

const withFile = (f) => ({ ...f, file: `/fonts/${f.id}.woff` })

export const BASE_FONTS = [
  { id: 'gowun-dodum', label: '고운돋움', note: '가장 반듯해요' },
  { id: 'nanum-pen-script', label: '나눔손글씨 펜', note: '펜으로 쓴 느낌' },
  { id: 'hi-melody', label: '하이멜로디', note: '동글동글' },
  { id: 'gamja-flower', label: '감자꽃', note: '귀엽고 또렷' },
  { id: 'poor-story', label: '푸어스토리', note: '단정한 손글씨' },
].map((f) => withFile({ ...f, group: 'base', base: true }))

export const EXTRA_FONTS = [
  { id: 'nanum-brush-script', label: '나눔손글씨 붓', note: '붓펜으로 흘려 쓴 느낌', group: 'handwriting' },
  { id: 'single-day', label: '싱글데이', note: '통통하고 발랄해요', group: 'handwriting' },
  { id: 'stylish', label: '스타일리시', note: '붓끝이 살아 있어요', group: 'handwriting' },
  { id: 'dongle', label: '동글', note: '둥글고 납작해요', group: 'handwriting' },
  { id: 'black-and-white-picture', label: '흑백사진', note: '옛날 영화 자막 느낌', group: 'handwriting' },
  { id: 'nanum-gothic', label: '나눔고딕', note: '익숙하고 반듯해요', group: 'gothic' },
  { id: 'gothic-a1', label: '고딕 A1', note: '단정하고 깔끔해요', group: 'gothic' },
  { id: '42dot-sans', label: '42dot Sans', note: '요즘 화면 글씨', group: 'gothic' },
  { id: 'dotum', label: '돋움', note: '교과서 같은 고딕', group: 'gothic' },
  { id: 'gulim', label: '굴림', note: '부드러운 고딕', group: 'gothic' },
  { id: 'nanum-myeongjo', label: '나눔명조', note: '책에서 보던 글씨', group: 'serif' },
  { id: 'gowun-batang', label: '고운바탕', note: '부드러운 바탕', group: 'serif' },
  { id: 'batang', label: '바탕', note: '정갈한 바탕', group: 'serif' },
  { id: 'gungsuh', label: '궁서', note: '또박또박 정자 붓글씨', group: 'serif' },
].map(withFile)

export const ALL_FONTS = [...BASE_FONTS, ...EXTRA_FONTS]

/** 기본 글씨체 5종 (예전 이름) */
export const FONTS = BASE_FONTS

export const DEFAULT_FONT_ID = 'gowun-dodum'

/** 추가하지 않은(뺀) 글씨체도 찾는다: 예전 노트·연습 기록이 그 글씨체로 그려져 있을 수 있어서 */
export const fontById = (id) => ALL_FONTS.find((f) => f.id === id) ?? ALL_FONTS.find((f) => f.id === DEFAULT_FONT_ID)

export const isKnownFont = (id) => ALL_FONTS.some((f) => f.id === id)

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
