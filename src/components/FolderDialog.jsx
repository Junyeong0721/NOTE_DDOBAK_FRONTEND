import { useEffect, useRef, useState } from 'react'
import { FOLDER_COLORS, FOLDER_COLOR_KEYS } from '../api/folders'

const COLOR_NAMES = { yellow: '노랑', pink: '분홍', mint: '민트', sky: '하늘', orange: '주황', lavender: '보라' }

/** 폴더 만들기 / 바꾸기. folder가 있으면 수정 모드(삭제 버튼 포함) */
export default function FolderDialog({ folder, onSave, onDelete, onClose }) {
  const [name, setName] = useState(folder?.name ?? '')
  const [color, setColor] = useState(folder?.color ?? 'yellow')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('폴더 이름을 입력해 주세요.')
      return
    }
    setBusy(true)
    try {
      await onSave({ name: name.trim(), color })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="folder-dialog-title" onSubmit={submit}>
        <h2 id="folder-dialog-title">{folder ? '폴더 바꾸기' : '새 폴더'}</h2>
        <label className="field">
          <span>이름</span>
          <input ref={inputRef} value={name} maxLength={30} placeholder="예: 자료구조" onChange={(e) => setName(e.target.value)} />
        </label>
        <fieldset className="field">
          <legend>색</legend>
          <div className="swatches">
            {FOLDER_COLOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={`swatch${color === key ? ' selected' : ''}`}
                style={{ '--swatch': FOLDER_COLORS[key] }}
                aria-label={COLOR_NAMES[key]}
                aria-pressed={color === key}
                onClick={() => setColor(key)}
              />
            ))}
          </div>
        </fieldset>
        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          {folder && (
            <button type="button" className="btn-quiet btn-danger dialog-delete" onClick={onDelete}>
              폴더 삭제
            </button>
          )}
          <button type="button" onClick={onClose}>취소</button>
          <button type="submit" className="btn-primary" disabled={busy}>{folder ? '저장' : '만들기'}</button>
        </div>
      </form>
    </div>
  )
}
