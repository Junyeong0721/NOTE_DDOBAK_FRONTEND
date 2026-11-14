import { describe, it, expect } from 'vitest'
import { SETS, STAGES, nextSet, setsOf } from './sets'
import { MAX_TEXT, normalizeText } from './cells'

describe('practice sets', () => {
  it('has 16 sets with unique ids in known stages', () => {
    expect(SETS.length).toBe(16)
    expect(new Set(SETS.map((s) => s.id)).size).toBe(16)
    const stages = STAGES.map((s) => s.id)
    expect(SETS.every((s) => stages.includes(s.stage))).toBe(true)
    expect(STAGES.every((s) => setsOf(s.id).length > 0)).toBe(true)
  })

  it('keeps every text clean and within the limit', () => {
    for (const s of SETS) {
      expect(normalizeText(s.text)).toBe(s.text)
      expect([...s.text].length <= MAX_TEXT).toBe(true)
    }
  })

  it('finds the next set in the same stage', () => {
    expect(nextSet('consonant-1').id).toBe('consonant-2')
    expect(nextSet('vowel-2')).toBe(null)
    expect(nextSet('sentence-3')).toBe(null)
    expect(nextSet('nope')).toBe(null)
  })
})
