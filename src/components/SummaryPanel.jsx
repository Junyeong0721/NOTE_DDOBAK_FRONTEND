import { CloseIcon } from './Icons'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/**
 * AI 요약 칸. state: 'idle' | 'busy' | 'error'
 * summary: { lines, at } | null, suggestion: 제목 추천(지금 제목과 다를 때만), stale: 요약 뒤에 노트가 바뀜
 */
export default function SummaryPanel({ state, error, pageCount, summary, suggestion, stale, onSummarize, onUseTitle, onClose }) {
  const busy = state === 'busy'
  return (
    <aside className="summary-panel" aria-label="AI 요약" aria-busy={busy}>
      <div className="summary-head">
        <h2>AI 요약</h2>
        <button type="button" className="btn-quiet icon-btn" aria-label="요약 닫기" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      {busy && (
        <p className="summary-wait" role="status">노트를 읽는 중… {pageCount > 0 ? `(${pageCount}쪽)` : ''}</p>
      )}
      {state === 'error' && <p className="summary-error" role="alert">{error}</p>}

      {!busy && summary && (
        <>
          {stale && <p className="summary-stale">요약한 뒤에 노트가 바뀌었어요. 다시 요약하면 새 내용이 들어가요.</p>}
          <ul className="summary-lines">
            {summary.lines.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
          {suggestion && (
            <div className="summary-title">
              <span className="summary-title-label">제목 추천</span>
              <strong>{suggestion}</strong>
              <button type="button" onClick={onUseTitle}>제목으로 쓰기</button>
            </div>
          )}
        </>
      )}

      {!busy && !summary && state !== 'error' && (
        <p className="summary-empty">필기를 AI가 읽고 핵심을 3~5줄로 정리해요. 내용에 맞는 제목도 추천해 드려요.</p>
      )}

      <div className="summary-foot">
        <button type="button" className={summary ? '' : 'btn-primary'} onClick={onSummarize} disabled={busy}>
          {summary ? '다시 요약' : state === 'error' ? '다시 시도' : '요약 만들기'}
        </button>
        {summary && <small>{dateFormat.format(new Date(summary.at))} 요약</small>}
      </div>
      <p className="summary-note">AI가 손글씨를 읽고 만든 요약이라 틀린 부분이 있을 수 있어요.</p>
    </aside>
  )
}
