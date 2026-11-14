// 연습 글자를 그리고 채점용 모눈으로 바꾼다. 목표 글자는 캔버스가 필요하고, 내 획은 계산만으로 모눈에 찍는다.
import { ensureFont, fontFamily } from '../note/fonts'
import { hangulRatio } from '../note/render'
import { CELL } from './cells'
import { SCORE_TUNING, emptyGrid } from './score'

export const TARGET_COLOR = '#b9bfcc' // 겹쳐 보기의 목표 글자
export const INK_COLOR = '#1f2a44' // 내 글씨 (노트의 남색 잉크)

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** 글꼴마다 한글 높이가 달라서, '가'의 실제 높이가 칸의 80%가 되는 글자 크기를 구한다 */
export function glyphPx(ctx, fontId, cellPx) {
  return (cellPx * SCORE_TUNING.GLYPH_FILL) / hangulRatio(ctx, fontFamily(fontId))
}

/**
 * 칸 (x, y)에 목표 글자를 그린다 (가이드·겹쳐 보기·조언 그림·채점 모눈 공용).
 * 모든 글자가 같은 기준선을 쓰도록 '가'가 칸 가운데 오게 맞춘다.
 */
export function drawTarget(ctx, ch, fontId, x, y, cellPx, { alpha = 1, color = TARGET_COLOR } = {}) {
  const px = glyphPx(ctx, fontId, cellPx)
  ctx.save()
  ctx.font = `${px}px ${fontFamily(fontId)}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const m = ctx.measureText('가')
  const asc = Number.isFinite(m?.actualBoundingBoxAscent) ? m.actualBoundingBoxAscent : px * 0.75
  const desc = Number.isFinite(m?.actualBoundingBoxDescent) ? m.actualBoundingBoxDescent : px * 0.05
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.fillText(ch, x + cellPx / 2, y + cellPx / 2 + (asc - desc) / 2)
  ctx.restore()
}

/** 칸 좌표(0~100)의 획을 칸 (x, y)에 그린다. 굵기는 칸 크기에 비례 */
export function drawCellStrokes(ctx, strokes, x, y, cellPx, { color = INK_COLOR, width = 3.2 } = {}) {
  const k = cellPx / CELL
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width * k
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of strokes) {
    const pts = s.points
    if (pts.length === 0) continue
    if (pts.length === 1) {
      ctx.beginPath()
      ctx.arc(x + pts[0][0] * k, y + pts[0][1] * k, (width * k) / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.beginPath()
    ctx.moveTo(x + pts[0][0] * k, y + pts[0][1] * k)
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]
      const [x1, y1] = pts[i]
      ctx.quadraticCurveTo(x + x0 * k, y + y0 * k, x + ((x0 + x1) / 2) * k, y + ((y0 + y1) / 2) * k)
    }
    const last = pts[pts.length - 1]
    ctx.lineTo(x + last[0] * k, y + last[1] * k)
    ctx.stroke()
  }
  ctx.restore()
}

/** 캔버스 픽셀(RGBA) → 모눈. 반투명 가장자리는 절반 넘게 칠해진 곳만 잉크 */
export function gridFromImageData({ width, height, data }) {
  const grid = emptyGrid(width, height)
  for (let i = 0; i < width * height; i++) if (data[i * 4 + 3] > 127) grid.data[i] = 1
  return grid
}

/** 목표 글자의 채점 모눈. 글꼴을 다 받은 뒤에 그린다 (기본 글꼴로 채점되지 않게) */
export async function targetGrid(ch, fontId) {
  await ensureFont(fontId)
  const n = SCORE_TUNING.GRID
  const ctx = makeCanvas(n, n).getContext('2d', { willReadFrequently: true })
  drawTarget(ctx, ch, fontId, 0, 0, n, { color: '#000' })
  return gridFromImageData(ctx.getImageData(0, 0, n, n))
}

/**
 * 내 획(칸 좌표 0~100)의 채점 모눈. 펜 굵기·필압과 상관없이 같은 굵기로 찍어서 같은 글씨는 같은 점수가 나오게 한다.
 * 칸 밖으로 나간 부분은 버린다.
 */
export function strokesGrid(strokes) {
  const n = SCORE_TUNING.GRID
  const grid = emptyGrid(n)
  const k = n / CELL
  const r = SCORE_TUNING.PEN / 2
  const stamp = (px, py) => {
    for (let y = Math.max(0, Math.floor(py - r)); y <= Math.min(n - 1, Math.ceil(py + r)); y++) {
      for (let x = Math.max(0, Math.floor(px - r)); x <= Math.min(n - 1, Math.ceil(px + r)); x++) {
        if (Math.hypot(x + 0.5 - px, y + 0.5 - py) <= r) grid.data[y * n + x] = 1
      }
    }
  }
  for (const s of strokes) {
    const pts = s.points
    if (pts.length === 1) stamp(pts[0][0] * k, pts[0][1] * k)
    for (let i = 1; i < pts.length; i++) {
      const x0 = pts[i - 1][0] * k, y0 = pts[i - 1][1] * k
      const x1 = pts[i][0] * k, y1 = pts[i][1] * k
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2))
      for (let j = 0; j <= steps; j++) stamp(x0 + ((x1 - x0) * j) / steps, y0 + ((y1 - y0) * j) / steps)
    }
  }
  return grid
}

export { makeCanvas }
