import { describe, it, expect } from 'vitest'
import { COVERED_RATIO, eraseGlyphs, glyphCell, glyphHit } from './glyphErase'

// 가운데 (100, 100), 크기 40인 글자
const glyph = (extra = {}) => ({ ch: '가', x: 100, y: 100, size: 40, maxWidth: null, color: '#000', fontId: 'f', group: 'c1', ref: { cid: 'c1', index: 0 }, cuts: null, ...extra })
const corrections = () => [{ id: 'c1', fontId: 'f', chars: [{ ch: '가', strokeIds: ['a', 'b'] }, { ch: '나', strokeIds: ['c'] }] }]

describe('glyph erasing', () => {
  it('uses the letter as it is shown on the page', () => {
    const cell = glyphCell(glyph())
    expect(cell.minX).toBeCloseTo(78, 6)
    expect(cell.maxX).toBeCloseTo(122, 6)
    expect(cell.minY).toBeCloseTo(76, 6)
    expect(cell.maxY).toBeCloseTo(124, 6)
    expect(glyphCell(glyph({ maxWidth: 30 })).maxX).toBeCloseTo(115, 6) // 좁은 간격이면 그만큼
    expect(glyphHit(glyph(), { x: 130, y: 100 }, { x: 130, y: 100 }, 10)).toBe(true)
    expect(glyphHit(glyph(), { x: 140, y: 100 }, { x: 140, y: 100 }, 10)).toBe(false)
  })

  it('remembers where the eraser passed, relative to the letter', () => {
    const r = eraseGlyphs(corrections(), [glyph()], { x: 100, y: 70 }, { x: 100, y: 130 }, 6)
    expect(r.changed).toBe(true)
    expect(r.removeStrokeIds).toEqual([])
    const cuts = r.corrections[0].chars[0].cuts
    expect(cuts.length).toBeGreaterThan(3)
    expect(cuts.every((c) => c.dx === 0 && c.r === 0.15)).toBe(true) // x 100 = 가운데, 반지름 6/40
    expect(Math.min(...cuts.map((c) => c.dy))).toBeLessThan(-0.5)
    expect(Math.max(...cuts.map((c) => c.dy))).toBeGreaterThan(0.5)
    expect(r.corrections[0].chars[1].cuts).toBeUndefined()
  })

  it('does nothing when the eraser misses every letter', () => {
    const cs = corrections()
    const r = eraseGlyphs(cs, [glyph()], { x: 300, y: 300 }, { x: 320, y: 300 }, 6)
    expect(r.changed).toBe(false)
    expect(r.corrections).toBe(cs)
  })

  it('removes a letter that is almost completely erased, together with its hidden strokes', () => {
    const r = eraseGlyphs(corrections(), [glyph()], { x: 70, y: 100 }, { x: 130, y: 100 }, 40)
    expect(r.corrections[0].chars.map((c) => c.ch)).toEqual(['나'])
    expect(r.removeStrokeIds).toEqual(['a', 'b'])
    expect(COVERED_RATIO).toBeGreaterThan(0.8)
  })
})
