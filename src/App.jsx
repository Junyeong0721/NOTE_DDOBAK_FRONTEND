import { useCallback, useEffect, useMemo, useState } from 'react'
import { FOLDER_COLORS, createFolder, deleteFolder, listFolders, updateFolder } from './api/folders'
import { EMPTY_CONTENT, createNote, deleteNote, listNotes, moveNoteToFolder } from './api/notes'
import FolderDialog from './components/FolderDialog'
import FolderSidebar from './components/FolderSidebar'
import Home from './components/Home'
import { EditIcon, PlusIcon, SearchIcon, SettingsIcon } from './components/Icons'
import NoteEditor from './components/NoteEditor'
import NoteGrid from './components/NoteGrid'
import SettingsDialog from './components/SettingsDialog'
import { ALL, UNFILED, countByFolder, filterNotes } from './note/filterNotes'
import { loadSettings, saveSettings } from './settings'
import Practice from './components/practice/Practice'
import './App.css'

function emptyMessage({ selected, query, total }) {
  if (query.trim()) return `‘${query.trim()}’와 맞는 노트가 없어요.`
  if (selected === ALL) return total === 0 ? '아직 노트가 없어요. 새 노트로 첫 필기를 시작해 보세요.' : ''
  if (selected === UNFILED) return '미분류 노트가 없어요.'
  return '이 폴더에 노트가 없어요. 새 노트를 만들면 여기에 들어가요.'
}

function App({ user, onLogout }) {
  const [notes, setNotes] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(ALL)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(null) // { id, folderId }
  const [dialog, setDialog] = useState(null) // { folder } | { folder: null }
  const [settings, setSettings] = useState(loadSettings) // { fontId, autoSuggest } — 이 기기에 저장
  const [showSettings, setShowSettings] = useState(false)
  const [view, setView] = useState('home') // home | library | practice

  const changeSettings = useCallback((next) => {
    setSettings(next)
    saveSettings(next)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [n, f] = await Promise.all([listNotes(), listFolders()])
      setNotes(n)
      setFolders(f)
      setSelected((s) => (typeof s === 'number' && !f.some((x) => x.id === s) ? ALL : s))
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const counts = useMemo(() => countByFolder(notes), [notes])
  const visible = useMemo(() => filterNotes(notes, { folder: selected, query }), [notes, selected, query])
  const currentFolder = typeof selected === 'number' ? folders.find((f) => f.id === selected) : null
  const heading = selected === ALL ? '전체 노트' : selected === UNFILED ? '미분류' : currentFolder?.name ?? ''

  async function handleCreate(folderId = currentFolder?.id) {
    try {
      const note = await createNote({ title: '새 노트', content: EMPTY_CONTENT, folderId })
      setOpen({ id: note.id, folderId: note.folderId ?? null })
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleMove(id, folderId) {
    try {
      const summary = await moveNoteToFolder(id, folderId)
      setNotes((list) => list.map((n) => (n.id === id ? { ...n, ...summary } : n)))
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('이 노트를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
    try {
      await deleteNote(id)
      await refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  async function saveFolder({ name, color }) {
    if (dialog.folder) {
      await updateFolder(dialog.folder.id, { name, color })
    } else {
      const created = await createFolder({ name, color })
      setSelected(created.id)
    }
    setDialog(null)
    await refresh()
  }

  async function removeFolder() {
    if (!window.confirm(`‘${dialog.folder.name}’ 폴더를 삭제할까요? 안의 노트는 미분류로 옮겨져요.`)) return
    try {
      await deleteFolder(dialog.folder.id)
      setDialog(null)
      setSelected(ALL)
      await refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  if (open) {
    return (
      <NoteEditor
        noteId={open.id}
        settings={settings}
        onSettingsChange={changeSettings}
        folder={folders.find((f) => f.id === open.folderId) ?? null}
        onBack={() => {
          setOpen(null)
          refresh()
        }}
      />
    )
  }

  const settingsDialog = showSettings && <SettingsDialog settings={settings} onChange={changeSettings} onClose={() => setShowSettings(false)} />
  const openNote = (id) => setOpen({ id, folderId: notes.find((n) => n.id === id)?.folderId ?? null })

  if (view === 'practice') {
    return <Practice onExit={() => setView('home')} />
  }

  if (view === 'home') {
    return (
      <>
        <Home
          user={user}
          notes={notes}
          folders={folders}
          loading={loading}
          error={error}
          onOpen={openNote}
          onCreate={() => handleCreate(null)}
          onShowAll={() => setView('library')}
          onPractice={() => setView('practice')}
          onSettings={() => setShowSettings(true)}
          onLogout={onLogout}
        />
        {settingsDialog}
      </>
    )
  }

  const empty = emptyMessage({ selected, query, total: notes.length })

  return (
    <div className="library">
      <FolderSidebar
        folders={folders}
        counts={counts}
        selected={selected}
        onSelect={setSelected}
        onCreateFolder={() => setDialog({ folder: null })}
        onHome={() => setView('home')}
      />
      <main className="library-main">
        <header className="library-header">
          <div className="library-title">
            <h1 style={{ '--tab': currentFolder ? FOLDER_COLORS[currentFolder.color] : 'transparent' }} className={currentFolder ? 'has-tab' : ''}>
              {heading}
            </h1>
            {currentFolder && (
              <button type="button" className="btn-quiet" aria-label="폴더 바꾸기" onClick={() => setDialog({ folder: currentFolder })}>
                <EditIcon />
              </button>
            )}
          </div>
          <div className="library-actions">
            <label className="search">
              <SearchIcon />
              <input type="search" value={query} placeholder="노트 제목 검색" aria-label="노트 제목 검색" onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button type="button" className="btn-quiet settings-btn" onClick={() => setShowSettings(true)}>
              <SettingsIcon /> <span>설정·글씨체</span>
            </button>
            <button type="button" className="btn-primary" onClick={() => handleCreate()}>
              <PlusIcon /> 새 노트
            </button>
          </div>
        </header>
        {error && <p className="error library-error">{error}</p>}
        {loading ? (
          <p className="library-empty">불러오는 중...</p>
        ) : visible.length === 0 ? (
          <p className="library-empty">{empty}</p>
        ) : (
          <NoteGrid
            notes={visible}
            folders={folders}
            onOpen={openNote}
            onMove={handleMove}
            onDelete={handleDelete}
          />
        )}
      </main>
      {settingsDialog}
      {dialog && <FolderDialog folder={dialog.folder} onSave={saveFolder} onDelete={removeFolder} onClose={() => setDialog(null)} />}
    </div>
  )
}

export default App
