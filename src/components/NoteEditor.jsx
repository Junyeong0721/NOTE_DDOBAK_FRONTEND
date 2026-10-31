import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getNote, updateNote } from '../api/notes'
import { recognizeLine } from '../api/ocr'
import { parseContent, serializeContent } from '../note/content'
import { canRedo, canUndo, createHistory, push, redo, undo } from '../note/history'
import { renderLineToPng } from '../note/lineImage'
import { LINE_IDLE_MS, groupLines, isLineEnd } from '../note/lines'
import { tidyPage, untidyPage } from '../note/tidy'
import NoteCanvas from './NoteCanvas'
import './NoteEditor.css'

const COLORS = ['#222222', '#1e5bd8', '#d32f2f']
const PEN_WIDTH = 2.4
const SAVE_DELAY_MS = 1000
const SAVE_LABELS = { saving: '저장 중…', saved: '저장됨', error: '저장 실패', invalid: '제목을 입력해 주세요' }
const GUIDES_KEY = 'ddobak.showGuides'

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

export default function NoteEditor({ noteId, onBack }) {
  const [loadError, setLoadError] = useState('')
  const [title, setTitle] = useState('')
  const [meta, setMeta] = useState(null) // { version, page }
  const [history, setHistory] = useState(null) // present = 페이지 배열 [{ strokes }]
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState(COLORS[0])
  const [showGuides, setShowGuides] = useState(() => loadFlag(GUIDES_KEY))
  const [showLines, setShowLines] = useState(false)
  const [saveState, setSaveState] = useState('saved')
  const [ocrLabels, setOcrLabels] = useState({}) // 줄 id → 인식 결과 표시

  const dirtyRef = useRef(false)
  const scrollRef = useRef(null)
  const latestPagesRef = useRef(null)
  const lineWatchRef = useRef(null) // 마지막으로 쓴 획 { pageIndex, strokeId, at }
  const idleTimerRef = useRef(0)
  const ocrRequestedRef = useRef(new Set())

  const pages = history?.present ?? null
  latestPagesRef.current = pages

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

  // 자동 저장: 마지막 변경 1초 뒤
  useEffect(() => {
    if (!history || !meta || !dirtyRef.current) return undefined
    if (!title.trim()) {
      setSaveState('invalid')
      return undefined
    }
    setSaveState('saving')
    const timer = setTimeout(() => {
      const content = serializeContent({ version: meta.version, page: meta.page, pages: history.present })
      updateNote(noteId, { title: title.trim(), content })
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'))
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [history, title, meta, noteId])

  useEffect(() => () => clearTimeout(idleTimerRef.current), [])

  const linesByPage = useMemo(() => (pages ?? []).map((p) => groupLines(p.strokes)), [pages])

  const changePages = useCallback((next) => {
    dirtyRef.current = true
    setHistory((h) => push(h, next))
  }, [])

  // 한 줄이 끝나면 그 줄 이미지를 OCR로 보낸다 (2주차: 가짜 결과)
  const requestOcr = useCallback((line, strokes) => {
    if (line.kind !== 'text') return
    const key = `${line.id}:${line.strokeIds.length}`
    if (ocrRequestedRef.current.has(key)) return
    ocrRequestedRef.current.add(key)
    const byId = new Map(strokes.map((s) => [s.id, s]))
    const image = renderLineToPng(line.strokeIds.map((id) => byId.get(id)).filter(Boolean))
    recognizeLine(image)
      .then((r) => setOcrLabels((labels) => ({ ...labels, [line.id]: r.text || r.engine })))
      .catch(() => setOcrLabels((labels) => ({ ...labels, [line.id]: '인식 실패' })))
  }, [])

  function handlePenDown() {
    clearTimeout(idleTimerRef.current)
  }

  function handleStrokesChange(pageIndex, next, info) {
    const before = pages[pageIndex].strokes
    changePages(pages.map((p, i) => (i === pageIndex ? { strokes: next } : p)))
    if (!info?.added) return

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
    setHistory(fn)
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
  if (!history) return <div className="editor-message">불러오는 중...</div>

  const tidied = pages.some((p) => p.strokes.some((s) => s.transform))

  return (
    <div className="editor">
      <header className="editor-toolbar">
        <button type="button" onClick={onBack}>← 목록</button>
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
        <div className="tool-group">
          <button type="button" className={tool === 'pen' ? 'active' : ''} onClick={() => setTool('pen')}>펜</button>
          <button type="button" className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')}>지우개</button>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`펜 색 ${c}`}
              className={`color-swatch ${tool === 'pen' && color === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => {
                setColor(c)
                setTool('pen')
              }}
            />
          ))}
        </div>
        <div className="tool-group">
          <button type="button" disabled={!canUndo(history)} onClick={() => changeHistory(undo)}>실행 취소</button>
          <button type="button" disabled={!canRedo(history)} onClick={() => changeHistory(redo)}>다시 실행</button>
        </div>
        <div className="tool-group">
          <button type="button" className={showGuides ? 'active' : ''} onClick={toggleGuides}>가이드 줄</button>
          <button type="button" className={showLines ? 'active' : ''} onClick={() => setShowLines((v) => !v)}>줄 보기</button>
          <button
            type="button"
            onClick={() => changePages(pages.map((p) => ({ strokes: tidied ? untidyPage(p.strokes) : tidyPage(p.strokes) })))}
          >
            {tidied ? '정리 취소' : '노트 정리'}
          </button>
        </div>
        <span className={`save-state ${saveState}`}>{SAVE_LABELS[saveState]}</span>
      </header>

      <main className="editor-pages" ref={scrollRef}>
        {pages.map((p, i) => (
          <div className="page" key={i}>
            <NoteCanvas
              strokes={p.strokes}
              onStrokesChange={(next, info) => handleStrokesChange(i, next, info)}
              tool={tool}
              color={color}
              penWidth={PEN_WIDTH}
              showGuides={showGuides}
              lines={linesByPage[i]}
              showLines={showLines}
              lineLabels={ocrLabels}
              onPenDown={handlePenDown}
              scrollContainer={scrollRef}
            />
          </div>
        ))}
        <button type="button" className="add-page" onClick={() => changePages([...pages, { strokes: [] }])}>
          + 페이지 추가
        </button>
      </main>
    </div>
  )
}
