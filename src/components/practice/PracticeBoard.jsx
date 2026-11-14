import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { fontById } from '../../note/fonts'
import { canGrade, hasInk, pickInput, writtenFlags } from '../../practice/board'
import { CELL, COLS, boardSize, cellAt, layoutCells } from '../../practice/cells'
import { stageById } from '../../practice/questions'
import { INK_COLOR, drawCellStrokes, drawTarget, strokesGrid, targetGrid } from '../../practice/raster'
import { scoreGlyph, scoreRound, scoreSet } from '../../practice/score'
import FontPicker from './FontPicker'
import { useFontReady } from './useFontReady'

const MIN_CELL_PX = 64 // 이보다 작으면 쓰기 어려워서 한 줄 칸 수를 줄인다
const MAX_CELL_PX = 120
const GUIDE_ALPHA = 0.18
let strokeSeq = 0

/** 쓰기 화면: 문제 5개를 한 문제씩 원고지 칸에 따라 쓰고, 마지막에 한꺼번에 채점한다 */
export default function PracticeBoard({ stage, texts, fontId, onFont, onGraded, onBack }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [index, setIndex] = useState(0) // 지금 쓰는 문제
  const [guide, setGuide] = useState(true)
  const [strokes, setStrokes] = useState([]) // 문제 → 칸 번호 → 획들(칸 좌표 0~100)
  const [orders, setOrders] = useState([]) // 문제 → 쓴 순서(칸 번호) — 한 획 되돌리기용
  const [erasing, setErasing] = useState(false)
  const [busy, setBusy] = useState(false)
  const live = useRef(null) // 쓰는 중인 획 { index, stroke, pointerId }
  const sawPen = useRef(false)
  const fontStatus = useFontReady(fontId)
  const fontReady = fontStatus === 'ready'

  useLayoutEffect(() => {
    const el = wrapRef.current
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const text = texts[index]
  const cellStrokes = strokes[index] ?? []
  const order = orders[index] ?? []
  const length = [...text].length
  const cols = Math.max(1, Math.min(COLS, length, Math.floor((width || 320) / MIN_CELL_PX)))
  const cells = useMemo(() => layoutCells(text, cols), [text, cols])
  const cellPx = Math.max(24, Math.min(MAX_CELL_PX, Math.floor((width || 320) / Math.max(cols, 3))))
  const size = boardSize(cells)
  const cssW = (size.width / CELL) * cellPx
  const cssH = (size.height / CELL) * cellPx
  const last = index === texts.length - 1
  const written = writtenFlags(strokes, texts.length)
  const unwritten = written.filter((w) => !w).length

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
    }
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)
    for (const c of cells) {
      const x = c.col * cellPx
      const y = c.row * cellPx
      ctx.fillStyle = c.blank ? '#eef1f6' : '#fff'
      ctx.fillRect(x, y, cellPx, cellPx)
      if (!c.blank) {
        // 열십자 보조선
        ctx.strokeStyle = '#e3e7ee'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(x + cellPx / 2, y + 4)
        ctx.lineTo(x + cellPx / 2, y + cellPx - 4)
        ctx.moveTo(x + 4, y + cellPx / 2)
        ctx.lineTo(x + cellPx - 4, y + cellPx / 2)
        ctx.stroke()
        ctx.setLineDash([])
        if (guide && fontReady) drawTarget(ctx, c.ch, fontId, x, y, cellPx, { alpha: GUIDE_ALPHA, color: INK_COLOR })
      }
      ctx.strokeStyle = '#c4ccdb'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, cellPx - 1, cellPx - 1)
    }
    for (const c of cells) {
      const own = cellStrokes[c.index] ?? []
      const current = live.current?.index === c.index ? [live.current.stroke] : []
      if (own.length + current.length > 0) drawCellStrokes(ctx, [...own, ...current], c.col * cellPx, c.row * cellPx, cellPx)
    }
  }, [cells, cellPx, cssW, cssH, cellStrokes, guide, fontReady, fontId])

  useEffect(() => {
    draw()
  }, [draw])

  /** 지금 문제의 칸 획/쓴 순서만 바꾼다 */
  const updateCells = (fn) =>
    setStrokes((prev) => {
      const next = [...prev]
      next[index] = fn([...(prev[index] ?? [])])
      return next
    })
  const updateOrder = (fn) =>
    setOrders((prev) => {
      const next = [...prev]
      next[index] = fn(prev[index] ?? [])
      return next
    })

  /** 화면 좌표 → 원고지 좌표(칸 한 변 100) */
  const toBoard = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return [((e.clientX - rect.left) / cellPx) * CELL, ((e.clientY - rect.top) / cellPx) * CELL]
  }

  const onPointerDown = (e) => {
    if (busy || live.current) return
    const picked = pickInput(sawPen.current, e.pointerType)
    sawPen.current = picked.sawPen
    if (!picked.accept) return
    const [bx, by] = toBoard(e)
    const cellIndex = cellAt(cells, bx, by)
    if (cellIndex < 0) return
    e.preventDefault()
    if (erasing) {
      updateCells((list) => {
        list[cellIndex] = []
        return list
      })
      updateOrder((list) => list.filter((i) => i !== cellIndex))
      setErasing(false)
      return
    }
    const cell = cells[cellIndex]
    canvasRef.current.setPointerCapture?.(e.pointerId)
    // 획은 시작한 칸에 속한다 (칸 밖으로 삐져나가도 그 칸의 글자)
    live.current = {
      index: cellIndex,
      pointerId: e.pointerId,
      t0: e.timeStamp,
      stroke: { id: `p_${Date.now()}_${++strokeSeq}`, points: [[bx - cell.x, by - cell.y, e.pressure || 0.5, 0]] },
    }
    draw()
  }

  const onPointerMove = (e) => {
    const cur = live.current
    if (!cur || cur.pointerId !== e.pointerId) return
    const cell = cells[cur.index]
    const events = e.nativeEvent.getCoalescedEvents?.() ?? []
    for (const ev of events.length > 0 ? events : [e.nativeEvent]) {
      const [bx, by] = toBoard(ev)
      cur.stroke.points.push([bx - cell.x, by - cell.y, ev.pressure || 0.5, Math.round(ev.timeStamp - cur.t0)])
    }
    draw()
  }

  const endStroke = (e) => {
    const cur = live.current
    if (!cur || cur.pointerId !== e.pointerId) return
    live.current = null
    updateCells((list) => {
      list[cur.index] = [...(list[cur.index] ?? []), cur.stroke]
      return list
    })
    updateOrder((list) => [...list, cur.index])
  }

  const undo = () => {
    const cellIndex = order[order.length - 1]
    if (cellIndex === undefined) return
    updateCells((list) => {
      list[cellIndex] = (list[cellIndex] ?? []).slice(0, -1)
      return list
    })
    updateOrder((list) => list.slice(0, -1))
  }

  const clearQuestion = () => {
    updateCells(() => [])
    updateOrder(() => [])
    setErasing(false)
  }

  const go = (to) => {
    if (live.current) return
    setErasing(false)
    setIndex(Math.max(0, Math.min(texts.length - 1, to)))
  }

  const grade = async () => {
    if (!canGrade(strokes, fontReady, busy)) return
    setBusy(true)
    const questions = []
    for (let q = 0; q < texts.length; q++) {
      const qCells = layoutCells(texts[q])
      const qStrokes = qCells.map((c) => strokes[q]?.[c.index] ?? [])
      const glyphScores = []
      for (const c of qCells) {
        glyphScores[c.index] = c.blank ? null : scoreGlyph(await targetGrid(c.ch, fontId), strokesGrid(qStrokes[c.index]))
      }
      questions.push({ text: texts[q], cells: qCells, cellStrokes: qStrokes, glyphScores, score: scoreSet(glyphScores) })
    }
    onGraded({ stage, fontId, guide, questions, round: scoreRound(questions.map((q) => q.score)) })
  }

  const hint =
    fontStatus === 'failed'
      ? '글씨체를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 들어와 주세요.'
      : fontStatus === 'loading'
        ? '글씨체를 불러오는 중…'
        : erasing
          ? '지울 칸을 눌러 주세요.'
          : guide
            ? `연한 ${fontById(fontId).label} 글자 위에 따라 써 보세요.`
            : '가이드 없이 써 보세요. 채점할 때 목표 글자와 비교해요.'

  return (
    <main className="practice-main">
      <div className="practice-board-head">
        <button type="button" className="btn-quiet" onClick={onBack}>← 고르기로</button>
        <label className="practice-guide">
          <input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} />
          <span>가이드 보기</span>
        </label>
      </div>
      <FontPicker fontId={fontId} onChange={onFont} />

      <nav className="practice-progress" aria-label="문제">
        <span className="practice-progress-label">
          {stageById(stage)?.label} <strong>{index + 1}</strong> / {texts.length}
        </span>
        <ol className="practice-dots">
          {texts.map((t, i) => (
            <li key={i}>
              <button
                type="button"
                className={`practice-dot${i === index ? ' current' : ''}${written[i] ? ' done' : ''}`}
                aria-current={i === index ? 'step' : undefined}
                aria-label={`${i + 1}번 문제${written[i] ? ' (씀)' : ''}`}
                onClick={() => go(i)}
                disabled={busy}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <p className="practice-hint" role="status">{hint}</p>

      <div className="practice-board" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className={`practice-canvas${erasing ? ' erasing' : ''}`}
          style={{ width: cssW, height: cssH }}
          aria-label={`${index + 1}번 문제: ${text}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />
      </div>

      <div className="practice-actions">
        <button type="button" onClick={undo} disabled={order.length === 0 || busy}>한 획 되돌리기</button>
        <button type="button" className={erasing ? 'selected' : ''} aria-pressed={erasing} onClick={() => setErasing((v) => !v)} disabled={!hasInk(cellStrokes) || busy}>칸 지우기</button>
        <button type="button" onClick={clearQuestion} disabled={!hasInk(cellStrokes) || busy}>이 문제 다시</button>
        <span className="practice-nav">
          <button type="button" className="btn-large" onClick={() => go(index - 1)} disabled={index === 0 || busy}>이전 문제</button>
          {last ? (
            <button type="button" className="btn-primary btn-large" onClick={grade} disabled={!canGrade(strokes, fontReady, busy)}>
              {busy ? '채점 중…' : '채점하기'}
            </button>
          ) : (
            <button type="button" className="btn-primary btn-large" onClick={() => go(index + 1)} disabled={busy}>다음 문제</button>
          )}
        </span>
      </div>
      {last && unwritten > 0 && canGrade(strokes, fontReady, busy) && (
        <p className="practice-note">아직 안 쓴 문제가 {unwritten}개 있어요. 그대로 채점하면 그 문제는 0점이에요.</p>
      )}
    </main>
  )
}
