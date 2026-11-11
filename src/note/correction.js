// 글씨 보정: 인식된 글자를 목표 글씨체로 바꿔 보여 준다.
// 페이지에는 { id, fontId, chars: [{ ch, strokeIds, off? }] }만 저장하고,
// 글자의 위치·크기는 그 글자를 이루는 획의 "지금" 위치로 매번 계산한다.
// → 노트 정리, 올가미 이동, 실행 취소를 따로 처리하지 않아도 보정 글자가 같이 움직인다.
import { strokeBBox } from './geometry'
import { isHighlighter } from './tools'

/** 보정 글자 크기 = 줄 높이 × GLYPH_SCALE (한글은 글꼴 칸보다 조금 작게 그려지므로 살짝 키운다) */
export const GLYPH_SCALE = 1.05

let seq = 0
const newId = () => {
  seq += 1
  return `c_${Date.now()}_${seq}`
}

const centerX = (b) => (b.minX + b.maxX) / 2

/**
 * OCR 결과(줄 이미지 픽셀 좌표)를 페이지 좌표로 되돌리고, 각 획을 가로 가운데가 들어가는(없으면 가장 가까운) 글자에 배정한다.
 * origin: 줄 이미지를 만들 때의 { minX, minY, fit } (페이지 x = minX + 이미지 x / fit)
 */
export function buildCorrection({ ocr, origin, strokes, fontId }) {
  const boxes = (ocr?.chars ?? [])
    .filter((c) => c.ch && c.ch.trim())
    .map((c) => ({ ch: c.ch, x0: origin.minX + c.x / origin.fit, x1: origin.minX + (c.x + c.w) / origin.fit, strokeIds: [] }))
    .sort((a, b) => a.x0 + a.x1 - (b.x0 + b.x1))
  if (boxes.length === 0) return null

  for (const s of strokes) {
    if (isHighlighter(s) || s.points.length === 0) continue
    const cx = centerX(strokeBBox(s))
    let best = null
    let bestScore = Infinity
    for (const b of boxes) {
      const outside = cx < b.x0 ? b.x0 - cx : cx > b.x1 ? cx - b.x1 : 0
      const score = outside * 1000 + Math.abs(cx - (b.x0 + b.x1) / 2) // 상자 안이 먼저, 그다음 가운데에 가까운 것
      if (score < bestScore) {
        bestScore = score
        best = b
      }
    }
    best.strokeIds.push(s.id)
  }

  const chars = boxes.filter((b) => b.strokeIds.length > 0).map(({ ch, strokeIds }) => ({ ch, strokeIds }))
  return chars.length > 0 ? { id: newId(), fontId, chars } : null
}

export const correctionText = (correction) => correction.chars.map((c) => c.ch).join('')

/** 숨겨야 할 원래 획 = 원래대로(off)가 아닌 글자의 획 */
export function correctedStrokeIds(corrections) {
  const ids = new Set()
  for (const c of corrections ?? []) {
    for (const ch of c.chars) if (!ch.off) ch.strokeIds.forEach((id) => ids.add(id))
  }
  return ids
}

/** 지우개용: 이 획이 보정된 글자의 일부면 그 글자의 획 전체 */
export function charGroupOf(corrections, strokeId) {
  for (const c of corrections ?? []) {
    for (const ch of c.chars) if (!ch.off && ch.strokeIds.includes(strokeId)) return ch.strokeIds
  }
  return null
}

function boxOfIds(ids, byId) {
  const boxes = ids.map((id) => byId.get(id)).map(strokeBBox)
  return {
    minX: Math.min(...boxes.map((b) => b.minX)), minY: Math.min(...boxes.map((b) => b.minY)),
    maxX: Math.max(...boxes.map((b) => b.maxX)), maxY: Math.max(...boxes.map((b) => b.maxY)),
  }
}

/** 글자 가운데들에 맞춘 직선 y = a + b·x (기울어진 줄도 기울기를 따라간다) */
function fitLine(points) {
  const n = points.length
  const mx = points.reduce((s, p) => s + p.x, 0) / n
  const my = points.reduce((s, p) => s + p.y, 0) / n
  let sxy = 0
  let sxx = 0
  for (const p of points) {
    sxy += (p.x - mx) * (p.y - my)
    sxx += (p.x - mx) ** 2
  }
  const b = n > 1 && sxx > 0 ? sxy / sxx : 0
  return (x) => my + b * (x - mx)
}

/** 그릴 보정 글자 목록: [{ ch, x, y(가운데), size, color, fontId }] — 페이지 좌표 */
export function correctionGlyphs(strokes, corrections) {
  if (!corrections?.length) return []
  const byId = new Map(strokes.filter((s) => s.points.length > 0).map((s) => [s.id, s]))
  const glyphs = []
  for (const c of corrections) {
    const active = c.chars.filter((ch) => !ch.off && ch.strokeIds.length > 0 && ch.strokeIds.every((id) => byId.has(id)))
    if (active.length === 0) continue
    const boxes = active.map((ch) => boxOfIds(ch.strokeIds, byId))
    const size = (Math.max(...boxes.map((b) => b.maxY)) - Math.min(...boxes.map((b) => b.minY))) * GLYPH_SCALE
    const centers = boxes.map((b) => ({ x: centerX(b), y: (b.minY + b.maxY) / 2 }))
    const yAt = fitLine(centers)
    active.forEach((ch, i) => {
      glyphs.push({ ch: ch.ch, x: centers[i].x, y: yAt(centers[i].x), size, color: byId.get(ch.strokeIds[0]).color, fontId: c.fontId })
    })
  }
  return glyphs
}

/** 글자 하나만 원래대로 ↔ 보정 */
export function toggleChar(corrections, correctionId, index) {
  return corrections.map((c) => {
    if (c.id !== correctionId) return c
    const chars = c.chars.map((ch, i) => {
      if (i !== index) return ch
      if (ch.off) {
        const { off: _off, ...rest } = ch
        return rest
      }
      return { ...ch, off: true }
    })
    return { ...c, chars }
  })
}

/** 주어진 획을 하나라도 포함한 보정을 통째로 없앤다 (= 원래 글씨로) */
export function removeCorrections(corrections, strokeIds) {
  const set = new Set(strokeIds)
  return (corrections ?? []).filter((c) => !c.chars.some((ch) => ch.strokeIds.some((id) => set.has(id))))
}

/** 획이 지워진 글자는 보정에서 빼고(남은 획은 다시 보임), 빈 보정은 없앤다. 바뀐 게 없으면 같은 배열 */
export function pruneCorrections(corrections, strokes) {
  if (!corrections?.length) return corrections ?? []
  const ids = new Set(strokes.map((s) => s.id))
  let changed = false
  const next = []
  for (const c of corrections) {
    const chars = c.chars.filter((ch) => ch.strokeIds.every((id) => ids.has(id)))
    if (chars.length !== c.chars.length) changed = true
    if (chars.length > 0) next.push(chars.length === c.chars.length ? c : { ...c, chars })
  }
  return changed ? next : corrections
}
