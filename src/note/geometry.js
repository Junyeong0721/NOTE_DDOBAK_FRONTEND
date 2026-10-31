import { PAGE_WIDTH } from './content'

// transform: 원본 점을 (ox, oy) 중심으로 rotate(라디안)만큼 돌린 뒤 (dx, dy) 이동.
export function applyTransform([x, y], transform) {
  if (!transform) return [x, y]
  const { dx = 0, dy = 0, rotate = 0, ox = 0, oy = 0 } = transform
  const cos = Math.cos(rotate)
  const sin = Math.sin(rotate)
  const rx = ox + (x - ox) * cos - (y - oy) * sin
  const ry = oy + (x - ox) * sin + (y - oy) * cos
  return [rx + dx, ry + dy]
}

export function strokePoints(stroke) {
  return stroke.points.map(([x, y, p]) => [...applyTransform([x, y], stroke.transform), p])
}

function bboxOf(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

export const strokeBBox = (stroke) => bboxOf(strokePoints(stroke))

export const rawBBox = (stroke) => bboxOf(stroke.points)

export function clientToPage(clientX, clientY, rect) {
  const scale = PAGE_WIDTH / rect.width
  return { x: (clientX - rect.left) * scale, y: (clientY - rect.top) * scale }
}

function distToSegment(px, py, [x0, y0], [x1, y1]) {
  const vx = x1 - x0
  const vy = y1 - y0
  const len2 = vx * vx + vy * vy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / len2))
  return Math.hypot(px - (x0 + t * vx), py - (y0 + t * vy))
}

/** 지우개: 점 (x, y)가 획(변환 적용 위치)에서 radius 이내인지 */
export function hitStroke(stroke, { x, y }, radius) {
  const pts = strokePoints(stroke)
  if (pts.length === 1) return Math.hypot(x - pts[0][0], y - pts[0][1]) <= radius
  for (let i = 1; i < pts.length; i++) {
    if (distToSegment(x, y, pts[i - 1], pts[i]) <= radius) return true
  }
  return false
}
