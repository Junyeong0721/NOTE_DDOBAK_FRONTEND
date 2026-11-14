import { describe, it, expect } from 'vitest'
import { buildAttemptBody, canGrade, glyphLabel, pickInput, resultFromAttempt } from './board'
import { layoutCells } from './cells'

const stroke = { id: 's1', points: [[10, 10, 0.5, 0], [20, 20, 0.5, 5]] }
const g = (total, extra = {}) => ({ total, shape: total / 2 + 0.04, position: total / 4, tilt: total / 4, empty: false, skipped: false, ...extra })

describe('practice input', () => {
  it('ignores fingers once a pen has been used', () => {
    expect(pickInput(false, 'touch')).toEqual({ accept: true, sawPen: false })
    expect(pickInput(false, 'mouse')).toEqual({ accept: true, sawPen: false })
    expect(pickInput(false, 'pen')).toEqual({ accept: true, sawPen: true })
    expect(pickInput(true, 'touch')).toEqual({ accept: false, sawPen: true })
    expect(pickInput(true, 'pen')).toEqual({ accept: true, sawPen: true })
  })

  it('allows grading only with a loaded font and some writing', () => {
    const cells = layoutCells('가 나')
    expect(canGrade(cells, [], true)).toBe(false)
    expect(canGrade(cells, [[], undefined, []], true)).toBe(false)
    expect(canGrade(cells, [[stroke]], false)).toBe(false) // 글꼴을 받기 전
    expect(canGrade(cells, [[stroke]], true, true)).toBe(false) // 채점 중 (연타 방지)
    expect(canGrade(cells, [[stroke]], true)).toBe(true)
  })
})

describe('attempt body', () => {
  it('pairs every character with its strokes and score, blanks as null', () => {
    const cells = layoutCells('가 나')
    const body = buildAttemptBody({
      setId: 'syllable-1', text: '가 나', fontId: 'hi-melody', guide: false, cells,
      cellStrokes: [[stroke]],
      glyphScores: [g(80), null, g(0, { empty: true })],
      setScore: { total: 40, shapePct: 41, positionPct: 42, tiltPct: 43, counted: 2 },
      image: 'data:image/png;base64,AAA',
    })
    expect(body.cells.length).toBe([...body.text].length)
    expect(body.cells).toEqual([{ ch: '가', strokes: [stroke] }, null, { ch: '나', strokes: [] }])
    expect(body.charScores[0]).toEqual({ total: 80, shape: 40, position: 20, tilt: 20, empty: false, skipped: false })
    expect(body.charScores[1]).toBe(null)
    expect(body.charScores[2].empty).toBe(true)
    expect(body.fontLabel).toBe('하이멜로디')
    expect(body.setId).toBe('syllable-1')
    expect([body.totalScore, body.shapeScore, body.positionScore, body.tiltScore]).toEqual([40, 41, 42, 43])
    expect(body.guide).toBe(false)
  })

  it('turns a saved attempt back into a result', () => {
    const r = resultFromAttempt({
      id: 3, setId: null, text: '가 나', fontId: 'gowun-dodum', guide: true,
      cells: [{ ch: '가', strokes: [stroke] }, null, { ch: '나', strokes: [] }],
      charScores: [g(80), null, g(0, { empty: true })],
      totalScore: 40, shapeScore: 41, positionScore: 42, tiltScore: 43, advice: null, adviceStatus: 'UNAVAILABLE',
    })
    expect(r.cellStrokes).toEqual([[stroke], [], []])
    expect(r.setScore.total).toBe(40)
    expect(r.adviceState).toBe('unavailable')
    expect(resultFromAttempt({ text: '가', cells: [null], charScores: [null], advice: '곧게', adviceStatus: 'OK' }).adviceState).toBe('ok')
  })

  it('labels each glyph', () => {
    expect(glyphLabel(g(73))).toBe('73점')
    expect(glyphLabel(g(0, { empty: true }))).toBe('안 씀')
    expect(glyphLabel(g(0, { skipped: true }))).toBe('–')
    expect(glyphLabel(null)).toBe('–')
  })
})
