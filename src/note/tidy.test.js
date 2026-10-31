import { describe, it, expect } from 'vitest'
import { strokeBBox, strokePoints } from './geometry'
import { groupLines } from './lines'
import { tidyPage, untidyPage } from './tidy'

const fakeStroke = (id, t0, minX, minY, maxX, maxY) => ({
  id, t0, color: '#222222', width: 2.4, transform: null,
  points: [[minX, minY, 0.5, 0], [maxX, maxY, 0.5, 10]],
})
const textLine = (prefix, t0, left, top, n) =>
  Array.from({ length: n }, (_, i) => fakeStroke(`${prefix}${i}`, t0 + i, left + i * 50, top, left + i * 50 + 40, top + 40))

// 오른쪽으로 갈수록 deg만큼 올라가는 줄 (아래끝이 한 직선 위)
const tiltedLine = (prefix, t0, deg, n = 5) => {
  const t = Math.tan((deg * Math.PI) / 180)
  return Array.from({ length: n }, (_, i) => {
    const bottom = 300 - t * (i * 50)
    return fakeStroke(`${prefix}${i}`, t0 + i, 100 + i * 50, bottom - 40, 140 + i * 50, bottom)
  })
}

const lineBox = (strokes, ids) => {
  const boxes = strokes.filter((s) => ids.includes(s.id)).map(strokeBBox)
  return {
    minX: Math.min(...boxes.map((b) => b.minX)), minY: Math.min(...boxes.map((b) => b.minY)),
    maxX: Math.max(...boxes.map((b) => b.maxX)), maxY: Math.max(...boxes.map((b) => b.maxY)),
  }
}

describe('tidyPage', () => {
  it('levels a tilted line', () => {
    const out = tidyPage(tiltedLine('a', 0, 5))
    const bottoms = out.map((s) => strokePoints(s)[1][1])
    expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThan(0.5)
  })

  it('does not rotate a line tilted more than 15 degrees', () => {
    const out = tidyPage(tiltedLine('a', 0, 30))
    expect(out.every((s) => (s.transform?.rotate ?? 0) === 0)).toBe(true)
  })

  it('leaves drawings untouched', () => {
    const circle = fakeStroke('circle', 10, 300, 80, 500, 280)
    const out = tidyPage([...tiltedLine('a', 0, 5), circle])
    const c = out.find((s) => s.id === 'circle')
    expect(c.transform).toBeNull()
    expect(c.points).toEqual(circle.points)
  })

  it('never changes original points', () => {
    const input = [...tiltedLine('a', 0, 5), ...textLine('b', 10, 112, 400, 3)]
    const before = JSON.parse(JSON.stringify(input.map((s) => s.points)))
    const out = tidyPage(input)
    expect(out.map((s) => s.points)).toEqual(before)
    expect(input.map((s) => s.points)).toEqual(before)
  })

  it('is idempotent', () => {
    const input = [...tiltedLine('a', 0, 5), ...textLine('b', 10, 112, 400, 3)]
    const once = tidyPage(input)
    const twice = tidyPage(once)
    expect(twice.map((s) => s.transform)).toEqual(once.map((s) => s.transform))
  })

  it('snaps nearly aligned left margins', () => {
    const input = [...textLine('a', 0, 100, 100, 3), ...textLine('b', 10, 112, 170, 3), ...textLine('c', 20, 95, 240, 3)]
    const out = tidyPage(input)
    const lefts = groupLines(input).map((l) => lineBox(out, l.strokeIds).minX)
    expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThan(0.5)
  })

  it('keeps a clearly indented line where it is', () => {
    const input = [...textLine('a', 0, 100, 100, 3), ...textLine('b', 10, 300, 170, 3)]
    const out = tidyPage(input)
    expect(lineBox(out, ['b0', 'b1', 'b2']).minX).toBeCloseTo(300, 3)
  })

  it('evens line spacing within a paragraph', () => {
    const input = [...textLine('a', 0, 100, 100, 3), ...textLine('b', 10, 100, 160, 3), ...textLine('c', 20, 100, 240, 3)]
    const out = tidyPage(input)
    const [a, b, c] = [['a0', 'a1', 'a2'], ['b0', 'b1', 'b2'], ['c0', 'c1', 'c2']].map((ids) => lineBox(out, ids))
    expect(a.minY).toBeCloseTo(100, 3)
    expect(Math.abs((b.minY - a.maxY) - (c.minY - b.maxY))).toBeLessThan(0.5)
  })

  it('does not pull lines across a drawing', () => {
    const input = [...textLine('a', 0, 100, 100, 3), fakeStroke('circle', 10, 100, 160, 300, 360), ...textLine('b', 20, 100, 400, 3)]
    const out = tidyPage(input)
    expect(lineBox(out, ['b0', 'b1', 'b2']).minY).toBeCloseTo(400, 3)
  })

  it('stores no transform for lines that are already tidy', () => {
    const out = tidyPage(textLine('a', 0, 100, 100, 3))
    expect(out.every((s) => s.transform === null)).toBe(true)
  })
})

describe('untidyPage', () => {
  it('clears every transform', () => {
    const out = untidyPage(tidyPage(tiltedLine('a', 0, 5)))
    expect(out.every((s) => s.transform === null)).toBe(true)
  })
})
