import { describe, it, expect } from 'vitest'
import { DEFAULT_TEXT_HEIGHT, LINE_IDLE_MS, groupLines, isLineEnd } from './lines'

// 대각선 두 점으로 bbox가 (minX,minY)-(maxX,maxY)인 획을 만든다.
const fakeStroke = (id, t0, minX, minY, maxX, maxY) => ({
  id, t0, color: '#222222', width: 2.4, transform: null,
  points: [[minX, minY, 0.5, 0], [maxX, maxY, 0.5, 10]],
})

// y 범위 [top, top+40], x는 left부터 50씩 오른쪽으로 n글자
const textLine = (prefix, t0, left, top, n) =>
  Array.from({ length: n }, (_, i) => fakeStroke(`${prefix}${i}`, t0 + i, left + i * 50, top, left + i * 50 + 40, top + 40))

describe('groupLines', () => {
  it('uses 40 page units as the default text height', () => {
    expect(DEFAULT_TEXT_HEIGHT).toBe(40)
  })

  it('groups strokes written left to right on one line', () => {
    const lines = groupLines(textLine('a', 0, 100, 100, 5))
    expect(lines).toHaveLength(1)
    expect(lines[0].kind).toBe('text')
    expect(lines[0].strokeIds).toEqual(['a0', 'a1', 'a2', 'a3', 'a4'])
    expect(lines[0].bbox).toEqual({ minX: 100, minY: 100, maxX: 340, maxY: 140 })
  })

  it('starts a new line when writing moves below, sorted top to bottom', () => {
    const strokes = [...textLine('b', 10, 100, 170, 3), ...textLine('a', 0, 100, 100, 3)]
    const lines = groupLines(strokes)
    expect(lines).toHaveLength(2)
    expect(lines[0].strokeIds).toEqual(['a0', 'a1', 'a2'])
    expect(lines[1].strokeIds).toEqual(['b0', 'b1', 'b2'])
  })

  it('keeps a 받침 written under the first part of a syllable on the same line', () => {
    const strokes = [
      fakeStroke('ㄱ', 1, 100, 100, 130, 120),
      fakeStroke('ㅏ', 2, 132, 100, 140, 125),
      fakeStroke('ㅇ', 3, 105, 126, 135, 140),
      fakeStroke('next', 4, 150, 100, 190, 140),
    ]
    const lines = groupLines(strokes)
    expect(lines).toHaveLength(1)
    expect(lines[0].strokeIds).toEqual(['ㄱ', 'ㅏ', 'ㅇ', 'next'])
  })

  it('classifies a tall stroke as a drawing and keeps the text line as text', () => {
    const strokes = [...textLine('a', 0, 100, 100, 3), fakeStroke('circle', 10, 300, 80, 500, 280)]
    const lines = groupLines(strokes)
    const circle = lines.find((l) => l.strokeIds.includes('circle'))
    const text = lines.find((l) => l.strokeIds.includes('a0'))
    expect(circle.kind).toBe('drawing')
    expect(circle.strokeIds).toEqual(['circle'])
    expect(text.kind).toBe('text')
    expect(text.strokeIds).toEqual(['a0', 'a1', 'a2'])
  })

  it('classifies a long thin underline as a drawing, not part of the text above', () => {
    const strokes = [...textLine('a', 0, 100, 100, 3), fakeStroke('underline', 10, 100, 145, 500, 151)]
    const lines = groupLines(strokes)
    expect(lines).toHaveLength(2)
    expect(lines.find((l) => l.strokeIds.includes('underline')).kind).toBe('drawing')
    expect(lines.find((l) => l.strokeIds.includes('a0')).strokeIds).toEqual(['a0', 'a1', 'a2'])
  })

  it('adds a later stroke back into an earlier line', () => {
    const strokes = [...textLine('a', 0, 100, 100, 5), ...textLine('b', 10, 100, 170, 3), fakeStroke('late', 20, 350, 100, 390, 140)]
    const lines = groupLines(strokes)
    expect(lines).toHaveLength(2)
    expect(lines[0].strokeIds).toEqual(['a0', 'a1', 'a2', 'a3', 'a4', 'late'])
  })

  it('ignores transforms when grouping (uses original positions)', () => {
    const strokes = textLine('a', 0, 100, 100, 3).map((s, i) => ({ ...s, transform: { dx: 0, dy: i * 100, rotate: 0, ox: 0, oy: 0 } }))
    expect(groupLines(strokes)).toHaveLength(1)
  })

  it('returns no lines for an empty page', () => {
    expect(groupLines([])).toEqual([])
  })
})

describe('isLineEnd', () => {
  const line = groupLines(textLine('a', 0, 100, 100, 3))[0]

  it('is true after the pen has been idle long enough', () => {
    expect(isLineEnd({ line, nextStroke: null, idleMs: LINE_IDLE_MS })).toBe(true)
  })

  it('is false while the pen is only briefly idle', () => {
    expect(isLineEnd({ line, nextStroke: null, idleMs: 1000 })).toBe(false)
  })

  it('is true when the next stroke starts below-left', () => {
    expect(isLineEnd({ line, nextStroke: fakeStroke('n', 9, 100, 170, 140, 210), idleMs: 300 })).toBe(true)
  })

  it('is false for the next letter on the same line', () => {
    expect(isLineEnd({ line, nextStroke: fakeStroke('n', 9, 250, 100, 290, 140), idleMs: 300 })).toBe(false)
  })
})

describe('groupLines with highlighter', () => {
  it('highlighter strokes are not grouped into lines', () => {
    const hl = { ...fakeStroke('hl', 5, 90, 110, 260, 130), tool: 'highlighter' }
    const lines = groupLines([...textLine('a', 0, 100, 100, 3), hl])
    expect(lines).toHaveLength(1)
    expect(lines[0].strokeIds).toEqual(['a0', 'a1', 'a2'])
  })
})
