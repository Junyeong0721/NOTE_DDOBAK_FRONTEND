// 페이지를 캔버스에 그린다. 좌표는 페이지 단위이고 scale(= 화면 너비 / 1000)을 곱해 그린다.
import { PAGE_HEIGHT, PAGE_WIDTH } from './content'
import { correctedStrokeIds, correctionGlyphs } from './correction'
import { fontFamily } from './fonts'
import { strokeBBox, strokePoints } from './geometry'
import { selectionHandles } from './lasso'
import { HIGHLIGHTER_ALPHA, isHighlighter } from './tools'

export const GUIDE_SPACING = 50
const GUIDE_COLOR = '#e3e7ee'
const TEXT_LINE_COLOR = '#1e5bd8'
const DRAWING_COLOR = '#d32f2f'

/** 필압 0.5에서 기본 굵기, 세게 누를수록 굵게 */
export const strokeLineWidth = (width, pressure, scale) => width * (0.4 + 1.2 * pressure) * scale

const THIN_PATH_PX = 2.5 // 가장 세게 눌러도 이보다 가늘면 한 경로로 그린다

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

  // 아주 가는 선은 구간마다 따로 그리면 이음새가 겹쳐 점선처럼 보이므로 한 경로로 그린다 (필압은 평균)
  if (strokeLineWidth(stroke.width, 1, scale) < THIN_PATH_PX) {
    const avg = pts.reduce((t, p) => t + p[2], 0) / pts.length
    ctx.lineWidth = strokeLineWidth(stroke.width, avg, scale)
    ctx.beginPath()
    ctx.moveTo(pts[0][0] * scale, pts[0][1] * scale)
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]
      const [x1, y1] = pts[i]
      ctx.quadraticCurveTo(x0 * scale, y0 * scale, ((x0 + x1) / 2) * scale, ((y0 + y1) / 2) * scale)
    }
    const last = pts[pts.length - 1]
    ctx.lineTo(last[0] * scale, last[1] * scale)
    ctx.stroke()
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
export const SELECTION_PAD = 8

export const HANDLE_SIZE = 10 // 크기 손잡이 한 변 (페이지 좌표)

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
  // 네 모서리 크기 손잡이
  ctx.setLineDash([])
  ctx.fillStyle = '#ffffff'
  for (const h of selectionHandles(box, SELECTION_PAD)) {
    const hs = HANDLE_SIZE * scale
    ctx.fillRect(h.x * scale - hs / 2, h.y * scale - hs / 2, hs, hs)
    ctx.strokeRect(h.x * scale - hs / 2, h.y * scale - hs / 2, hs, hs)
  }
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

// 글꼴마다 한글이 글꼴 칸(em) 안에서 차지하는 높이가 달라서(하이멜로디 '가'는 0.45em, 고운돋움은 0.85em),
// 기준 글자 '가'의 실제 높이로 크기를 맞춘다. 글꼴을 다 받은 뒤 잰 값만 기억한다.
const FALLBACK_RATIO = 0.8
const ratioCache = new Map()

export function hangulRatio(ctx, family) {
  if (ratioCache.has(family)) return ratioCache.get(family)
  ctx.font = `100px ${family}`
  const m = ctx.measureText('가')
  const ratio = (m?.actualBoundingBoxAscent + m?.actualBoundingBoxDescent) / 100
  if (!(ratio > 0.2)) return FALLBACK_RATIO
  if (typeof document !== 'undefined' && document.fonts?.check(`100px ${family}`)) ratioCache.set(family, ratio)
  return ratio
}

/**
 * 보정 글자: 원래 획 대신 목표 글씨체로 그린다. size = '가' 같은 보통 글자의 실제 높이.
 * 한 줄(group)은 모두 같은 크기: 가장 넓은 글자가 간격에 들어가도록 줄 전체를 같이 줄인다.
 * 페이지 공통 크기 줄(shared)끼리는 그중 가장 작은 크기로 맞춰 페이지 전체가 고르게 보이게 한다.
 */
