// 페이지를 캔버스에 그린다. 좌표는 페이지 단위이고 scale(= 화면 너비 / 1000)을 곱해 그린다.
import { PAGE_HEIGHT, PAGE_WIDTH } from './content'
import { strokeBBox, strokePoints } from './geometry'

export const GUIDE_SPACING = 50
const GUIDE_COLOR = '#e3e7ee'
const TEXT_LINE_COLOR = '#1e5bd8'
const DRAWING_COLOR = '#d32f2f'

/** 필압 0.5에서 기본 굵기, 세게 누를수록 굵게 */
export const strokeLineWidth = (width, pressure, scale) => width * (0.4 + 1.2 * pressure) * scale

export function drawStroke(ctx, stroke, scale) {
  const pts = strokePoints(stroke)
  if (pts.length === 0) return
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (pts.length === 1) {
    const [x, y, p] = pts[0]
    ctx.beginPath()
    ctx.arc(x * scale, y * scale, strokeLineWidth(stroke.width, p, scale) / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  // 점 사이를 중간점 기준 곡선으로 이어 부드럽게, 구간마다 필압으로 굵기를 바꾼다
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0, p0] = pts[i - 1]
    const [x1, y1, p1] = pts[i]
    const prev = pts[i - 2] ?? pts[i - 1]
    const sx = ((prev[0] + x0) / 2) * scale
    const sy = ((prev[1] + y0) / 2) * scale
    const ex = ((x0 + x1) / 2) * scale
    const ey = ((y0 + y1) / 2) * scale
    ctx.lineWidth = strokeLineWidth(stroke.width, (p0 + p1) / 2, scale)
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.quadraticCurveTo(x0 * scale, y0 * scale, ex, ey)
    if (i === pts.length - 1) ctx.lineTo(x1 * scale, y1 * scale)
    ctx.stroke()
  }
}

function drawGuides(ctx, scale) {
  ctx.strokeStyle = GUIDE_COLOR
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let y = GUIDE_SPACING; y < PAGE_HEIGHT; y += GUIDE_SPACING) {
    ctx.moveTo(0, y * scale)
    ctx.lineTo(PAGE_WIDTH * scale, y * scale)
  }
  ctx.stroke()
}

function drawLineBoxes(ctx, strokes, lines, lineLabels, scale) {
  const byId = new Map(strokes.map((s) => [s.id, s]))
  ctx.lineWidth = 1
  ctx.font = `${Math.max(10, 12 * scale)}px system-ui, sans-serif`
  for (const line of lines) {
    const boxes = line.strokeIds.map((id) => byId.get(id)).filter(Boolean).map(strokeBBox)
    if (boxes.length === 0) continue
    const minX = Math.min(...boxes.map((b) => b.minX)) - 4
    const minY = Math.min(...boxes.map((b) => b.minY)) - 4
    const maxX = Math.max(...boxes.map((b) => b.maxX)) + 4
    const maxY = Math.max(...boxes.map((b) => b.maxY)) + 4
    const color = line.kind === 'text' ? TEXT_LINE_COLOR : DRAWING_COLOR
    ctx.strokeStyle = color
    ctx.strokeRect(minX * scale, minY * scale, (maxX - minX) * scale, (maxY - minY) * scale)
    const label = lineLabels?.[line.id]
    if (label) {
      ctx.fillStyle = color
      ctx.fillText(label, (maxX + 6) * scale, maxY * scale)
    }
  }
}

/** 페이지 전체를 다시 그린다. activeStroke는 지금 쓰고 있는(아직 저장 전) 획 */
export function drawPage(ctx, { strokes, scale, showGuides = false, lines = [], showLines = false, lineLabels = {}, activeStroke = null, hiddenIds = null }) {
  ctx.clearRect(0, 0, PAGE_WIDTH * scale, PAGE_HEIGHT * scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, PAGE_WIDTH * scale, PAGE_HEIGHT * scale)
  if (showGuides) drawGuides(ctx, scale)
  for (const s of strokes) {
    if (!hiddenIds || !hiddenIds.has(s.id)) drawStroke(ctx, s, scale)
  }
  if (activeStroke) drawStroke(ctx, activeStroke, scale)
  if (showLines) drawLineBoxes(ctx, strokes, lines, lineLabels, scale)
}
