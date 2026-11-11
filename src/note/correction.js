// 글씨 보정: 인식된 글자를 목표 글씨체로 바꿔 보여 준다.
// 페이지에는 { id, fontId, chars: [{ ch, strokeIds, off? }] }만 저장하고,
// 글자의 위치·크기는 그 글자를 이루는 획의 "지금" 위치로 매번 계산한다.
// → 노트 정리, 올가미 이동, 실행 취소를 따로 처리하지 않아도 보정 글자가 같이 움직인다.
import { strokeBBox } from './geometry'
import { isHighlighter } from './tools'

/** 보정 글자의 실제 높이 = 손글씨 줄 높이 × GLYPH_SCALE (받침·긴 획 때문에 줄 높이가 보통 글자보다 조금 크다) */
export const GLYPH_SCALE = 0.9

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
  // 인식 글자(text)의 띄어쓰기를 글자에 표시해 둔다 (chars에는 공백이 없다)
  const text = [...(ocr?.text ?? '')]
  let ti = 0
  const boxes = (ocr?.chars ?? [])
    .filter((c) => c.ch && c.ch.trim())
    .map((c) => {
      let sp = false
      while (ti < text.length && !text[ti].trim()) {
        sp = true
        ti += 1
      }
      if (text[ti] === c.ch[0]) ti += [...c.ch].length
      return { ch: c.ch, sp, x0: origin.minX + c.x / origin.fit, x1: origin.minX + (c.x + c.w) / origin.fit, strokeIds: [] }
    })
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

  const chars = boxes.filter((b) => b.strokeIds.length > 0).map(({ ch, sp, strokeIds }) => (sp ? { ch, strokeIds, sp } : { ch, strokeIds }))
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

/** 글자 폭 상한 = 글자 간격 × SLOT_FILL (빽빽하게 쓴 줄에서 글자끼리 겹치지 않게) */
export const SLOT_FILL = 0.95
/** 띄어쓰기 = 글자 간격의 WORD_GAP배 */
export const WORD_GAP = 1.6
/** 페이지의 다른 줄들과 크기 차이가 이 비율 안이면 같은 크기로 맞춘다 (훨씬 큰 제목 줄은 그대로) */
export const SIZE_SNAP = 0.25

function median(values) {
  const s = [...values].sort((a, b) => a - b)
  const n = s.length
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2
}

/** 첫 글자와 끝 글자 사이에 글자를 고르게 놓는다. 띄어쓰기(sp)는 WORD_GAP만큼 */
function evenXs(chars, centers) {
  if (centers.length === 1) return { xs: [centers[0].x], step: null }
  const units = chars.slice(1).map((ch) => (ch.sp ? WORD_GAP : 1))
  const step = (centers[centers.length - 1].x - centers[0].x) / units.reduce((a, b) => a + b, 0)
  const xs = [centers[0].x]
  for (const u of units) xs.push(xs[xs.length - 1] + u * step)
  return { xs, step }
}

/**
 * 그릴 보정 글자 목록: [{ ch, x, y(가운데), size(글자 실제 높이), maxWidth, color, fontId, group, shared }] — 페이지 좌표
 * shared: 페이지 공통 크기로 맞춘 줄 (그릴 때 이 줄들은 글자 크기를 하나로 맞춘다)
 * 균일하게: 한 줄 안에서는 글자 간격·크기·기준선이 같고, 페이지의 비슷한 줄끼리는 크기도 같다.
 * options.fontId: 설정에서 고른 글씨체로 모든 줄을 그린다 (없으면 보정할 때의 글씨체)
 */
export function correctionGlyphs(strokes, corrections, options = {}) {
  if (!corrections?.length) return []
  const byId = new Map(strokes.filter((s) => s.points.length > 0).map((s) => [s.id, s]))
  const lines = []
  for (const c of corrections) {
    // 원래대로 돌린 글자도 자리는 차지한다 (그 글자의 원래 획이 보이므로)
    const placed = c.chars.filter((ch) => ch.strokeIds.length > 0 && ch.strokeIds.every((id) => byId.has(id)))
    if (!placed.some((ch) => !ch.off)) continue
    const boxes = placed.map((ch) => boxOfIds(ch.strokeIds, byId))
    const order = boxes.map((b, i) => i).sort((a, b) => centerX(boxes[a]) - centerX(boxes[b]))
    const chars = order.map((i) => placed[i])
    const centers = order.map((i) => ({ x: centerX(boxes[i]), y: (boxes[i].minY + boxes[i].maxY) / 2 }))
    const height = Math.max(...boxes.map((b) => b.maxY)) - Math.min(...boxes.map((b) => b.minY))
    lines.push({ c, chars, centers, size: height * GLYPH_SCALE })
  }

  const common = median(lines.map((l) => l.size))
  const glyphs = []
  for (const { c, chars, centers, size } of lines) {
    const shared = Math.abs(size - common) <= common * SIZE_SNAP
    const lineSize = shared ? common : size
    const yAt = fitLine(centers)
    const { xs, step } = evenXs(chars, centers)
    chars.forEach((ch, i) => {
      if (ch.off) return
      glyphs.push({
        ch: ch.ch, x: xs[i], y: yAt(xs[i]), size: lineSize, maxWidth: step ? step * SLOT_FILL : null,
        color: byId.get(ch.strokeIds[0]).color, fontId: options.fontId ?? c.fontId, group: c.id, shared,
      })
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
