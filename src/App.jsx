import { useEffect, useState } from 'react'
import { createNote, deleteNote, EMPTY_CONTENT, listNotes } from './api/notes'
import './App.css'

// 1주차 확인용 화면: 백엔드와 연결되는지만 본다. 필기 캔버스 작업에서 교체한다.
function App() {
  const [notes, setNotes] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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
      await createNote({ title: '새 노트', content: EMPTY_CONTENT })
      await refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteNote(id)
      await refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <main className="app">
      <h1>또박</h1>
      {error && <p className="error">{error}</p>}
      <button type="button" onClick={handleCreate}>새 노트</button>
      {loading ? (
        <p>불러오는 중...</p>
      ) : notes.length === 0 ? (
        <p>노트가 없습니다.</p>
      ) : (
        <ul className="notes">
          {notes.map((note) => (
            <li key={note.id}>
              <span>{note.title}</span>
              <small>{new Date(note.updatedAt).toLocaleString('ko-KR')}</small>
              <button type="button" onClick={() => handleDelete(note.id)}>삭제</button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
