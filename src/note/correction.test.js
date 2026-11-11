import { describe, it, expect } from 'vitest'
import {
  buildCorrection, charGroupOf, correctedStrokeIds, correctionGlyphs, correctionText,
  pruneCorrections, removeCorrections, toggleChar, GLYPH_SCALE,
} from './correction'

// (x0,y0)→(x1,y1) 직선 획
const st = (id, x0, y0, x1, y1, extra = {}) => ({
  id, t0: 0, color: '#1f2a44', width: 2.4, transform: null,
  points: [[x0, y0, 0.5, 0], [x1, y1, 0.5, 10]], ...extra,
})

// 줄 이미지: 페이지 (90, 40)에서 시작, 2배로 그림 → 이미지 x = (페이지 x - 90) * 2
const origin = { minX: 90, minY: 40, fit: 2 }
const ocr = (chars) => ({ engine: 'google-vision', text: chars.map((c) => c.ch).join(''), chars })
const box = (ch, x, w) => ({ ch, x, y: 10, w, h: 60, confidence: 0.9 })

describe('buildCorrection', () => {
  it('maps OCR boxes back to the page and assigns each stroke to its character', () => {
    const strokes = [st('a1', 100, 50, 110, 50), st('a2', 112, 45, 118, 70), st('b1', 135, 50, 145, 70)]
    // '가' 이미지 x 20~60 → 페이지 100~120, '나' 이미지 80~120 → 페이지 130~150
    const c = buildCorrection({ ocr: ocr([box('가', 20, 40), box('나', 80, 40)]), origin, strokes, fontId: 'gowun-dodum' })
    expect(c.fontId).toBe('gowun-dodum')
    expect(typeof c.id).toBe('string')
    expect(c.chars).toEqual([{ ch: '가', strokeIds: ['a1', 'a2'] }, { ch: '나', strokeIds: ['b1'] }])
  })

  it('puts a stroke outside every box into the nearest character and drops characters with no strokes', () => {
    const strokes = [st('a1', 100, 50, 110, 50), st('x', 122, 50, 124, 60)]
    // '나'(페이지 130~150)와 '다'(160~170)는 획이 없다, x(가운데 123)는 '가'(100~120)와 '나' 중 더 가까운 '가'로
    const c = buildCorrection({ ocr: ocr([box('가', 20, 40), box('나', 80, 40), box('다', 140, 20)]), origin, strokes, fontId: 'f' })
    expect(c.chars.map((x) => x.ch)).toEqual(['가'])
    expect(c.chars[0].strokeIds).toEqual(['a1', 'x'])
  })

  it('sorts characters left to right and ignores blank symbols', () => {
    const strokes = [st('a', 100, 50, 110, 50), st('b', 135, 50, 145, 50)]
    const c = buildCorrection({ ocr: ocr([box('나', 80, 40), box(' ', 60, 10), box('가', 20, 40)]), origin, strokes, fontId: 'f' })
    expect(correctionText(c)).toBe('가나')
  })

  it('ignores highlighter strokes and returns null when nothing was recognized', () => {
    const hl = st('h', 100, 50, 150, 50, { tool: 'highlighter' })
    expect(buildCorrection({ ocr: ocr([box('가', 20, 40)]), origin, strokes: [hl], fontId: 'f' })).toBeNull()
    expect(buildCorrection({ ocr: ocr([]), origin, strokes: [st('a', 100, 50, 110, 50)], fontId: 'f' })).toBeNull()
  })
})

const corr = (chars, id = 'c1') => ({ id, fontId: 'gowun-dodum', chars })

