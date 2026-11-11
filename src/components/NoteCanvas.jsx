import { useCallback, useEffect, useRef } from 'react'
import { PAGE_HEIGHT, PAGE_WIDTH, addPoint, createStroke } from '../note/content'
import { charGroupOf } from '../note/correction'
import { ensureFont } from '../note/fonts'
import { clientToPage, hitStroke } from '../note/geometry'
import { moveStrokes, selectStrokes, selectionBBox } from '../note/lasso'
import { drawPage } from '../note/render'
import { effectiveDpr, pinchDistance } from '../note/zoom'

const ERASER_RADIUS = 10 // 페이지 좌표
const PALM_GUARD_MS = 1500 // 펜을 쓴 직후 손바닥 터치로 화면이 밀리지 않게
const SELECTION_GRAB_PAD = 14 // 선택 상자 주변 이만큼은 "잡아서 옮기기"로 본다
const LASSO_STEP = 3 // 올가미 점 간격(페이지 좌표)

const inside = (pt, box, pad) => pt.x >= box.minX - pad && pt.x <= box.maxX + pad && pt.y >= box.minY - pad && pt.y <= box.maxY + pad
const center = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/**
 * 한 페이지 필기 캔버스.
 * - 펜(Apple Pencil)과 마우스만 쓰고 그린다. 손가락은 한 개면 화면 이동, 두 개면 확대·축소.
 * - 도구: pen, highlighter, eraser, lasso. 쓰는 중인 획은 ref에만 두고 펜을 뗄 때 onStrokesChange로 넘긴다.
 */
