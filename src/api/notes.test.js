import { describe, it, expect, vi, afterEach } from 'vitest'
import { createNote, deleteNote, getNote, listNotes, EMPTY_CONTENT } from './notes'

afterEach(() => vi.restoreAllMocks())

describe('notes api', () => {
  it('createNote posts JSON to /api/notes and returns the note', async () => {
    const saved = { id: 1, title: '테스트', content: EMPTY_CONTENT }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(saved), { status: 201, headers: { 'Content-Type': 'application/json' } }))

    const result = await createNote({ title: '테스트', content: EMPTY_CONTENT })

    expect(fetchMock).toHaveBeenCalledWith('/api/notes', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ title: '테스트', content: EMPTY_CONTENT })
    expect(result).toEqual(saved)
  })

  it('throws server message on error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: '노트를 찾을 수 없습니다. id=9' }), { status: 404 }))

    await expect(getNote(9)).rejects.toThrow('노트를 찾을 수 없습니다. id=9')
  })

  it('falls back to a default message when the error body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad Gateway', { status: 502 }))

    await expect(getNote(1)).rejects.toThrow('요청에 실패했습니다. (502)')
  })

  it('deleteNote resolves on 204 without reading a body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    await expect(deleteNote(3)).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/notes/3', expect.objectContaining({ method: 'DELETE' }))
  })
})

describe('notes api: folders and thumbnails', () => {
  const ok = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })

  it('createNote sends folderId only when given', async () => {
    const { createNote } = await import('./notes')
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(ok({ id: 1 })))
    await createNote({ title: 't', content: '{}', folderId: 3 })
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ title: 't', content: '{}', folderId: 3 })
    await createNote({ title: 't', content: '{}' })
    expect('folderId' in JSON.parse(f.mock.calls[1][1].body)).toBe(false)
  })

  it('updateNote sends the thumbnail', async () => {
    const { updateNote } = await import('./notes')
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ id: 1 }))
    await updateNote(1, { title: 't', content: '{}', thumbnail: 'data:image/png;base64,AAA' })
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ title: 't', content: '{}', thumbnail: 'data:image/png;base64,AAA' })
  })

  it('moveNoteToFolder patches the folder, null means unfiled', async () => {
    const { moveNoteToFolder } = await import('./notes')
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ id: 1, folderId: null }))
    await moveNoteToFolder(1, null)
    expect(f).toHaveBeenCalledWith('/api/notes/1/folder', expect.objectContaining({ method: 'PATCH' }))
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ folderId: null })
  })

  it('tells the app when the login is gone (401), so it can show the login screen', async () => {
    const seen = []
    const target = new EventTarget()
    globalThis.window = target
    target.addEventListener('ddobak:unauthorized', () => seen.push('401'))
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 })))
    await expect(listNotes()).rejects.toThrow('로그인이 필요합니다.')
    expect(seen).toEqual(['401'])
    delete globalThis.window
  })
})
