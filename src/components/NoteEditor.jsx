import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FOLDER_COLORS } from '../api/folders'
import { getNote, updateNote } from '../api/notes'
import { recognizeLine, ocrLabel, ocrErrorLabel } from '../api/ocr'
import { parseContent, serializeContent } from '../note/content'
import { canRedo, canUndo, createHistory, push, redo, undo } from '../note/history'
import { deleteStrokes, selectionBBox, setStrokesKind } from '../note/lasso'
import { renderLineToPng } from '../note/lineImage'
import { LINE_IDLE_MS, groupLines, isLineEnd } from '../note/lines'
import { renderThumbnail } from '../note/thumbnail'
import { tidyPage, untidyPage } from '../note/tidy'
import { HIGHLIGHTER_COLORS, HIGHLIGHTER_SIZES, PEN_COLORS, PEN_SIZES, isHighlighter } from '../note/tools'
import { clampZoom, zoomAround } from '../note/zoom'
import { BackIcon, RedoIcon, UndoIcon, ZoomInIcon, ZoomOutIcon } from './Icons'
import NoteCanvas from './NoteCanvas'
import SelectionBar from './SelectionBar'
import ToolPalette from './ToolPalette'
import './NoteEditor.css'

const SAVE_DELAY_MS = 1000
const SAVE_LABELS = { saving: '저장 중…', saved: '저장됨', error: '저장하지 못했어요', invalid: '제목을 입력해 주세요' }
const GUIDES_KEY = 'ddobak.showGuides'
const MAX_PAGE_WIDTH = 900
const ZOOM_STEP = 0.25

function loadFlag(key) {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

function saveFlag(key, value) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // 저장소를 쓸 수 없는 환경이면 이번 화면에서만 적용
  }
}

