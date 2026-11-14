import { useEffect, useRef } from 'react'
import { fontById } from '../../note/fonts'
import { ADVICE_UNAVAILABLE, glyphLabel } from '../../practice/board'
import { layoutCells } from '../../practice/cells'
import { INK_COLOR, TARGET_COLOR, drawCellStrokes, drawTarget } from '../../practice/raster'
import { useFontReady } from './useFontReady'

const CELL_PX = 88

/** 칸 하나: 목표 글자(회색) 위에 내 글씨(남색)를 겹쳐 보여 준다 */
function Overlay({ ch, fontId, strokes, fontReady }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const dpr = window.devicePixelRatio || 1
    canvas.width = CELL_PX * dpr
    canvas.height = CELL_PX * dpr
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, CELL_PX, CELL_PX)
    if (fontReady) drawTarget(ctx, ch, fontId, 0, 0, CELL_PX, { color: TARGET_COLOR })
    drawCellStrokes(ctx, strokes, 0, 0, CELL_PX, { color: INK_COLOR })
  }, [ch, fontId, strokes, fontReady])
  return <canvas ref={ref} className="result-canvas" aria-hidden="true" />
}

function Bar({ label, pct }) {
  return (
    <div className="result-bar">
      <span className="result-bar-label">{label}</span>
      <span className="result-bar-track" role="img" aria-label={`${label} ${pct}%`}>
        <span className="result-bar-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="result-bar-pct">{pct}</span>
    </div>
  )
}

/**
 * 결과 화면. result: { text, fontId, guide, cellStrokes, glyphScores, setScore, advice, adviceState }
 * adviceState: 'pending' | 'ok' | 'unavailable', saveFailed: 기록 저장까지 실패했는지
 */
export default function PracticeResult({ result, review, onRetry, onNext, onBack }) {
  const fontReady = useFontReady(result.fontId) === 'ready'
  const cells = layoutCells(result.text)
  const { setScore } = result

  return (
    <main className="practice-main">
      <div className="practice-board-head">
        <button type="button" className="btn-quiet" onClick={onBack}>← 고르기로</button>
        <span className="result-font">{fontById(result.fontId).label} · {result.guide ? '가이드 보고 씀' : '가이드 없이 씀'}</span>
      </div>

      <section className="result-summary" aria-label="점수">
        <p className="result-total"><strong>{setScore.total}</strong><span>점</span></p>
        <div className="result-bars">
          <Bar label="모양" pct={setScore.shapePct} />
          <Bar label="위치·크기" pct={setScore.positionPct} />
          <Bar label="기울기" pct={setScore.tiltPct} />
        </div>
      </section>

      <section className="result-advice" aria-live="polite" aria-label="조언">
        <h2>조언</h2>
        {result.adviceState === 'pending' && <p className="result-advice-wait">조언을 생각하는 중…</p>}
        {result.adviceState === 'ok' && <p>{result.advice}</p>}
        {result.adviceState === 'unavailable' && <p className="result-advice-none">{ADVICE_UNAVAILABLE}</p>}
        {result.saveFailed && <small>기록을 저장하지 못했어요.</small>}
      </section>

      <ul className="result-cells" aria-label="글자별 점수">
        {cells.map((c) =>
          c.blank ? (
            <li key={c.index} className="result-cell blank" aria-hidden={c.ch === ' '}>
              <span className="result-blank">{c.ch === ' ' ? '' : c.ch}</span>
              <span className="result-score">{c.ch === ' ' ? '' : '–'}</span>
            </li>
          ) : (
            <li key={c.index} className="result-cell">
              <Overlay ch={c.ch} fontId={result.fontId} strokes={result.cellStrokes[c.index] ?? []} fontReady={fontReady} />
              <span className="result-score"><span className="visually-hidden">{c.ch} </span>{glyphLabel(result.glyphScores[c.index])}</span>
            </li>
          ),
        )}
      </ul>
      <p className="result-legend"><i className="legend-target" /> 목표 글씨 <i className="legend-mine" /> 내 글씨</p>

      <div className="practice-actions">
        <button type="button" className="btn-primary btn-large" onClick={onRetry}>다시 하기</button>
        {!review && onNext && <button type="button" className="btn-large" onClick={onNext}>다음 세트</button>}
        <button type="button" className="btn-large" onClick={onBack}>고르기로</button>
      </div>
    </main>
  )
}
