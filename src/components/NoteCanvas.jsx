import { useCallback, useEffect, useRef } from 'react'
import { PAGE_HEIGHT, PAGE_WIDTH, addPoint, createStroke } from '../note/content'
import { clientToPage, hitStroke } from '../note/geometry'
import { drawPage } from '../note/render'

const ERASER_RADIUS = 10 // 페이지 좌표
const PALM_GUARD_MS = 1500 // 펜을 쓴 직후 손바닥 터치로 화면이 밀리지 않게

/**
 * 한 페이지 필기 캔버스.
 * - 펜(Apple Pencil)과 마우스만 그린다. 손가락·손바닥(touch)은 그리지 않고 세로 스크롤에만 쓴다.
 * - 쓰는 중인 획은 ref에만 두고, 펜을 뗄 때 onStrokesChange로 한 번에 넘긴다.
 */
export default function NoteCanvas({
  strokes, onStrokesChange, tool, color, penWidth,
  showGuides, lines, showLines, lineLabels, onPenDown, scrollContainer,
}) {
  const canvasRef = useRef(null)
  const scaleRef = useRef(1)
  const activeRef = useRef(null) // 펜: { pointerId, stroke, t0, downTimeStamp } / 지우개: { pointerId, eraser: true }
  const erasedRef = useRef(null) // 지우개로 문지르는 중인 획 id
  const touchRef = useRef(null) // 손가락 스크롤 { pointerId, lastY }
  const lastPenRef = useRef(0)
  const frameRef = useRef(0)
  const viewRef = useRef(null)
  viewRef.current = { strokes, showGuides, lines, showLines, lineLabels }

  const redraw = useCallback(() => {
    frameRef.current = 0
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const v = viewRef.current
    drawPage(ctx, {
      strokes: v.strokes, scale: scaleRef.current, showGuides: v.showGuides,
      lines: v.lines, showLines: v.showLines, lineLabels: v.lineLabels,
      activeStroke: activeRef.current?.stroke ?? null, hiddenIds: erasedRef.current,
    })
  }, [])

  const scheduleRedraw = useCallback(() => {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(redraw)
  }, [redraw])

  // 화면 너비에 맞춰 캔버스 크기 조정 (iPad 회전 포함)
  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas.parentElement
    const resize = () => {
      const cssWidth = parent.clientWidth
      const cssHeight = (cssWidth * PAGE_HEIGHT) / PAGE_WIDTH
      const dpr = window.devicePixelRatio || 1
      canvas.style.width = `${cssWidth}px`
      canvas.style.height = `${cssHeight}px`
      canvas.width = Math.round(cssWidth * dpr)
      canvas.height = Math.round(cssHeight * dpr)
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
  }, [strokes, showGuides, lines, showLines, lineLabels, scheduleRedraw])

  const toPage = (e) => clientToPage(e.clientX, e.clientY, canvasRef.current.getBoundingClientRect())

  function eraseAt(pt) {
    for (const s of viewRef.current.strokes) {
      if (!erasedRef.current.has(s.id) && hitStroke(s, pt, ERASER_RADIUS)) erasedRef.current.add(s.id)
    }
    scheduleRedraw()
  }

  function handlePointerDown(e) {
    const canvas = canvasRef.current
    if (e.pointerType === 'touch') {
      if (activeRef.current || Date.now() - lastPenRef.current < PALM_GUARD_MS) return
      touchRef.current = { pointerId: e.pointerId, lastY: e.clientY }
      canvas.setPointerCapture(e.pointerId)
      return
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (activeRef.current) return
    e.preventDefault()
    canvas.setPointerCapture(e.pointerId)
    touchRef.current = null
    lastPenRef.current = Date.now()
    onPenDown?.()

    const pt = toPage(e)
    if (tool === 'eraser') {
      erasedRef.current = new Set()
      activeRef.current = { pointerId: e.pointerId, eraser: true }
      eraseAt(pt)
      return
    }
    const t0 = Date.now()
    const stroke = addPoint(createStroke({ t0, color, width: penWidth }), { ...pt, pressure: e.pressure, t: t0 })
    activeRef.current = { pointerId: e.pointerId, stroke, t0, downTimeStamp: e.timeStamp }
    scheduleRedraw()
  }

  function handlePointerMove(e) {
    const touch = touchRef.current
    if (touch && e.pointerId === touch.pointerId) {
      if (scrollContainer?.current) scrollContainer.current.scrollTop -= e.clientY - touch.lastY
      touch.lastY = e.clientY
      return
    }
    const active = activeRef.current
    if (!active || e.pointerId !== active.pointerId) return
    e.preventDefault()
    lastPenRef.current = Date.now()
    const coalesced = e.nativeEvent.getCoalescedEvents?.() ?? []
    const events = coalesced.length > 0 ? coalesced : [e]
    for (const ev of events) {
      const pt = toPage(ev)
      if (active.eraser) {
        eraseAt(pt)
      } else {
        active.stroke = addPoint(active.stroke, { ...pt, pressure: ev.pressure, t: active.t0 + (ev.timeStamp - active.downTimeStamp) })
      }
    }
    scheduleRedraw()
  }

  function handlePointerUp(e) {
    if (touchRef.current && e.pointerId === touchRef.current.pointerId) {
      touchRef.current = null
      return
    }
    const active = activeRef.current
    if (!active || e.pointerId !== active.pointerId) return
    activeRef.current = null
    lastPenRef.current = Date.now()
    const current = viewRef.current.strokes
    if (active.eraser) {
      const erased = erasedRef.current
      erasedRef.current = null
      if (erased.size > 0) onStrokesChange(current.filter((s) => !erased.has(s.id)), { erased: [...erased] })
      else scheduleRedraw()
      return
    }
    onStrokesChange([...current, active.stroke], { added: active.stroke })
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
