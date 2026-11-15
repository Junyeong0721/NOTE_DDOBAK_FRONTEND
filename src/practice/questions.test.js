import { describe, it, expect } from 'vitest'
import { POOLS, ROUND_SIZE, STAGES, drawRound, stageById } from './questions'
import { isHangul } from './cells'

/** 같은 수열을 내는 난수 (테스트용) */
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

describe('practice questions', () => {
  it('has only three stages', () => {
    expect(STAGES.map((s) => s.id)).toEqual(['syllable', 'word', 'sentence'])
    expect(stageById('word').label).toBe('단어')
    expect(stageById('jamo')).toBe(null)
  })

  it('has enough questions, all unique Hangul', () => {
    expect(POOLS.syllable.length >= 150).toBe(true)
    expect(POOLS.word.length >= 100).toBe(true)
    expect(POOLS.sentence.length >= 50).toBe(true)
    for (const [stage, pool] of Object.entries(POOLS)) {
      expect(new Set(pool).size).toBe(pool.length)
      for (const q of pool) {
        expect([...q].every((ch) => ch === ' ' || isHangul(ch))).toBe(true)
        expect(q).toBe(q.trim())
        const n = [...q].length
        if (stage === 'syllable') expect(n).toBe(1)
        if (stage === 'word') expect(n >= 2 && n <= 5).toBe(true)
        if (stage === 'sentence') expect(n >= 8 && n <= 15).toBe(true)
      }
    }
  })

  it('draws five different questions from the stage', () => {
    for (const stage of ['syllable', 'word', 'sentence']) {
      const round = drawRound(stage, { random: seeded(7) })
      expect(round.length).toBe(ROUND_SIZE)
      expect(new Set(round).size).toBe(ROUND_SIZE)
      expect(round.every((q) => POOLS[stage].includes(q))).toBe(true)
    }
  })

  it('avoids the previous round', () => {
    const first = drawRound('sentence', { random: seeded(1) })
    for (let seed = 2; seed < 40; seed++) {
      const next = drawRound('sentence', { avoid: first, random: seeded(seed) })
      expect(next.some((q) => first.includes(q))).toBe(false)
    }
  })

  it('is random but repeatable with the same random source', () => {
    expect(drawRound('word', { random: seeded(3) })).toEqual(drawRound('word', { random: seeded(3) }))
    const seen = new Set()
    for (let seed = 1; seed < 30; seed++) seen.add(drawRound('word', { random: seeded(seed) }).join())
    expect(seen.size > 20).toBe(true)
  })

  it('still fills a round when almost everything is avoided', () => {
    const round = drawRound('sentence', { avoid: POOLS.sentence.slice(0, 48), random: seeded(5) })
    expect(new Set(round).size).toBe(ROUND_SIZE)
    expect(() => drawRound('jamo')).toThrow()
  })
})
