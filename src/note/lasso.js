// 올가미 선택: 펜으로 둘러싼 영역 안의 획을 고르고, 옮기거나 지우거나 글씨/그림으로 직접 지정한다.
// 위치 판단은 모두 화면에 보이는 위치(transform 적용) 기준이다.
import { applyTransform, strokeBBox, strokePoints } from './geometry'

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

// ---------- 크기 바꾸기 ----------
export const RESIZE_MIN = 0.2
export const RESIZE_MAX = 6

/** 선택 상자 네 모서리의 손잡이. 끌면 반대쪽 모서리(anchor)를 기준으로 커지고 작아진다 */
export function selectionHandles(box, pad) {
  return [
    { corner: 'tl', x: box.minX - pad, y: box.minY - pad, anchor: { x: box.maxX, y: box.maxY } },
    { corner: 'tr', x: box.maxX + pad, y: box.minY - pad, anchor: { x: box.minX, y: box.maxY } },
    { corner: 'bl', x: box.minX - pad, y: box.maxY + pad, anchor: { x: box.maxX, y: box.minY } },
    { corner: 'br', x: box.maxX + pad, y: box.maxY + pad, anchor: { x: box.minX, y: box.minY } },
  ]
}

/** pt에 가장 가까운 손잡이 (radius 안), 없으면 null */
export function handleAt(box, pt, pad, radius) {
  let best = null
  let bestD = radius
  for (const h of selectionHandles(box, pad)) {
    const d = Math.hypot(pt.x - h.x, pt.y - h.y)
    if (d <= bestD) {
      best = h
      bestD = d
    }
  }
  return best
}

/** 배율: 손잡이를 잡은 곳(start)에서 지금 위치(current)까지를 anchor→start 방향으로 잰 비율 */
export function resizeFactor(anchor, start, current) {
  const vx = start.x - anchor.x
  const vy = start.y - anchor.y
  const len2 = vx * vx + vy * vy
  if (len2 === 0) return 1
  const k = ((current.x - anchor.x) * vx + (current.y - anchor.y) * vy) / len2
  return Math.min(RESIZE_MAX, Math.max(RESIZE_MIN, k))
}

/**
 * 고른 획을 화면에서 anchor 기준 k배로. 옮기기처럼 사용자가 직접 한 일이라 원본 좌표를 바꾸고,
 * 노트 정리 transform은 그대로 둔 채 "보이는 위치"가 정확히 k배가 되도록 원본 좌표를 거꾸로 계산한다. 선 굵기도 k배.
 */
export function resizeStrokes(strokes, ids, anchor, k) {
  const set = new Set(ids)
  const round = (n) => Math.round(n * 10) / 10
  return strokes.map((s) => {
    if (!set.has(s.id)) return s
    const t = s.transform
    const cos = Math.cos(-(t?.rotate ?? 0))
    const sin = Math.sin(-(t?.rotate ?? 0))
    const points = s.points.map(([x, y, ...rest]) => {
      const [sx, sy] = applyTransform([x, y], t)
      const tx = anchor.x + (sx - anchor.x) * k
      const ty = anchor.y + (sy - anchor.y) * k
      if (!t) return [round(tx), round(ty), ...rest]
      // 보이는 위치 = o + R(p - o) + d  →  p = o + R⁻¹(보이는 위치 - d - o)
      const qx = tx - (t.dx ?? 0) - (t.ox ?? 0)
      const qy = ty - (t.dy ?? 0) - (t.oy ?? 0)
      return [round((t.ox ?? 0) + qx * cos - qy * sin), round((t.oy ?? 0) + qx * sin + qy * cos), ...rest]
    })
    return { ...s, points, width: Math.round(s.width * k * 100) / 100 }
  })
}
