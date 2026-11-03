import { useEffect, useRef, useState } from 'react'
import { FOLDER_COLORS } from '../api/folders'
import { MoreIcon } from './Icons'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function NoteMenu({ note, folders, onMove, onDelete, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const onDown = (e) => !ref.current?.contains(e.target) && onClose()
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [onClose])

  const current = note.folderId ?? null
  return (
    <div className="note-menu" ref={ref} role="menu">
      <p className="note-menu-label">폴더 이동</p>
      {folders.map((f) => (
        <button key={f.id} type="button" role="menuitem" disabled={current === f.id} onClick={() => onMove(f.id)}>
          <span className="dot" style={{ background: FOLDER_COLORS[f.color] }} />
          {f.name}
        </button>
      ))}
      <button type="button" role="menuitem" disabled={current === null} onClick={() => onMove(null)}>
        <span className="dot dot-empty" />
        미분류
      </button>
      <hr />
      <button type="button" role="menuitem" className="btn-danger" onClick={onDelete}>
        삭제
      </button>
    </div>
  )
}

export default function NoteGrid({ notes, folders, onOpen, onMove, onDelete }) {
  const [menuFor, setMenuFor] = useState(null)
  const folderById = new Map(folders.map((f) => [f.id, f]))

  return (
    <ul className="note-grid">
      {notes.map((note) => {
        const folder = folderById.get(note.folderId)
        return (
          <li key={note.id} className="note-card">
            <button type="button" className="note-open" onClick={() => onOpen(note.id)}>
              <span className="thumb">
                {note.thumbnail ? <img src={note.thumbnail} alt="" /> : null}
                {folder && <span className="thumb-tab" style={{ background: FOLDER_COLORS[folder.color] }} />}
              </span>
              <span className="note-title">{note.title}</span>
              <span className="note-date">{dateFormat.format(new Date(note.updatedAt))}</span>
            </button>
            <button
              type="button"
              className="btn-quiet note-more"
              aria-label={`${note.title} 메뉴`}
              aria-expanded={menuFor === note.id}
              onClick={() => setMenuFor(menuFor === note.id ? null : note.id)}
            >
              <MoreIcon />
            </button>
            {menuFor === note.id && (
              <NoteMenu
                note={note}
                folders={folders}
                onClose={() => setMenuFor(null)}
                onMove={(folderId) => {
                  setMenuFor(null)
                  onMove(note.id, folderId)
                }}
                onDelete={() => {
                  setMenuFor(null)
                  onDelete(note.id)
                }}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
