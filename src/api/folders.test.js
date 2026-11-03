import { describe, it, expect, vi, afterEach } from 'vitest'
import { FOLDER_COLORS, FOLDER_COLOR_KEYS, createFolder, deleteFolder, listFolders, updateFolder } from './folders'

afterEach(() => vi.restoreAllMocks())
const ok = (body, status = 200) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('folders api', () => {
  it('has six highlighter colors in a fixed order', () => {
    expect(FOLDER_COLOR_KEYS).toEqual(['yellow', 'pink', 'mint', 'sky', 'orange', 'lavender'])
    expect(FOLDER_COLORS.yellow).toBe('#ffd84d')
    expect(FOLDER_COLORS.lavender).toBe('#9b8cff')
  })

  it('lists folders', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([{ id: 1, name: '자료구조', color: 'mint' }]))
    expect(await listFolders()).toEqual([{ id: 1, name: '자료구조', color: 'mint' }])
    expect(f.mock.calls[0][0]).toBe('/api/folders')
  })

  it('creates, updates and deletes folders', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(ok({ id: 2, name: '운영체제', color: 'sky' }, 201)))
    await createFolder({ name: '운영체제', color: 'sky' })
    expect(f).toHaveBeenCalledWith('/api/folders', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ name: '운영체제', color: 'sky' })
    await updateFolder(2, { name: 'OS', color: 'pink' })
    expect(f).toHaveBeenCalledWith('/api/folders/2', expect.objectContaining({ method: 'PUT' }))
    f.mockImplementation(() => Promise.resolve(ok(null, 204)))
    await expect(deleteFolder(2)).resolves.toBeUndefined()
    expect(f).toHaveBeenCalledWith('/api/folders/2', expect.objectContaining({ method: 'DELETE' }))
  })
})
