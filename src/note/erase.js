// 부분 지우개: 지우개가 지나간 곳의 점만 지우고, 획을 남은 조각들로 나눈다.
// 판단은 화면에 보이는 위치(transform 적용) 기준이고, 조각에는 원래 좌표와 transform을 그대로 남긴다.
import { applyTransform, distToSegment, strokeBBox } from './geometry'

const MAX_GAP = 2 // 자를 자리가 정확하도록 점 간격을 이만큼(페이지 좌표) 이하로 채운다
let seq = 0

const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d

/** 점 사이를 채운다. 회전·이동 transform은 거리를 바꾸지 않으므로 원래 좌표에서 채워도 된다 */
function densify(points, gap) {
  const out = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const [x0, y0, p0, t0] = points[i - 1]
    const [x1, y1, p1, t1] = points[i]
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / gap)
    for (let k = 1; k < n; k++) {
      const f = k / n
      out.push([round(x0 + (x1 - x0) * f, 1), round(y0 + (y1 - y0) * f, 1), round(p0 + (p1 - p0) * f, 2), Math.round(t0 + (t1 - t0) * f)])
    }
    out.push(points[i])
  }
  return out
}

function nearSegment(stroke, a, b, radius) {
  const box = strokeBBox(stroke)
  return !(box.maxX < Math.min(a.x, b.x) - radius || box.minX > Math.max(a.x, b.x) + radius
    || box.maxY < Math.min(a.y, b.y) - radius || box.minY > Math.max(a.y, b.y) + radius)
}

const hits = (pt, a, b, radius) => distToSegment(pt[0], pt[1], [a.x, a.y], [b.x, b.y]) <= radius

/**
 * 지우개가 a → b로 지나갔을 때의 획 목록. 바뀐 게 없으면 같은 배열과 changed: false.
 * groupOf(id): 보정된 글자의 숨은 획이면 그 글자의 획 id 목록 → 자르지 않고 글자째 지운다.
 */
export function eraseAlong(strokes, a, b, radius, groupOf = () => null) {
  const removeIds = new Set()
  const replaced = new Map() // 원래 id → 조각들
  for (const s of strokes) {
    if (s.points.length === 0 || removeIds.has(s.id) || !nearSegment(s, a, b, radius)) continue
    const group = groupOf(s.id)
    const dense = s.points.length > 1 ? densify(s.points, Math.min(MAX_GAP, radius / 2)) : s.points
    const keep = dense.map((p) => !hits(applyTransform([p[0], p[1]], s.transform), a, b, radius))
    if (keep.every(Boolean)) continue
    if (group) {
      group.forEach((id) => removeIds.add(id))
      continue
    }
    const pieces = []
    let run = []
    dense.forEach((p, i) => {
      if (keep[i]) run.push(p)
      if (!keep[i] || i === dense.length - 1) {
        if (run.length >= 2) {
          seq += 1
          pieces.push({ ...s, id: `${s.id}.${seq}`, points: run })
        }
        run = []
      }
    })
    replaced.set(s.id, pieces)
  }
  if (removeIds.size === 0 && replaced.size === 0) return { strokes, changed: false }
  const next = []
  for (const s of strokes) {
    if (removeIds.has(s.id)) continue
    if (replaced.has(s.id)) next.push(...replaced.get(s.id))
    else next.push(s)
  }
  return { strokes: next, changed: true }
}
