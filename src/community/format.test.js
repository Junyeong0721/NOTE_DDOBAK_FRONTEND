import { describe, it, expect } from 'vitest'
import { cardLine, countLabel, publishedLabel } from './format'

describe('cardLine', () => {
  it('prefers the first summary line, then the intro', () => {
    expect(cardLine({ summaryLine: '극한의 뜻', intro: '소개' })).toBe('극한의 뜻')
    expect(cardLine({ summary: '\n  첫 줄 \n둘째', intro: '소개' })).toBe('첫 줄')
    expect(cardLine({ summaryLine: null, intro: ' 2강 정리 ' })).toBe('2강 정리')
    expect(cardLine({})).toBe('')
  })
})

describe('countLabel', () => {
  it('shortens big numbers', () => {
    expect(countLabel(0)).toBe('0')
    expect(countLabel(999)).toBe('999')
    expect(countLabel(1000)).toBe('1천')
    expect(countLabel(1234)).toBe('1.2천')
    expect(countLabel(12000)).toBe('1.2만')
    expect(countLabel(undefined)).toBe('0')
  })
})

describe('publishedLabel', () => {
  it('adds the update date only when it changed later', () => {
    expect(publishedLabel('2026-11-01T03:00:00Z', '2026-11-01T03:00:10Z')).toBe('2026년 11월 1일 공개')
    expect(publishedLabel('2026-11-01T03:00:00Z', '2026-11-05T03:00:00Z')).toBe('2026년 11월 1일 공개 · 2026년 11월 5일 업데이트')
  })
})
