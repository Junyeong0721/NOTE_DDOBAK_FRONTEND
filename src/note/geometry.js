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
