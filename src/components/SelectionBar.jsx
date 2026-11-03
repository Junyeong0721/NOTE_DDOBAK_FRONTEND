// 올가미로 고른 획 위에 뜨는 작은 막대
export default function SelectionBar({ count, style, onDelete, onMarkDrawing, onMarkText, onAuto, hasManualKind, onClear }) {
  return (
    <div className="selection-bar" style={style} role="toolbar" aria-label={`선택한 획 ${count}개`}>
      <span className="selection-count">{count}개 선택</span>
      <button type="button" onClick={onMarkDrawing}>그림으로 지정</button>
      <button type="button" onClick={onMarkText}>글씨로 지정</button>
      {hasManualKind && <button type="button" onClick={onAuto}>자동 판정</button>}
      <button type="button" className="btn-danger" onClick={onDelete}>삭제</button>
      <button type="button" className="btn-quiet" aria-label="선택 해제" onClick={onClear}>✕</button>
    </div>
  )
}
