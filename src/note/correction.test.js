import { describe, it, expect } from 'vitest'
import {
  buildCorrection, charGroupOf, correctedStrokeIds, correctionGlyphs, correctionText,
  pruneCorrections, removeCorrections, toggleChar, GLYPH_SCALE, SLOT_FILL, WORD_GAP,
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

  it('assigns strokes by height too, so a selection of two lines keeps two lines', () => {
    // 이미지 y 0~60 → 페이지 40~70 (윗줄), y 100~160 → 페이지 90~120 (아랫줄). 두 줄의 x가 겹친다
    const two = [st('u', 100, 45, 115, 65), st('d', 100, 95, 115, 115)]
    const result = { engine: 'google-vision', text: '가\n나', chars: [
      { ch: '나', x: 20, y: 100, w: 40, h: 60, confidence: 0.9 },
      { ch: '가', x: 20, y: 0, w: 40, h: 60, confidence: 0.9 },
    ] }
    const c = buildCorrection({ ocr: result, origin, strokes: two, fontId: 'f' })
    expect(c.chars.map((x) => `${x.ch}:${x.strokeIds}`)).toEqual(['가:u', '나:d']) // 윗줄 먼저
  })

  it('remembers where the recognized text had a space', () => {
    const strokes = [st('a', 100, 50, 110, 50), st('b', 135, 50, 145, 50), st('c', 165, 50, 170, 50)]
    const result = { engine: 'google-vision', text: '가나 다', chars: [box('가', 20, 40), box('나', 80, 40), box('다', 140, 20)] }
    const c = buildCorrection({ ocr: result, origin, strokes, fontId: 'f' })
    expect(c.chars.map((x) => !!x.sp)).toEqual([false, false, true])
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

  it('places glyphs on one straight line with one size and one width limit for the line', () => {
    const [g1, g2] = correctionGlyphs(strokes, cs)
    expect(g1).toEqual({ ch: '가', x: 105, y: 70, size: 40 * GLYPH_SCALE, maxWidth: 45 * SLOT_FILL, color: '#2563eb', fontId: 'gowun-dodum', group: 'c1', shared: true })
    expect(g2.x).toBe(150)
    expect(g2.y).toBe(70)
    expect(g2.maxWidth).toBe(g1.maxWidth)
    expect(g2.color).toBe('#1f2a44')
  })

  it('spaces the letters evenly between the first and the last', () => {
    // 가운데 105, 125, 185, 205 → 고르게 105, 138.3, 171.7, 205
    const uneven = [st('a', 100, 50, 110, 90), st('b', 120, 50, 130, 90), st('c', 180, 50, 190, 90), st('d', 200, 50, 210, 90)]
    const c = [corr(['가', '나', '다', '라'].map((ch, i) => ({ ch, strokeIds: [['a', 'b', 'c', 'd'][i]] })))]
    expect(correctionGlyphs(uneven, c).map((g) => Math.round(g.x * 10) / 10)).toEqual([105, 138.3, 171.7, 205])
  })

  it('keeps a word space where the recognized text had one', () => {
    // 가나 다라: 가운데 105, 145, 265, 305, '다' 앞에 띄어쓰기
    const words = [st('a', 100, 50, 110, 90), st('b', 140, 50, 150, 90), st('c', 260, 50, 270, 90), st('d', 300, 50, 310, 90)]
    const c = [corr(['가', '나', '다', '라'].map((ch, i) => ({ ch, strokeIds: [['a', 'b', 'c', 'd'][i]], ...(ch === '다' ? { sp: true } : {}) })))]
    const xs = correctionGlyphs(words, c).map((g) => g.x)
    const unit = 200 / (1 + WORD_GAP + 1)
    expect(xs.map((x) => Math.round(x))).toEqual([105, Math.round(105 + unit), Math.round(105 + unit * (1 + WORD_GAP)), 305])
  })

  it('gives lines of similar height the same size, but leaves a much bigger line alone', () => {
    const lines = [
      st('a', 100, 50, 110, 90), st('b', 140, 50, 150, 90), // 높이 40
      st('c', 100, 150, 110, 194), st('d', 140, 150, 150, 194), // 높이 44
      st('e', 100, 300, 110, 380), st('f', 140, 300, 150, 380), // 높이 80 (제목)
    ]
    const cs3 = [
      corr([{ ch: '가', strokeIds: ['a'] }, { ch: '나', strokeIds: ['b'] }], 'l1'),
      corr([{ ch: '다', strokeIds: ['c'] }, { ch: '라', strokeIds: ['d'] }], 'l2'),
      corr([{ ch: '제', strokeIds: ['e'] }, { ch: '목', strokeIds: ['f'] }], 'l3'),
    ]
    const sizes = correctionGlyphs(lines, cs3).map((g) => g.size)
    expect(sizes[0]).toBe(sizes[2])
    expect(sizes[0]).toBe(44 * GLYPH_SCALE) // 가운데 값(40, 44, 80 중 44)으로 맞춤
    expect(sizes[4]).toBe(80 * GLYPH_SCALE)
    expect(correctionGlyphs(lines, cs3).map((g) => g.shared)).toEqual([true, true, true, true, false, false])
  })

  it('draws every line in the font given by the settings when asked', () => {
    expect(correctionGlyphs(strokes, cs, { fontId: 'hi-melody' }).every((g) => g.fontId === 'hi-melody')).toBe(true)
  })

  it('follows the strokes when they are moved by a transform', () => {
    const moved = strokes.map((s) => ({ ...s, transform: { dx: 10, dy: -5, rotate: 0, ox: 0, oy: 0 } }))
    const [g1] = correctionGlyphs(moved, cs)
    expect(g1.x).toBe(115)
    expect(g1.y).toBe(65)
  })

  it('puts a slightly slanted line on one level line', () => {
    const slanted = [st('a1', 100, 50, 110, 90), st('b1', 140, 60, 160, 100), st('c1', 190, 70, 210, 110)]
    const g = correctionGlyphs(slanted, [corr([{ ch: '가', strokeIds: ['a1'] }, { ch: '나', strokeIds: ['b1'] }, { ch: '다', strokeIds: ['c1'] }])])
    expect(g.map((x) => x.y)).toEqual([80, 80, 80])
  })

  it('keeps two written lines as two lines even inside one correction', () => {
    // 윗줄 가나(y 50~90), 아랫줄 다라마(y 150~190)
    const two = [st('a', 100, 50, 110, 90), st('b', 140, 50, 150, 90), st('c', 100, 150, 110, 190), st('d', 140, 150, 150, 190), st('e', 180, 150, 190, 190)]
    const c = [corr(['가', '나', '다', '라', '마'].map((ch, i) => ({ ch, strokeIds: [['a', 'b', 'c', 'd', 'e'][i]] })))]
    const g = correctionGlyphs(two, c)
    expect(g.map((x) => `${x.ch}${x.y}`)).toEqual(['가70', '나70', '다170', '라170', '마170'])
    expect(g[0].size).toBe(40 * GLYPH_SCALE) // 두 줄 전체 높이가 아니라 한 줄 높이
    expect(new Set(g.map((x) => x.group)).size).toBe(2)
  })

  it('lines up the left edges of lines that start at about the same place', () => {
    // 첫 글자 왼쪽 끝: 100, 112(→100으로), 300(멀어서 그대로)
    const rows = [
      st('a', 100, 50, 110, 90), st('b', 140, 50, 150, 90),
      st('c', 112, 150, 122, 190), st('d', 152, 150, 162, 190),
      st('e', 300, 250, 310, 290), st('f', 340, 250, 350, 290),
    ]
    const cs3 = [
      corr([{ ch: '가', strokeIds: ['a'] }, { ch: '나', strokeIds: ['b'] }], 'r1'),
      corr([{ ch: '다', strokeIds: ['c'] }, { ch: '라', strokeIds: ['d'] }], 'r2'),
      corr([{ ch: '마', strokeIds: ['e'] }, { ch: '바', strokeIds: ['f'] }], 'r3'),
    ]
    const xs = correctionGlyphs(rows, cs3).map((g) => g.x)
    expect(xs).toEqual([105, 145, 105, 145, 305, 345])
  })

  it('has no width limit for a single character', () => {
    const [g] = correctionGlyphs(strokes, [corr([{ ch: '가', strokeIds: ['a1'] }])])
    expect(g.maxWidth).toBeNull()
  })

  it('keeps the place of a letter set back to the original, and skips letters with missing strokes', () => {
    const three = [...strokes, st('c1', 190, 50, 200, 90)]
    const withOff = [corr([{ ch: '가', strokeIds: ['a1'] }, { ch: '나', strokeIds: ['b1'], off: true }, { ch: '다', strokeIds: ['c1'] }])]
    expect(correctionGlyphs(three, withOff).map((g) => [g.ch, g.x])).toEqual([['가', 105], ['다', 195]])
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
