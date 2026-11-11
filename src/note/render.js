// 페이지를 캔버스에 그린다. 좌표는 페이지 단위이고 scale(= 화면 너비 / 1000)을 곱해 그린다.
import { PAGE_HEIGHT, PAGE_WIDTH } from './content'
import { correctedStrokeIds, correctionGlyphs } from './correction'
import { fontFamily } from './fonts'
import { strokeBBox, strokePoints } from './geometry'
import { HIGHLIGHTER_ALPHA, isHighlighter } from './tools'

export const GUIDE_SPACING = 50
const GUIDE_COLOR = '#e3e7ee'
const TEXT_LINE_COLOR = '#1e5bd8'
const DRAWING_COLOR = '#d32f2f'

/** 필압 0.5에서 기본 굵기, 세게 누를수록 굵게 */
export const strokeLineWidth = (width, pressure, scale) => width * (0.4 + 1.2 * pressure) * scale

// 형광펜: 한 경로로 한 번에 그려야 겹치는 구간이 진해지지 않는다. 필압과 상관없이 고정 굵기.
function drawHighlighter(ctx, pts, stroke, scale) {
  ctx.save()
  ctx.globalAlpha = HIGHLIGHTER_ALPHA
  ctx.strokeStyle = stroke.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = stroke.width * scale
  ctx.beginPath()
  ctx.moveTo(pts[0][0] * scale, pts[0][1] * scale)
  if (pts.length === 1) ctx.lineTo(pts[0][0] * scale + 0.01, pts[0][1] * scale)
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    ctx.quadraticCurveTo(x0 * scale, y0 * scale, ((x0 + x1) / 2) * scale, ((y0 + y1) / 2) * scale)
  }
  const last = pts[pts.length - 1]
  ctx.lineTo(last[0] * scale, last[1] * scale)
  ctx.stroke()
  ctx.restore()
}

export function drawStroke(ctx, stroke, scale) {
  const pts = strokePoints(stroke)
  if (pts.length === 0) return
  if (isHighlighter(stroke)) {
    drawHighlighter(ctx, pts, stroke, scale)
    return
  }
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

const SELECTION_COLOR = '#2563eb'
const SELECTION_PAD = 8

function drawSelection(ctx, box, scale) {
  ctx.save()
  ctx.strokeStyle = SELECTION_COLOR
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 4])
  ctx.fillStyle = 'rgba(37, 99, 235, 0.06)'
  const x = (box.minX - SELECTION_PAD) * scale
  const y = (box.minY - SELECTION_PAD) * scale
  const w = (box.maxX - box.minX + SELECTION_PAD * 2) * scale
  const h = (box.maxY - box.minY + SELECTION_PAD * 2) * scale
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)
  ctx.restore()
}

const FOCUS_COLOR = '#e0a800' // 보정안 대상 줄 (노란 형광펜 계열)

function drawFocus(ctx, box, scale) {
  ctx.save()
  ctx.strokeStyle = FOCUS_COLOR
  ctx.lineWidth = 2
  ctx.setLineDash([8, 5])
  const pad = 10
  ctx.strokeRect((box.minX - pad) * scale, (box.minY - pad) * scale, (box.maxX - box.minX + pad * 2) * scale, (box.maxY - box.minY + pad * 2) * scale)
  ctx.restore()
}

/** 보정 글자: 원래 획 대신 목표 글씨체로 그린다 */
function drawGlyphs(ctx, glyphs, scale) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const g of glyphs) {
    ctx.font = `${g.size * scale}px ${fontFamily(g.fontId)}, sans-serif`
    ctx.fillStyle = g.color
    ctx.fillText(g.ch, g.x * scale, g.y * scale)
  }
  ctx.restore()
}

function drawLasso(ctx, path, scale) {
  if (path.length < 2) return
  ctx.save()
  ctx.strokeStyle = SELECTION_COLOR
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(path[0][0] * scale, path[0][1] * scale)
  for (const [x, y] of path.slice(1)) ctx.lineTo(x * scale, y * scale)
  ctx.stroke()
  ctx.restore()
}

/**
 * 페이지 전체를 다시 그린다. activeStroke는 지금 쓰고 있는(아직 저장 전) 획.
 * hiddenIds: 지우개로 지우는 중인 획, corrections: 글씨 보정(보정된 글자의 원래 획은 숨기고 글씨체로 그림)
 */
export function drawPage(ctx, {
  strokes, scale, showGuides = false, lines = [], showLines = false, lineLabels = {},
  activeStroke = null, hiddenIds = null, selectionBox = null, lassoPath = null,
  corrections = null, focusBox = null,
}) {
  ctx.clearRect(0, 0, PAGE_WIDTH * scale, PAGE_HEIGHT * scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, PAGE_WIDTH * scale, PAGE_HEIGHT * scale)
  if (showGuides) drawGuides(ctx, scale)
  const present = hiddenIds ? strokes.filter((s) => !hiddenIds.has(s.id)) : strokes
  const corrected = correctedStrokeIds(corrections)
  const visible = corrected.size ? present.filter((s) => !corrected.has(s.id)) : present
  // 형광펜을 먼저(아래), 펜을 나중에(위) 그린다
  const activeIsHighlighter = activeStroke && isHighlighter(activeStroke)
  for (const s of visible) if (isHighlighter(s)) drawStroke(ctx, s, scale)
  if (activeIsHighlighter) drawStroke(ctx, activeStroke, scale)
  for (const s of visible) if (!isHighlighter(s)) drawStroke(ctx, s, scale)
  drawGlyphs(ctx, correctionGlyphs(present, corrections), scale)
  if (activeStroke && !activeIsHighlighter) drawStroke(ctx, activeStroke, scale)
  if (focusBox) drawFocus(ctx, focusBox, scale)
  if (showLines) drawLineBoxes(ctx, strokes, lines, lineLabels, scale)
  if (selectionBox) drawSelection(ctx, selectionBox, scale)
  if (lassoPath) drawLasso(ctx, lassoPath, scale)
}
