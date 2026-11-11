import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchMe, login, logout, signup } from './auth'

afterEach(() => vi.restoreAllMocks())
const ok = (body, status = 200) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const user = { id: 1, email: 'me@test.kr', nickname: '준영', provider: 'LOCAL' }

describe('auth api', () => {
  it('signs up and logs in with JSON bodies', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(ok(user)))
    expect(await signup({ email: 'me@test.kr', password: 'abcd1234', nickname: '준영' })).toEqual(user)
    expect(f.mock.calls[0][0]).toBe('/api/auth/signup')
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ email: 'me@test.kr', password: 'abcd1234', nickname: '준영' })
    await login({ email: 'me@test.kr', password: 'abcd1234' })
    expect(f.mock.calls[1][0]).toBe('/api/auth/login')
  })

  it('reads the logged-in user, or null when not logged in', async () => {
    const replies = [ok(user), ok({ message: '로그인이 필요합니다.' }, 401)]
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(replies.shift()))
    expect(await fetchMe()).toEqual(user)
    expect(await fetchMe()).toBeNull()
  })

  it('logs out', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })))
    await logout()
    expect(f.mock.calls[0][0]).toBe('/api/auth/logout')
    expect(f.mock.calls[0][1].method).toBe('POST')
  })
})
