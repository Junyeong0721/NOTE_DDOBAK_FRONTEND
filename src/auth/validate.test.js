import { describe, it, expect } from 'vitest'
import { validateLogin, validateSignup } from './validate'

describe('sign-up and login checks (same rules as the server)', () => {
  it('accepts a good sign-up', () => {
    expect(validateSignup({ email: 'me@test.kr', password: 'abcd1234', nickname: '준영' })).toEqual({})
  })

  it('explains each problem next to its field', () => {
    expect(validateSignup({ email: '', password: '', nickname: '' })).toEqual({
      email: '이메일을 입력해 주세요.', password: '비밀번호를 입력해 주세요.', nickname: '닉네임을 입력해 주세요.',
    })
    expect(validateSignup({ email: 'me@', password: 'abcdefgh', nickname: '가'.repeat(21) })).toEqual({
      email: '이메일 형식이 올바르지 않습니다.', password: '비밀번호에 영문과 숫자를 모두 넣어 주세요.', nickname: '닉네임은 20자 이하로 입력해 주세요.',
    })
    expect(validateSignup({ email: 'me@test.kr', password: 'ab1', nickname: '가' }).password).toBe('비밀번호는 8~64자로 입력해 주세요.')
    expect(validateSignup({ email: 'me@test.kr', password: 'abcd1234', nickname: '   ' }).nickname).toBe('닉네임을 입력해 주세요.')
  })

  it('only needs both fields to log in', () => {
    expect(validateLogin({ email: 'me@test.kr', password: 'x' })).toEqual({})
    expect(validateLogin({ email: ' ', password: '' })).toEqual({ email: '이메일을 입력해 주세요.', password: '비밀번호를 입력해 주세요.' })
  })
})