export default function NoteCanvas({
  strokes, onStrokesChange, tool, color, width,
  showGuides, lines, showLines, lineLabels, corrections, focusBox, fontId,
  selectionIds, onSelectionChange, onPenDown, onPinch, scrollContainer,
}) {
  const canvasRef = useRef(null)
  const scaleRef = useRef(1)
  const dprRef = useRef(1)
  const activeRef = useRef(null) // { pointerId, mode: 'draw'|'erase'|'lasso'|'move', ... }
  const erasedRef = useRef(null)
  const touchesRef = useRef(new Map()) // 손가락 pointerId → { x, y }
  const pinchRef = useRef(null) // { startDist }
  const lastPenRef = useRef(0)
  const frameRef = useRef(0)
  const viewRef = useRef(null)
  viewRef.current = { strokes, showGuides, lines, showLines, lineLabels, selectionIds, corrections, focusBox, fontId }

  const redraw = useCallback(() => {
    frameRef.current = 0
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0)
    const v = viewRef.current
    const active = activeRef.current
    const view = active?.mode === 'move' ? moveStrokes(v.strokes, v.selectionIds, active.dx, active.dy) : v.strokes
    drawPage(ctx, {
      strokes: view, scale: scaleRef.current, showGuides: v.showGuides,
      lines: v.lines, showLines: v.showLines, lineLabels: v.lineLabels,
      activeStroke: active?.mode === 'draw' ? active.stroke : null,
      hiddenIds: erasedRef.current,
      selectionBox: v.selectionIds?.length ? selectionBBox(view, v.selectionIds) : null,
      lassoPath: active?.mode === 'lasso' ? active.path : null,
      corrections: v.corrections, focusBox: v.focusBox, fontId: v.fontId,
    })
  }, [])

  const scheduleRedraw = useCallback(() => {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(redraw)
  }, [redraw])

  // 부모(페이지 상자) 너비에 맞춰 캔버스 크기 조정 — 확대·회전 포함
  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas.parentElement
    const resize = () => {
      const cssWidth = parent.clientWidth
      const cssHeight = (cssWidth * PAGE_HEIGHT) / PAGE_WIDTH
      const dpr = effectiveDpr(cssWidth, cssHeight, window.devicePixelRatio || 1)
      canvas.style.width = `${cssWidth}px`
      canvas.style.height = `${cssHeight}px`
      canvas.width = Math.round(cssWidth * dpr)
      canvas.height = Math.round(cssHeight * dpr)
      dprRef.current = dpr
      scaleRef.current = cssWidth / PAGE_WIDTH
      redraw()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
    }
  }, [redraw])

  useEffect(() => {
    scheduleRedraw()
  }, [strokes, showGuides, lines, showLines, lineLabels, selectionIds, corrections, focusBox, fontId, scheduleRedraw])

  // 보정 글자의 글꼴을 받은 뒤 다시 그린다 (받기 전에는 기본 글꼴로 잠깐 보일 수 있음)
  const fontKey = corrections?.length ? (fontId ?? [...new Set(corrections.map((c) => c.fontId))].sort().join(',')) : ''
  useEffect(() => {
    if (!fontKey) return undefined
    let alive = true
    Promise.all(fontKey.split(',').map(ensureFont)).then(() => alive && scheduleRedraw())
    return () => {
      alive = false
    }
  }, [fontKey, scheduleRedraw])

  const toPage = (e) => clientToPage(e.clientX, e.clientY, canvasRef.current.getBoundingClientRect())

  // 보정된 글자를 건드리면 그 글자를 이루는 원래 획을 모두 지운다 (글자 단위로 지워짐)
  function eraseAt(pt) {
    const v = viewRef.current
    for (const s of v.strokes) {
      if (erasedRef.current.has(s.id) || !hitStroke(s, pt, ERASER_RADIUS)) continue
      erasedRef.current.add(s.id)
      for (const id of charGroupOf(v.corrections, s.id) ?? []) erasedRef.current.add(id)
    }
  }

  // ---------- 손가락: 이동과 핀치 ----------
  function touchDown(e) {
    if (activeRef.current || Date.now() - lastPenRef.current < PALM_GUARD_MS) return
    touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    canvasRef.current.setPointerCapture(e.pointerId)
    if (touchesRef.current.size === 2) {
      const [a, b] = [...touchesRef.current.values()]
      pinchRef.current = { startDist: pinchDistance(a, b) }
      const c = center(a, b)
      onPinch?.({ phase: 'start', ratio: 1, clientX: c.x, clientY: c.y })
    }
  }

  function touchMove(e) {
    const touches = touchesRef.current
    const prev = touches.get(e.pointerId)
    if (!prev) return
    const next = { x: e.clientX, y: e.clientY }
    touches.set(e.pointerId, next)
    if (touches.size >= 2 && pinchRef.current) {
      const [a, b] = [...touches.values()]
      const c = center(a, b)
      onPinch?.({ phase: 'move', ratio: pinchDistance(a, b) / pinchRef.current.startDist, clientX: c.x, clientY: c.y })
    } else if (touches.size === 1 && scrollContainer?.current) {
      scrollContainer.current.scrollLeft -= next.x - prev.x
      scrollContainer.current.scrollTop -= next.y - prev.y
    }
  }

  function touchUp(e) {
    if (!touchesRef.current.delete(e.pointerId)) return
    if (pinchRef.current && touchesRef.current.size < 2) {
      pinchRef.current = null
      onPinch?.({ phase: 'end' })
    }
  }

  // ---------- 펜·마우스 ----------
  function handlePointerDown(e) {
    if (e.pointerType === 'touch') return touchDown(e)
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (activeRef.current) return
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)
    touchesRef.current.clear()
    lastPenRef.current = Date.now()
    onPenDown?.()

    const pt = toPage(e)
    const v = viewRef.current
    if (tool === 'eraser') {
      erasedRef.current = new Set()
      activeRef.current = { pointerId: e.pointerId, mode: 'erase' }
      eraseAt(pt)
    } else if (tool === 'lasso') {
      const box = v.selectionIds?.length ? selectionBBox(v.strokes, v.selectionIds) : null
      if (box && inside(pt, box, SELECTION_GRAB_PAD)) {
        activeRef.current = { pointerId: e.pointerId, mode: 'move', start: pt, dx: 0, dy: 0 }
      } else {
        if (v.selectionIds?.length) onSelectionChange?.([])
        activeRef.current = { pointerId: e.pointerId, mode: 'lasso', path: [[pt.x, pt.y]] }
      }
    } else {
      const t0 = Date.now()
      const stroke = addPoint(createStroke({ t0, color, width, tool }), { ...pt, pressure: e.pressure, t: t0 })
      activeRef.current = { pointerId: e.pointerId, mode: 'draw', stroke, t0, downTimeStamp: e.timeStamp }
    }
    scheduleRedraw()
  }

  function handlePointerMove(e) {
    if (e.pointerType === 'touch') return touchMove(e)
    const active = activeRef.current
    if (!active || e.pointerId !== active.pointerId) return
    e.preventDefault()
    lastPenRef.current = Date.now()
    const coalesced = e.nativeEvent.getCoalescedEvents?.() ?? []
    const events = coalesced.length > 0 ? coalesced : [e]
    for (const ev of events) {
      const pt = toPage(ev)
      if (active.mode === 'erase') {
        eraseAt(pt)
      } else if (active.mode === 'lasso') {
        const [lx, ly] = active.path[active.path.length - 1]
        if (Math.hypot(pt.x - lx, pt.y - ly) >= LASSO_STEP) active.path.push([pt.x, pt.y])
      } else if (active.mode === 'move') {
        active.dx = pt.x - active.start.x
        active.dy = pt.y - active.start.y
      } else {
        active.stroke = addPoint(active.stroke, { ...pt, pressure: ev.pressure, t: active.t0 + (ev.timeStamp - active.downTimeStamp) })
      }
    }
    scheduleRedraw()
  }

  function handlePointerUp(e) {
    if (e.pointerType === 'touch') return touchUp(e)
    const active = activeRef.current
    if (!active || e.pointerId !== active.pointerId) return
    activeRef.current = null
    lastPenRef.current = Date.now()
    const v = viewRef.current

    if (active.mode === 'erase') {
      const erased = erasedRef.current
      erasedRef.current = null
      if (erased.size > 0) onStrokesChange(v.strokes.filter((s) => !erased.has(s.id)), { erased: [...erased] })
      else scheduleRedraw()
    } else if (active.mode === 'lasso') {
      onSelectionChange?.(selectStrokes(v.strokes, active.path))
      scheduleRedraw()
    } else if (active.mode === 'move') {
      if (Math.abs(active.dx) + Math.abs(active.dy) > 0.5) {
        onStrokesChange(moveStrokes(v.strokes, v.selectionIds, active.dx, active.dy), { moved: v.selectionIds })
      } else {
        scheduleRedraw()
      }
    } else {
      onStrokesChange([...v.strokes, active.stroke], { added: active.stroke })
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="note-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  )
}
