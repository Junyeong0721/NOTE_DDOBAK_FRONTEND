// 획들을 "줄"로 묶고, 각 묶음이 글씨(text)인지 그림(drawing)인지 판정한다.
// 원본 좌표(rawBBox)로 계산하므로 노트 정리(transform)를 해도 묶음이 바뀌지 않는다.
// 기준값은 실제 필기로 조정한다(기획서 6-1 "AI 기능 설계").
import { rawBBox } from './geometry'
import { isHighlighter } from './tools'

export const LINE_IDLE_MS = 2500 // 펜을 이만큼 떼고 있으면 줄이 끝난 것으로 본다
export const DEFAULT_TEXT_HEIGHT = 40 // 페이지 좌표(가로 1000) 기준 보통 글자 높이
export const MIN_VERTICAL_OVERLAP = 0.3 // 세로로 이만큼 겹치면 같은 줄
export const MAX_VERTICAL_GAP_RATIO = 0.35 // 받침처럼 살짝 아래에 쓴 획 허용 범위 (× 글자 높이)
export const MAX_GAP_RATIO = 2.0 // 줄 오른쪽 끝에서 이만큼(× 글자 높이) 안에 시작해야 같은 줄
export const DRAWING_HEIGHT_RATIO = 2.5 // 보통 글자보다 이만큼 크면 그림
export const LONG_STROKE_ASPECT = 8 // 가로/세로가 이보다 크고 충분히 길면 밑줄·화살표 같은 그림

const height = (b) => b.maxY - b.minY
const width = (b) => b.maxX - b.minX

function union(a, b) {
  return {
    minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY),
  }
}

function verticalRelation(a, b) {
  const overlap = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY)
  const minH = Math.max(1, Math.min(height(a), height(b)))
  return { overlapRatio: overlap / minH, gap: -overlap }
}

// 올가미로 직접 지정한 종류가 있으면 그걸 따른다
function isBig(stroke, b) {
  if (stroke.kind === 'drawing') return true
  if (stroke.kind === 'text') return false
  return isBigStroke(b)
}

function isBigStroke(b, ref = DEFAULT_TEXT_HEIGHT) {
  const h = height(b)
  const w = width(b)
  return h > DRAWING_HEIGHT_RATIO * ref || (w > 3 * ref && w / Math.max(h, 1e-6) > LONG_STROKE_ASPECT)
}

function canJoinText(b, groupBox, ref = DEFAULT_TEXT_HEIGHT) {
  const { overlapRatio, gap } = verticalRelation(b, groupBox)
  const verticalOk = overlapRatio >= MIN_VERTICAL_OVERLAP || gap <= MAX_VERTICAL_GAP_RATIO * ref
  const horizontalOk = b.minX <= groupBox.maxX + MAX_GAP_RATIO * ref && b.maxX >= groupBox.minX - ref
  return verticalOk && horizontalOk
}

const intersects = (a, b, pad = 0) =>
  a.minX <= b.maxX + pad && a.maxX >= b.minX - pad && a.minY <= b.maxY + pad && a.maxY >= b.minY - pad

/** 획이 이 (글씨) 줄에 이어지는지 */
export function joinsGroup(stroke, group) {
  const b = rawBBox(stroke)
  return !isBig(stroke, b) && canJoinText(b, group.bbox)
}

function median(values) {
  const v = [...values].sort((a, b) => a - b)
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

/** @returns {{id: string, kind: 'text'|'drawing', strokeIds: string[], bbox: object}[]} 위→아래 순 */
export function groupLines(strokes) {
  const groups = []
  // 형광펜은 글씨에 덧칠한 표시라 줄 묶기·판정에서 뺀다
  const ordered = [...strokes].filter((s) => s.points.length > 0 && !isHighlighter(s)).sort((a, b) => a.t0 - b.t0)

  for (const stroke of ordered) {
    const b = rawBBox(stroke)

    if (isBig(stroke, b)) {
      const drawing = groups.find((g) => g.big && intersects(b, g.bbox))
      if (drawing) {
        drawing.strokeIds.push(stroke.id)
        drawing.bbox = union(drawing.bbox, b)
      } else {
        groups.push({ id: stroke.id, big: true, strokeIds: [stroke.id], bbox: b })
      }
      continue
    }

    let best = null
    let bestScore = -Infinity
    for (const g of groups) {
      if (g.big || !canJoinText(b, g.bbox)) continue
      const { overlapRatio } = verticalRelation(b, g.bbox)
      if (overlapRatio > bestScore) {
        best = g
        bestScore = overlapRatio
      }
    }
    if (!best) {
      // 그림 안쪽에 쓴 작은 획(화살촉, 그림 속 표시)은 그 그림에 붙인다
      const cx = (b.minX + b.maxX) / 2
      const cy = (b.minY + b.maxY) / 2
      best = groups.find((g) => g.big && intersects({ minX: cx, minY: cy, maxX: cx, maxY: cy }, g.bbox, 0.25 * DEFAULT_TEXT_HEIGHT))
    }
    if (best) {
      best.strokeIds.push(stroke.id)
      best.bbox = union(best.bbox, b)
    } else {
      groups.push({ id: stroke.id, big: false, strokeIds: [stroke.id], bbox: b })
    }
  }
  const forcedText = new Set(ordered.filter((s) => s.kind === 'text').map((s) => s.id))

  const textHeights = groups.filter((g) => !g.big && height(g.bbox) <= 3 * DEFAULT_TEXT_HEIGHT).map((g) => height(g.bbox))
  const ref = textHeights.length ? median(textHeights) : DEFAULT_TEXT_HEIGHT

  return groups
    .map((g) => ({
      id: g.id,
      kind: g.big || (height(g.bbox) > DRAWING_HEIGHT_RATIO * ref && !g.strokeIds.some((id) => forcedText.has(id))) ? 'drawing' : 'text',
      strokeIds: g.strokeIds,
      bbox: g.bbox,
    }))
    .sort((a, b) => a.bbox.minY - b.bbox.minY || a.bbox.minX - b.bbox.minX)
}

/** 지금 쓰던 줄(line)이 끝났는지: 펜을 오래 뗐거나, 다음 획이 이 줄에 이어지지 않으면 끝 */
export function isLineEnd({ line, nextStroke, idleMs }) {
  if (idleMs >= LINE_IDLE_MS) return true
  if (nextStroke) return !joinsGroup(nextStroke, line)
  return false
}
