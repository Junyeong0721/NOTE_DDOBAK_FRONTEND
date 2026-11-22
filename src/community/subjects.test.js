import { describe, it, expect } from 'vitest'
import { suggestSubjects } from './subjects'

describe('suggestSubjects', () => {
  it('puts the folder first and drops duplicates', () => {
    const list = [{ subject: '영어', count: 9 }, { subject: '수학', count: 5 }, { subject: 'Physics', count: 2 }]
    expect(suggestSubjects(' 수학 ', list)).toEqual(['수학', '영어', 'Physics'])
    expect(suggestSubjects('physics', list)).toEqual(['physics', '영어', '수학'])
  })

  it('works without a folder and keeps at most 8', () => {
    const list = Array.from({ length: 12 }, (_, i) => ({ subject: `과목${i}`, count: 12 - i }))
    expect(suggestSubjects(null, list)).toHaveLength(8)
    expect(suggestSubjects(null, list)[0]).toBe('과목0')
    expect(suggestSubjects('', [])).toEqual([])
  })

  it('skips folder names that are too long to be a subject', () => {
    expect(suggestSubjects('가'.repeat(31), [{ subject: '국어', count: 1 }])).toEqual(['국어'])
  })
})
