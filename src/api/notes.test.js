import { describe, it, expect, vi, afterEach } from 'vitest'
import { createNote, deleteNote, getNote, EMPTY_CONTENT } from './notes'

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
