import { describe, it, expect, vi, afterEach } from 'vitest'
import { recognizeLine, ocrLabel, ocrErrorLabel } from './ocr'

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

  it('labels the recognized text, or explains an empty result', () => {
    expect(ocrLabel({ engine: 'google-vision', text: '안녕하세요', chars: [] })).toBe('안녕하세요')
    expect(ocrLabel({ engine: 'google-vision', text: '', chars: [] })).toBe('(글자 없음)')
    expect(ocrLabel({ engine: 'fake', text: '', chars: [] })).toBe('가짜 인식 (키 없음)')
  })

  it('labels errors with the server message', () => {
    expect(ocrErrorLabel(new Error('오늘 글자 인식 횟수(30번)를 다 썼습니다. 내일 다시 시도해 주세요.')))
      .toBe('⚠ 오늘 글자 인식 횟수(30번)를 다 썼습니다. 내일 다시 시도해 주세요.')
    expect(ocrErrorLabel(new Error(''))).toBe('⚠ 인식 실패')
  })
})