describe('corrected strokes', () => {
  it('hides strokes of active characters only', () => {
    const cs = [corr([{ ch: '가', strokeIds: ['a1', 'a2'] }, { ch: '나', strokeIds: ['b1'], off: true }])]
    expect([...correctedStrokeIds(cs)].sort()).toEqual(['a1', 'a2'])
    expect(correctedStrokeIds(undefined).size).toBe(0)
  })

  it('finds the stroke group of a corrected character', () => {
    const cs = [corr([{ ch: '가', strokeIds: ['a1', 'a2'] }, { ch: '나', strokeIds: ['b1'], off: true }])]
    expect(charGroupOf(cs, 'a2')).toEqual(['a1', 'a2'])
    expect(charGroupOf(cs, 'b1')).toBeNull()
    expect(charGroupOf(cs, 'zz')).toBeNull()
  })
})

describe('correctionGlyphs', () => {
  const strokes = [
    st('a1', 100, 50, 110, 90, { color: '#2563eb' }), // 가: x 100~110, y 50~90
    st('b1', 140, 50, 160, 90), // 나: x 140~160
  ]
  const cs = [corr([{ ch: '가', strokeIds: ['a1'] }, { ch: '나', strokeIds: ['b1'] }])]

  it('places each glyph at the center of its strokes with one size for the line', () => {
    const [g1, g2] = correctionGlyphs(strokes, cs)
    expect(g1).toEqual({ ch: '가', x: 105, y: 70, size: 40 * GLYPH_SCALE, color: '#2563eb', fontId: 'gowun-dodum' })
    expect(g2.x).toBe(150)
    expect(g2.y).toBe(70)
    expect(g2.color).toBe('#1f2a44')
  })

  it('follows the strokes when they are moved by a transform', () => {
    const moved = strokes.map((s) => ({ ...s, transform: { dx: 10, dy: -5, rotate: 0, ox: 0, oy: 0 } }))
    const [g1] = correctionGlyphs(moved, cs)
    expect(g1.x).toBe(115)
    expect(g1.y).toBe(65)
  })

  it('fits a straight line through the characters of a slanted line', () => {
    const slanted = [st('a1', 100, 50, 110, 90), st('b1', 140, 60, 160, 100), st('c1', 190, 70, 210, 110)]
    const g = correctionGlyphs(slanted, [corr([{ ch: '가', strokeIds: ['a1'] }, { ch: '나', strokeIds: ['b1'] }, { ch: '다', strokeIds: ['c1'] }])])
    expect(g.map((x) => Math.round(x.y))).toEqual([70, 80, 90])
  })

  it('skips characters set back to the original and characters with missing strokes', () => {
    const cs2 = [corr([{ ch: '가', strokeIds: ['a1'], off: true }, { ch: '나', strokeIds: ['b1', 'gone'] }])]
    expect(correctionGlyphs(strokes, cs2)).toEqual([])
  })
})

describe('editing corrections', () => {
  const cs = [corr([{ ch: '가', strokeIds: ['a1'] }, { ch: '나', strokeIds: ['b1'] }]), corr([{ ch: '다', strokeIds: ['c1'] }], 'c2')]

  it('toggles one character between corrected and original', () => {
    const once = toggleChar(cs, 'c1', 1)
    expect(once[0].chars[1].off).toBe(true)
    expect(toggleChar(once, 'c1', 1)[0].chars[1].off).toBeUndefined()
    expect(cs[0].chars[1].off).toBeUndefined() // 원본은 그대로
  })

  it('removes whole corrections that touch the given strokes', () => {
    expect(removeCorrections(cs, ['b1']).map((c) => c.id)).toEqual(['c2'])
    expect(removeCorrections(cs, ['zz'])).toHaveLength(2)
  })

  it('drops characters whose strokes were deleted, and empty corrections', () => {
    const strokes = [st('a1', 0, 0, 1, 1)]
    const pruned = pruneCorrections(cs, strokes)
    expect(pruned).toEqual([corr([{ ch: '가', strokeIds: ['a1'] }])])
  })

  it('keeps the same array when nothing changed', () => {
    const strokes = ['a1', 'b1', 'c1'].map((id) => st(id, 0, 0, 1, 1))
    expect(pruneCorrections(cs, strokes)).toBe(cs)
  })
})