export default function NoteEditor({ noteId, folder, onBack }) {
  const [loadError, setLoadError] = useState('')
  const [title, setTitle] = useState('')
  const [meta, setMeta] = useState(null) // { version, page }
  const [history, setHistory] = useState(null) // present = 페이지 배열 [{ strokes }]
  const [tool, setTool] = useState('pen')
  const [penColor, setPenColor] = useState(PEN_COLORS[0])
  const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_COLORS[0])
  const [penSize, setPenSize] = useState('normal')
  const [highlighterSize, setHighlighterSize] = useState('normal')
  const [showGuides, setShowGuides] = useState(() => loadFlag(GUIDES_KEY))
  const [showLines, setShowLines] = useState(false)
  const [saveState, setSaveState] = useState('saved')
  const [ocrLabels, setOcrLabels] = useState({}) // 줄 id → 인식 결과 표시
  const [selection, setSelection] = useState(null) // { pageIndex, ids }
  const [zoom, setZoom] = useState(1)
  const [baseWidth, setBaseWidth] = useState(MAX_PAGE_WIDTH)

  const dirtyRef = useRef(false)
  const scrollRef = useRef(null)
  const latestPagesRef = useRef(null)
  const lineWatchRef = useRef(null) // 마지막으로 쓴 획 { pageIndex, strokeId, at }
  const idleTimerRef = useRef(0)
  const ocrRequestedRef = useRef(new Set())
  const zoomRef = useRef(1)
  const pinchStartRef = useRef(1)
  const pendingScrollRef = useRef(null)

  const pages = history?.present ?? null
  const ready = history !== null
  latestPagesRef.current = pages
  zoomRef.current = zoom

  // 불러오기
  useEffect(() => {
    let cancelled = false
    getNote(noteId)
      .then((note) => {
        if (cancelled) return
        const content = parseContent(note.content)
        setTitle(note.title)
        setMeta({ version: content.version, page: content.page })
        setHistory(createHistory(content.pages))
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [noteId])

  // 자동 저장: 마지막 변경 1초 뒤, 첫 페이지 썸네일도 함께
  useEffect(() => {
    if (!history || !meta || !dirtyRef.current) return undefined
    if (!title.trim()) {
      setSaveState('invalid')
      return undefined
    }
    setSaveState('saving')
    const timer = setTimeout(() => {
      const content = serializeContent({ version: meta.version, page: meta.page, pages: history.present })
      let thumbnail
      try {
        thumbnail = renderThumbnail(history.present[0])
      } catch {
        thumbnail = undefined // 썸네일을 못 만들어도 저장은 한다
      }
      updateNote(noteId, { title: title.trim(), content, thumbnail })
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'))
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [history, title, meta, noteId])

  useEffect(() => () => clearTimeout(idleTimerRef.current), [])

  // 화면 너비에 맞춘 기본 페이지 너비 (확대 1배 기준)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined
    const measure = () => setBaseWidth(Math.min(MAX_PAGE_WIDTH, el.clientWidth - 32))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ready])

  // 확대 뒤 손가락 가운데가 같은 곳을 가리키도록 스크롤 보정
  useLayoutEffect(() => {
    const el = scrollRef.current
    const pending = pendingScrollRef.current
    if (!el || !pending) return
    el.scrollLeft = pending.scrollLeft
    el.scrollTop = pending.scrollTop
    pendingScrollRef.current = null
  }, [zoom])

  const applyZoom = useCallback((nextZoom, clientX, clientY) => {
    const el = scrollRef.current
    const current = zoomRef.current
    const next = clampZoom(nextZoom)
    if (!el || next === current) return
    const rect = el.getBoundingClientRect()
    const cx = clientX === undefined ? rect.width / 2 : clientX - rect.left
    const cy = clientY === undefined ? rect.height / 2 : clientY - rect.top
    pendingScrollRef.current = zoomAround({ zoom: current, nextZoom: next, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop, cx, cy })
    setZoom(next)
  }, [])

  const handlePinch = useCallback(({ phase, ratio, clientX, clientY }) => {
    if (phase === 'start') pinchStartRef.current = zoomRef.current
    else if (phase === 'move') applyZoom(pinchStartRef.current * ratio, clientX, clientY)
  }, [applyZoom])

  // PC: Ctrl + 휠(트랙패드 핀치)로 확대·축소
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined
    const onWheel = (e) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      applyZoom(zoomRef.current * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [applyZoom, ready])

  const linesByPage = useMemo(() => (pages ?? []).map((p) => groupLines(p.strokes)), [pages])

  const changePages = useCallback((next) => {
    dirtyRef.current = true
    setHistory((h) => push(h, next))
  }, [])

  const updatePage = (pageIndex, fn) => changePages(pages.map((p, i) => (i === pageIndex ? { strokes: fn(p.strokes) } : p)))

  // 한 줄이 끝나면 그 줄 이미지를 글자 인식(Google Vision)으로 보낸다
  const requestOcr = useCallback((line, strokes) => {
    if (line.kind !== 'text') return
    const key = `${line.id}:${line.strokeIds.length}`
    if (ocrRequestedRef.current.has(key)) return
    ocrRequestedRef.current.add(key)
    const byId = new Map(strokes.map((s) => [s.id, s]))
    const image = renderLineToPng(line.strokeIds.map((id) => byId.get(id)).filter(Boolean))
    recognizeLine(image)
      .then((r) => setOcrLabels((labels) => ({ ...labels, [line.id]: ocrLabel(r) })))
      .catch((e) => setOcrLabels((labels) => ({ ...labels, [line.id]: ocrErrorLabel(e) })))
  }, [])

  function handlePenDown() {
    clearTimeout(idleTimerRef.current)
  }

  function handleStrokesChange(pageIndex, next, info) {
    const before = pages[pageIndex].strokes
    changePages(pages.map((p, i) => (i === pageIndex ? { strokes: next } : p)))
    if (!info?.added || isHighlighter(info.added)) return

    // 새 획이 직전 줄에 이어지지 않으면(아래 왼쪽에서 시작 등) 직전 줄이 끝난 것
    const watch = lineWatchRef.current
    if (watch && watch.pageIndex === pageIndex) {
      const prevLine = groupLines(before).find((l) => l.strokeIds.includes(watch.strokeId))
      if (prevLine && isLineEnd({ line: prevLine, nextStroke: info.added, idleMs: Date.now() - watch.at })) {
        requestOcr(prevLine, before)
      }
    }
    lineWatchRef.current = { pageIndex, strokeId: info.added.id, at: Date.now() }

    // 펜을 LINE_IDLE_MS 동안 떼고 있어도 줄이 끝난 것
    clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      const w = lineWatchRef.current
      const latest = latestPagesRef.current?.[w?.pageIndex]?.strokes
      if (!w || !latest) return
      const line = groupLines(latest).find((l) => l.strokeIds.includes(w.strokeId))
      if (line) requestOcr(line, latest)
    }, LINE_IDLE_MS)
  }

  function changeHistory(fn) {
    dirtyRef.current = true
    setSelection(null)
    setHistory(fn)
  }

  function chooseTool(next) {
    setTool(next)
    if (next !== 'lasso') setSelection(null)
  }

  function toggleGuides() {
    setShowGuides((v) => {
      saveFlag(GUIDES_KEY, !v)
      return !v
    })
  }

  if (loadError) {
    return (
      <div className="editor-message">
        <p className="error">{loadError}</p>
        <button type="button" onClick={onBack}>목록으로</button>
      </div>
    )
  }
  if (!history) return <div className="editor-message">노트를 여는 중…</div>

  const tidied = pages.some((p) => p.strokes.some((s) => s.transform))
  const isHl = tool === 'highlighter'
  const strokeWidth = isHl ? HIGHLIGHTER_SIZES[highlighterSize] : PEN_SIZES[penSize]
  const pageWidth = Math.max(240, Math.round(baseWidth * zoom))
  const scale = pageWidth / 1000

  return (
    <div className="editor">
      <header className="editor-bar">
        <button type="button" className="btn-quiet back" onClick={onBack} style={{ '--tab': folder ? FOLDER_COLORS[folder.color] : 'var(--line-strong)' }}>
          <BackIcon />
          <span className="back-tab" />
          <span className="back-label">{folder?.name ?? '전체 노트'}</span>
        </button>
        <input
          className="editor-title"
          value={title}
          maxLength={100}
          aria-label="노트 제목"
          onChange={(e) => {
            dirtyRef.current = true
            setTitle(e.target.value)
          }}
        />
        <span className={`save-state ${saveState}`} role="status">{SAVE_LABELS[saveState]}</span>
        <button type="button" className="btn-quiet icon-btn" aria-label="실행 취소" disabled={!canUndo(history)} onClick={() => changeHistory(undo)}>
          <UndoIcon />
        </button>
        <button type="button" className="btn-quiet icon-btn" aria-label="다시 실행" disabled={!canRedo(history)} onClick={() => changeHistory(redo)}>
          <RedoIcon />
        </button>
      </header>

      <ToolPalette
        tool={tool}
        onTool={chooseTool}
        penColor={penColor}
        onPenColor={setPenColor}
        highlighterColor={highlighterColor}
        onHighlighterColor={setHighlighterColor}
        size={isHl ? highlighterSize : penSize}
        onSize={isHl ? setHighlighterSize : setPenSize}
        showGuides={showGuides}
        onToggleGuides={toggleGuides}
        showLines={showLines}
        onToggleLines={() => setShowLines((v) => !v)}
        tidied={tidied}
        onTidy={() => {
          setSelection(null)
          changePages(pages.map((p) => ({ strokes: tidied ? untidyPage(p.strokes) : tidyPage(p.strokes) })))
        }}
      />

      <main className="editor-pages" ref={scrollRef}>
        <div className="pages-inner">
          {pages.map((p, i) => {
            const selectedIds = selection?.pageIndex === i ? selection.ids : null
            const box = selectedIds?.length ? selectionBBox(p.strokes, selectedIds) : null
            return (
              <div className="page" key={i} style={{ width: pageWidth }}>
                <NoteCanvas
                  strokes={p.strokes}
                  onStrokesChange={(next, info) => handleStrokesChange(i, next, info)}
                  tool={tool}
                  color={isHl ? highlighterColor : penColor}
                  width={strokeWidth}
                  showGuides={showGuides}
                  lines={linesByPage[i]}
                  showLines={showLines}
                  lineLabels={ocrLabels}
                  selectionIds={selectedIds}
                  onSelectionChange={(ids) => setSelection(ids.length ? { pageIndex: i, ids } : null)}
                  onPenDown={handlePenDown}
                  onPinch={handlePinch}
                  scrollContainer={scrollRef}
                />
                {box && (
                  <SelectionBar
                    count={selectedIds.length}
                    style={{ left: Math.max(0, (box.minX - 8) * scale), top: box.minY * scale > 64 ? (box.minY - 8) * scale - 52 : (box.maxY + 8) * scale + 8 }}
                    hasManualKind={p.strokes.some((s) => selectedIds.includes(s.id) && s.kind)}
                    onMarkDrawing={() => updatePage(i, (s) => setStrokesKind(s, selectedIds, 'drawing'))}
                    onMarkText={() => updatePage(i, (s) => setStrokesKind(s, selectedIds, 'text'))}
                    onAuto={() => updatePage(i, (s) => setStrokesKind(s, selectedIds, null))}
                    onDelete={() => {
                      updatePage(i, (s) => deleteStrokes(s, selectedIds))
                      setSelection(null)
                    }}
                    onClear={() => setSelection(null)}
                  />
                )}
              </div>
            )
          })}
          <button type="button" className="add-page" onClick={() => changePages([...pages, { strokes: [] }])}>
            페이지 추가
          </button>
        </div>
      </main>

      <div className="zoom-control" role="group" aria-label="확대·축소">
        <button type="button" className="btn-quiet icon-btn" aria-label="축소" onClick={() => applyZoom(zoom - ZOOM_STEP)}>
          <ZoomOutIcon />
        </button>
        <button type="button" className="btn-quiet zoom-value" aria-label="원래 크기로" onClick={() => applyZoom(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" className="btn-quiet icon-btn" aria-label="확대" onClick={() => applyZoom(zoom + ZOOM_STEP)}>
          <ZoomInIcon />
        </button>
      </div>
    </div>
  )
}
