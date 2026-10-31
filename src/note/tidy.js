// "노트 정리": 글씨 줄만 기울기를 펴고, 왼쪽 끝과 줄 간격을 맞춘다. 그림은 건드리지 않는다.
// 원본 points는 그대로 두고 획마다 transform만 새로 계산한다(매번 원본 기준 → 두 번 해도 같은 결과).
import { applyTransform, rawBBox } from './geometry'
import { DEFAULT_TEXT_HEIGHT, groupLines } from './lines'

export const MAX_TIDY_ANGLE = (15 * Math.PI) / 180 // 이보다 많이 기울면 일부러 그렇게 쓴 것으로 보고 펴지 않는다
export const LEFT_SNAP = 40 // 왼쪽 끝이 다른 줄들과 이만큼 이내로 차이 나면 맞춘다(들여쓰기는 유지)
export const PARAGRAPH_GAP_RATIO = 1.5 // 줄 사이가 이만큼(× 글자 높이) 벌어지면 다른 문단으로 본다

const median = (values) => {
  const v = [...values].sort((a, b) => a - b)
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

const round = (n, digits) => Math.round(n * 10 ** digits) / 10 ** digits

function slopeOf(points) {
  if (points.length < 2) return 0
  const n = points.length
  const mx = points.reduce((s, [x]) => s + x, 0) / n
  const my = points.reduce((s, [, y]) => s + y, 0) / n
  let num = 0
  let den = 0
  for (const [x, y] of points) {
    num += (x - mx) * (y - my)
    den += (x - mx) ** 2
  }
  return den === 0 ? 0 : num / den
}

function rotatedBox(strokes, rotation) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const s of strokes) {
    for (const [px, py] of s.points) {
      const [x, y] = applyTransform([px, py], rotation)
      minX = Math.min(minX, x); minY = Math.min(minY, y)
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
    }
  }
  return { minX, minY, maxX, maxY }
}

export function tidyPage(strokes) {
  const byId = new Map(strokes.map((s) => [s.id, s]))
  const lines = groupLines(strokes)
  const textLines = lines.filter((l) => l.kind === 'text')
  if (textLines.length === 0) return untidyPage(strokes)

  const ref = median(textLines.map((l) => l.bbox.maxY - l.bbox.minY)) || DEFAULT_TEXT_HEIGHT

  // 1) 줄마다 기울기 펴기: 획들의 (가로 중심, 아래끝)으로 기준선을 구해 그 각도만큼 반대로 돌린다
  const plans = textLines.map((line) => {
    const lineStrokes = line.strokeIds.map((id) => byId.get(id))
    const bottoms = lineStrokes.map((s) => {
      const b = rawBBox(s)
      return [(b.minX + b.maxX) / 2, b.maxY]
    })
    const m = slopeOf(bottoms)
    let angle = Math.atan(m)
    if (Math.abs(angle) > MAX_TIDY_ANGLE) angle = 0
    const mx = bottoms.reduce((s, [x]) => s + x, 0) / bottoms.length
    const my = bottoms.reduce((s, [, y]) => s + y, 0) / bottoms.length
    const ox = line.bbox.minX
    const oy = my + m * (ox - mx) // 기준선의 왼쪽 시작점
    const rotation = { dx: 0, dy: 0, rotate: -angle, ox, oy }
    return { line, lineStrokes, rotation, box: rotatedBox(lineStrokes, rotation), dx: 0, dy: 0 }
  })

  // 2) 왼쪽 끝 맞추기
  const medianLeft = median(plans.map((p) => p.box.minX))
  for (const p of plans) {
    if (Math.abs(p.box.minX - medianLeft) <= LEFT_SNAP) p.dx = medianLeft - p.box.minX
  }

  // 3) 줄 간격 맞추기: 그림 없이 이어지는 문단 안에서만, 간격을 그 문단의 중앙값으로
  const drawings = lines.filter((l) => l.kind === 'drawing')
  const ordered = [...plans].sort((a, b) => a.box.minY - b.box.minY)
  const blocks = []
  for (const p of ordered) {
    const block = blocks[blocks.length - 1]
    const prev = block?.[block.length - 1]
    const gap = prev ? p.box.minY - prev.box.maxY : Infinity
    const drawingBetween = prev && drawings.some((d) => d.bbox.minY >= prev.box.maxY - 1 && d.bbox.maxY <= p.box.minY + 1)
    if (prev && gap >= 0 && gap < PARAGRAPH_GAP_RATIO * ref && !drawingBetween) block.push(p)
    else blocks.push([p])
  }
  for (const block of blocks) {
    if (block.length < 3) continue // 간격이 하나뿐이면 맞출 기준이 없다
    const target = median(block.slice(1).map((p, i) => p.box.minY - block[i].box.maxY))
    let bottom = block[0].box.maxY
    for (const p of block.slice(1)) {
      p.dy = bottom + target - p.box.minY
      bottom = p.box.maxY + p.dy
    }
  }

  // 4) 획마다 transform 저장 (변화가 없으면 null)
  const transforms = new Map()
  for (const p of plans) {
    const t = { dx: round(p.dx, 3), dy: round(p.dy, 3), rotate: round(p.rotation.rotate, 6), ox: round(p.rotation.ox, 3), oy: round(p.rotation.oy, 3) }
    const identity = t.dx === 0 && t.dy === 0 && t.rotate === 0
    for (const s of p.lineStrokes) transforms.set(s.id, identity ? null : t)
  }
  return strokes.map((s) => ({ ...s, transform: transforms.get(s.id) ?? null }))
}

export function untidyPage(strokes) {
  return strokes.map((s) => ({ ...s, transform: null }))
}
