// 올가미 선택: 펜으로 둘러싼 영역 안의 획을 고르고, 옮기거나 지우거나 글씨/그림으로 직접 지정한다.
// 위치 판단은 모두 화면에 보이는 위치(transform 적용) 기준이다.
import { strokeBBox, strokePoints } from './geometry'

const SELECT_RATIO = 0.5 // 획의 점 절반 이상이 올가미 안에 있으면 선택

export function pointInPolygon([x, y], polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function selectStrokes(strokes, polygon) {
  if (polygon.length < 3) return []
  return strokes
    .filter((s) => {
      const pts = strokePoints(s)
      if (pts.length === 0) return false
      const inside = pts.filter(([x, y]) => pointInPolygon([x, y], polygon)).length
      return inside / pts.length >= SELECT_RATIO
    })
    .map((s) => s.id)
}

export function selectionBBox(strokes, ids) {
  const set = new Set(ids)
  const boxes = strokes.filter((s) => set.has(s.id) && s.points.length > 0).map(strokeBBox)
  if (boxes.length === 0) return null
  return {
    minX: Math.min(...boxes.map((b) => b.minX)), minY: Math.min(...boxes.map((b) => b.minY)),
    maxX: Math.max(...boxes.map((b) => b.maxX)), maxY: Math.max(...boxes.map((b) => b.maxY)),
  }
}

/**
 * 화면에서 (dx, dy)만큼 옮긴다. 옮기기는 사용자가 직접 한 일이라 원본 좌표를 바꾼다.
 * 노트 정리로 회전된 획은 회전 중심(ox, oy)도 같은 만큼 옮기면, 화면에서도 정확히 (dx, dy)만큼 움직인다.
 */
export function moveStrokes(strokes, ids, dx, dy) {
  const set = new Set(ids)
  const round = (n) => Math.round(n * 10) / 10
  return strokes.map((s) => {
    if (!set.has(s.id)) return s
    const points = s.points.map(([x, y, ...rest]) => [round(x + dx), round(y + dy), ...rest])
    const transform = s.transform ? { ...s.transform, ox: s.transform.ox + dx, oy: s.transform.oy + dy } : null
    return { ...s, points, transform }
  })
}

export function deleteStrokes(strokes, ids) {
  const set = new Set(ids)
  return strokes.filter((s) => !set.has(s.id))
}

/** kind: 'text' | 'drawing' | null(자동 판정으로 되돌리기) */
export function setStrokesKind(strokes, ids, kind) {
  const set = new Set(ids)
  return strokes.map((s) => {
    if (!set.has(s.id)) return s
    const next = { ...s }
    if (kind) next.kind = kind
    else delete next.kind
    return next
  })
}