function drawGlyphs(ctx, glyphs, scale) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const linePx = new Map()
  for (const g of glyphs) {
    const family = fontFamily(g.fontId)
    let px = (g.size * scale) / hangulRatio(ctx, family)
    if (g.maxWidth) {
      ctx.font = `${px}px ${family}, sans-serif`
      const w = ctx.measureText(g.ch)?.width
      if (w > g.maxWidth * scale) px *= (g.maxWidth * scale) / w
    }
    linePx.set(g.group, Math.min(linePx.get(g.group) ?? Infinity, px))
  }
  const sharedGroups = new Set(glyphs.filter((g) => g.shared).map((g) => g.group))
  const sharedPx = Math.min(...[...sharedGroups].map((id) => linePx.get(id)))
  for (const id of sharedGroups) linePx.set(id, sharedPx)
  for (const g of glyphs) {
    const family = fontFamily(g.fontId)
    const px = linePx.get(g.group)
    if (g.cuts?.length && typeof document !== 'undefined') {
      drawCutGlyph(ctx, g, px, family, scale)
      continue
    }
    ctx.font = `${px}px ${family}, sans-serif`
    const m = ctx.measureText(g.ch)
    ctx.fillStyle = g.color
    // 글자마다 실제 높이의 가운데를 g.y에 맞춘다 (기준선 = 가운데 + (위 - 아래) / 2)
    const asc = m?.actualBoundingBoxAscent
    const desc = m?.actualBoundingBoxDescent
    const shift = Number.isFinite(asc) && Number.isFinite(desc) ? (asc - desc) / 2 : px * 0.35
    ctx.fillText(g.ch, g.x * scale, g.y * scale + shift)
  }
  ctx.restore()
}

/**
 * 지우개로 일부를 지운 보정 글자: 작은 캔버스에 글자를 그리고 지운 자리를 뚫은 뒤 옮겨 그린다.
 * (페이지에 바로 뚫으면 글자 밑의 형광펜까지 지워지므로)
 */
function drawCutGlyph(ctx, g, px, family, scale) {
  const dpr = ctx.getTransform?.().a || 1
  const side = Math.ceil(px * 1.8)
  const off = document.createElement('canvas')
  off.width = Math.ceil(side * dpr)
  off.height = Math.ceil(side * dpr)
  const o = off.getContext('2d')
  o.scale(dpr, dpr)
  o.font = `${px}px ${family}, sans-serif`
  o.textAlign = 'center'
  o.textBaseline = 'alphabetic'
  const m = o.measureText(g.ch)
  const shift = Number.isFinite(m.actualBoundingBoxAscent) ? (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 : px * 0.35
  o.fillStyle = g.color
  o.fillText(g.ch, side / 2, side / 2 + shift)
  o.globalCompositeOperation = 'destination-out'
  const unit = g.size * scale // 지운 자리 좌표는 글자 크기 기준
  for (const c of g.cuts) {
    o.beginPath()
    o.arc(side / 2 + c.dx * unit, side / 2 + c.dy * unit, c.r * unit, 0, Math.PI * 2)
    o.fill()
  }
  ctx.drawImage(off, g.x * scale - side / 2, g.y * scale - side / 2, side, side)
}

/** 지우개 크기를 보여 주는 동그라미 */
function drawEraserCursor(ctx, { x, y, r }, scale) {
  ctx.save()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(31, 42, 68, 0.55)'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.beginPath()
  ctx.arc(x * scale, y * scale, r * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
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
 * fontId: 설정에서 고른 글씨체 — 모든 보정 줄을 이 글씨체로 그린다
 */
export function drawPage(ctx, {
  strokes, scale, showGuides = false, lines = [], showLines = false, lineLabels = {},
  activeStroke = null, hiddenIds = null, selectionBox = null, lassoPath = null,
  corrections = null, focusBox = null, fontId = null, eraserCursor = null,
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
  drawGlyphs(ctx, correctionGlyphs(present, corrections, fontId ? { fontId } : {}), scale)
  if (activeStroke && !activeIsHighlighter) drawStroke(ctx, activeStroke, scale)
  if (focusBox) drawFocus(ctx, focusBox, scale)
  if (showLines) drawLineBoxes(ctx, strokes, lines, lineLabels, scale)
  if (selectionBox) drawSelection(ctx, selectionBox, scale)
  if (lassoPath) drawLasso(ctx, lassoPath, scale)
  if (eraserCursor) drawEraserCursor(ctx, eraserCursor, scale)
}
