import { describe, it, expect, vi, afterEach } from 'vitest'
import { getAttempt, listAttempts, listBest, saveAttempt } from './practice'

afterEach(() => vi.restoreAllMocks())

const ok = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('practice api', () => {
  it('saveAttempt posts the attempt and returns it with advice', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ id: 7, advice: '곧게', adviceStatus: 'OK' }, 201))
    const res = await saveAttempt({ text: '가', totalScore: 80 })
    expect(f).toHaveBeenCalledWith('/api/practice/attempts', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ text: '가', totalScore: 80 })
    expect(res.advice).toBe('곧게')
  })

  it('reads the list, one attempt and best scores', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(ok([])))
    await listAttempts()
    await getAttempt(3)
    await listBest()
    expect(f.mock.calls.map((c) => c[0])).toEqual(['/api/practice/attempts', '/api/practice/attempts/3', '/api/practice/best'])
  })

  it('tells the app when the login is gone', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 }))
    const events = []
    globalThis.window = { dispatchEvent: (e) => events.push(e.type) }
    try {
      await expect(listBest()).rejects.toThrow('로그인이 필요합니다.')
      expect(events).toEqual(['ddobak:unauthorized'])
    } finally {
      delete globalThis.window
    }
  })
})
