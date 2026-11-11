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

/** 이 비율(글자 높이 대비)보다 세로로 떨어지면 다른 줄로 본다 */
const ROW_BREAK = 0.6

/**
 * 글자들을 줄로 나눈다 (위 줄부터, 줄 안은 왼쪽부터). metric(item) → { cy, h, cx }
 * 세로 가운데를 위에서부터 보며, 지금 줄의 평균보다 글자 높이의 ROW_BREAK배 넘게 내려가면 새 줄.
 */
function splitRows(items, metric) {
  const m = items.map((it) => ({ it, ...metric(it) }))
  const hs = m.map((x) => x.h).sort((a, b) => a - b)
  const limit = hs[Math.floor(hs.length / 2)] * ROW_BREAK
  const rows = []
  for (const x of [...m].sort((a, b) => a.cy - b.cy)) {
    const row = rows[rows.length - 1]
    const mean = row && row.reduce((t, r) => t + r.cy, 0) / row.length
    if (row && x.cy - mean <= limit) row.push(x)
    else rows.push([x])
  }
  return rows.map((row) => row.sort((a, b) => a.cx - b.cx).map((x) => x.it))
}

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
      return {
        ch: c.ch, sp, strokeIds: [],
        x0: origin.minX + c.x / origin.fit, x1: origin.minX + (c.x + c.w) / origin.fit,
        y0: origin.minY + c.y / origin.fit, y1: origin.minY + (c.y + c.h) / origin.fit,
      }
    })
  if (boxes.length === 0) return null
  // 읽는 순서: 위 줄부터, 줄 안에서는 왼쪽부터 (올가미로 여러 줄을 골랐을 때)
  const ordered = splitRows(boxes, (b) => ({ cy: (b.y0 + b.y1) / 2, h: b.y1 - b.y0, cx: (b.x0 + b.x1) / 2 })).flat()

  const outside = (v, lo, hi) => (v < lo ? lo - v : v > hi ? v - hi : 0)
  for (const s of strokes) {
    if (isHighlighter(s) || s.points.length === 0) continue
    const sb = strokeBBox(s)
    const cx = centerX(sb)
    const cy = (sb.minY + sb.maxY) / 2
    let best = null
    let bestScore = Infinity
    for (const b of ordered) {
      // 상자 안(가로·세로)이 먼저, 그다음 가운데에 가까운 것
      const out = outside(cx, b.x0, b.x1) + outside(cy, b.y0, b.y1)
      const score = out * 1000 + Math.hypot(cx - (b.x0 + b.x1) / 2, cy - (b.y0 + b.y1) / 2)
      if (score < bestScore) {
        bestScore = score
        best = b
      }
    }
    best.strokeIds.push(s.id)
  }

  const chars = ordered.filter((b) => b.strokeIds.length > 0).map(({ ch, sp, strokeIds }) => (sp ? { ch, strokeIds, sp } : { ch, strokeIds }))
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

/** 왼쪽 끝이 이만큼(페이지 좌표) 안으로 비슷한 줄들은 왼쪽을 맞춘다 */
export const LEFT_ALIGN = 30

/**
 * 그릴 보정 글자 목록: [{ ch, x, y(가운데), size(글자 실제 높이), maxWidth, color, fontId, group, shared, ref, cuts }] — 페이지 좌표
 * 균일하게:
 * - 쓴 줄 그대로: 한 보정 안에 두 줄이 있으면 두 줄로 (줄마다 따로 배치)
 * - 한 줄 안: 글자 간격·크기가 같고 수평인 기준선 하나
 * - 페이지: 크기가 비슷한 줄끼리 같은 크기(shared), 왼쪽 끝이 비슷한 줄끼리 왼쪽 정렬
 * options.fontId: 설정에서 고른 글씨체로 모든 줄을 그린다 (없으면 보정할 때의 글씨체)
 */
export function correctionGlyphs(strokes, corrections, options = {}) {
  if (!corrections?.length) return []
  const byId = new Map(strokes.filter((s) => s.points.length > 0).map((s) => [s.id, s]))
  const rows = []
  for (const c of corrections) {
    // 원래대로 돌린 글자도 자리는 차지한다 (그 글자의 원래 획이 보이므로)
    const placed = c.chars
      .map((ch, index) => ({ ch, index }))
      .filter(({ ch }) => ch.strokeIds.length > 0 && ch.strokeIds.every((id) => byId.has(id)))
      .map(({ ch, index }) => ({ ch, index, box: boxOfIds(ch.strokeIds, byId) }))
    if (!placed.some((p) => !p.ch.off)) continue
    const split = splitRows(placed, (p) => ({ cy: (p.box.minY + p.box.maxY) / 2, h: p.box.maxY - p.box.minY, cx: centerX(p.box) }))
    split.forEach((row, k) => {
      if (!row.some((p) => !p.ch.off)) return
      const height = Math.max(...row.map((p) => p.box.maxY)) - Math.min(...row.map((p) => p.box.minY))
      rows.push({ c, group: split.length > 1 ? `${c.id}:${k}` : c.id, row, size: height * GLYPH_SCALE, start: row[0].box.minX })
    })
  }
  if (rows.length === 0) return []

  // 왼쪽 끝 맞추기: 시작이 비슷한 줄끼리 가장 왼쪽에 맞춘다
  const byStart = [...rows].sort((a, b) => a.start - b.start)
  let anchor = null
  for (const r of byStart) {
    if (anchor === null || r.start - anchor > LEFT_ALIGN) anchor = r.start
    r.shift = anchor - r.start
  }

  const common = median(rows.map((r) => r.size))
  const glyphs = []
  for (const { c, group, row, size, shift } of rows) {
    const shared = Math.abs(size - common) <= common * SIZE_SNAP
    const centers = row.map((p) => ({ x: centerX(p.box), y: (p.box.minY + p.box.maxY) / 2 }))
    const y = centers.reduce((t, p) => t + p.y, 0) / centers.length
    const { xs, step } = evenXs(row.map((p) => p.ch), centers)
    row.forEach(({ ch, index }, i) => {
      if (ch.off) return
      glyphs.push({
        ch: ch.ch, x: xs[i] + shift, y, size: shared ? common : size, maxWidth: step ? step * SLOT_FILL : null,
        color: byId.get(ch.strokeIds[0]).color, fontId: options.fontId ?? c.fontId, group, shared,
        ref: { cid: c.id, index }, cuts: ch.cuts ?? null, // ref: 어느 보정의 몇 번째 글자, cuts: 지우개로 지운 자리
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
