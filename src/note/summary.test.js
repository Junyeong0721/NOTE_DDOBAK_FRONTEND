import { describe, it, expect } from 'vitest'
import { isSummaryStale, pagesToSummarize, summaryLines } from './summary'

const page = (n) => ({ strokes: Array.from({ length: n }, (_, i) => ({ id: `s${i}`, points: [] })), corrections: [] })

describe('note summary', () => {
  it('sends only pages with writing, at most ten', () => {
    expect(pagesToSummarize([page(0), page(2), page(0), page(1)])).toEqual([1, 3])
    expect(pagesToSummarize([page(0)])).toEqual([])
    expect(pagesToSummarize(Array.from({ length: 12 }, () => page(1)))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('splits the saved summary into lines', () => {
    expect(summaryLines('가\n 나 \n\n다')).toEqual(['가', '나', '다'])
    expect(summaryLines(null)).toEqual([])
  })

  it('knows when the note changed after the summary', () => {
    expect(isSummaryStale('2026-11-16T05:00:10Z', '2026-11-16T05:00:00Z')).toBe(true)
    expect(isSummaryStale('2026-11-16T05:00:01Z', '2026-11-16T05:00:00Z')).toBe(false) // 자동 저장 여유
    expect(isSummaryStale('2026-11-16T04:00:00Z', '2026-11-16T05:00:00Z')).toBe(false)
    expect(isSummaryStale('2026-11-16T05:00:00Z', null)).toBe(false)
  })
})
