import { fontFamily } from '../note/fonts'

/**
 * 화면 아래 보정 막대.
 * - suggest: 보정안을 목표 글씨체로 미리 보여 주고 [바꾸기] [닫기]
 * - edit: 적용된 보정의 글자 칩. 누르면 그 글자만 원래대로 ↔ 보정. [보정 취소] [완료]
 * - busy / message: 인식 중이거나 알려 줄 말이 있을 때
 */
export default function CorrectionBar({ bar, correction, fontId, onApply, onToggle, onRemove, onClose }) {
  if (bar.mode === 'busy' || bar.mode === 'message') {
    return (
      <div className="correction-bar" role="status">
        <span className="correction-note">{bar.mode === 'busy' ? '글자를 읽는 중…' : bar.text}</span>
        {bar.mode === 'message' && <button type="button" onClick={onClose}>닫기</button>}
      </div>
    )
  }
  if (!correction) return null
  const family = `${fontFamily(fontId ?? correction.fontId)}, sans-serif`

  if (bar.mode === 'suggest') {
    return (
      <div className="correction-bar" role="dialog" aria-label="보정안">
        <span className="correction-label">보정안</span>
        <span className="correction-preview" style={{ fontFamily: family }}>
          {correction.chars.map((c) => c.ch).join('')}
        </span>
        <button type="button" className="btn-primary" onClick={onApply}>바꾸기</button>
        <button type="button" onClick={onClose}>닫기</button>
      </div>
    )
  }

  return (
    <div className="correction-bar" role="dialog" aria-label="글자 고르기">
      <span className="correction-note">누른 글자는 원래 글씨로</span>
      <span className="correction-chips">
        {correction.chars.map((c, i) => (
          <button
            key={i}
            type="button"
            className={`char-chip${c.off ? ' off' : ''}`}
            style={{ fontFamily: family }}
            aria-pressed={!c.off}
            aria-label={`${c.ch} ${c.off ? '원래 글씨' : '보정됨'}`}
            onClick={() => onToggle(i)}
          >
            {c.ch}
          </button>
        ))}
      </span>
      <button type="button" className="btn-quiet btn-danger" onClick={onRemove}>보정 취소</button>
      <button type="button" className="btn-primary" onClick={onClose}>완료</button>
    </div>
  )
}
