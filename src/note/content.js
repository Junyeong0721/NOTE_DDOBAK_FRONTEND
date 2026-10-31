// 노트의 필기 데이터(content) 형식과 생성 함수.
// 좌표는 화면 픽셀이 아니라 가로 1000 기준 A4 페이지 좌표다.
export const PAGE_WIDTH = 1000
export const PAGE_HEIGHT = 1414

const DEFAULT_PAGE = { width: PAGE_WIDTH, height: PAGE_HEIGHT }

export const EMPTY_CONTENT = JSON.stringify({ version: 1, page: DEFAULT_PAGE, pages: [{ strokes: [] }] })

export function parseContent(text) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('필기 데이터를 읽을 수 없습니다.')
  }
  const pages = Array.isArray(raw?.pages) && raw.pages.length > 0
    ? raw.pages.map((p) => ({ strokes: Array.isArray(p?.strokes) ? p.strokes : [] }))
    : [{ strokes: [] }]
  return { version: raw?.version ?? 1, page: raw?.page ?? { ...DEFAULT_PAGE }, pages }
}

export function serializeContent(content) {
  return JSON.stringify(content)
}

let strokeSeq = 0

export function createStroke({ t0, color, width }) {
  strokeSeq += 1
  return { id: `s_${t0}_${strokeSeq}`, t0, color, width, points: [], transform: null }
}

const round = (n, digits) => {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

// 점 하나 = [x, y, 필압, 획 시작 후 ms]. Pencil이 아닌 입력(마우스)은 필압 0이라 0.5로 둔다.
export function addPoint(stroke, { x, y, pressure, t }) {
  const p = pressure > 0 ? round(pressure, 2) : 0.5
  const point = [round(x, 1), round(y, 1), p, Math.round(t - stroke.t0)]
  return { ...stroke, points: [...stroke.points, point] }
}
