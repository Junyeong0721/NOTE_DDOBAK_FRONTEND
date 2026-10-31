import { useEffect, useState } from 'react'
import { createNote, deleteNote, EMPTY_CONTENT, listNotes } from './api/notes'
import NoteEditor from './components/NoteEditor'
import './App.css'

function App() {
  const [notes, setNotes] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)

  async function refresh() {
    try {
      setNotes(await listNotes())
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleCreate() {
    try {
      const note = await createNote({ title: '새 노트', content: EMPTY_CONTENT })
      setOpenId(note.id)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('이 노트를 삭제할까요?')) return
    try {
      await deleteNote(id)
      await refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  if (openId !== null) {
    return (
      <NoteEditor
        noteId={openId}
        onBack={() => {
          setOpenId(null)
          refresh()
        }}
      />
    )
  }

  return (
    <main className="note-list">
      <header className="note-list-header">
        <h1>또박</h1>
        <button type="button" className="primary" onClick={handleCreate}>새 노트</button>
      </header>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>불러오는 중...</p>
      ) : notes.length === 0 ? (
        <p className="empty">노트가 없습니다. "새 노트"로 시작해 보세요.</p>
      ) : (
        <ul>
          {notes.map((note) => (
            <li key={note.id}>
              <button type="button" className="note-open" onClick={() => setOpenId(note.id)}>
                <span className="note-title">{note.title}</span>
                <small>{new Date(note.updatedAt).toLocaleString('ko-KR')}</small>
              </button>
              <button type="button" onClick={() => handleDelete(note.id)}>삭제</button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
