import { describe, it, expect, vi, afterEach } from 'vitest'
import { recognizeLine } from './ocr'

afterEach(() => vi.restoreAllMocks())

describe('ocr api', () => {
  it('posts the line image to /api/ocr/line and returns the result', async () => {
    const result = { engine: 'fake', text: '', chars: [] }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    const res = await recognizeLine({ imageBase64: 'iVBOR', width: 120, height: 48 })

    expect(fetchMock).toHaveBeenCalledWith('/api/ocr/line', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ imageBase64: 'iVBOR', width: 120, height: 48 })
    expect(res).toEqual(result)
  })

  it('throws the server message on 400', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: '이미지 형식이 올바르지 않습니다.' }), { status: 400 }))
    await expect(recognizeLine({ imageBase64: 'x', width: 1, height: 1 })).rejects.toThrow('이미지 형식이 올바르지 않습니다.')
  })
})
