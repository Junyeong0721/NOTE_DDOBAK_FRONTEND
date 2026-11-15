import { describe, it, expect } from 'vitest'
import { buildAttemptBody, canGrade, glyphLabel, pickInput, resultFromAttempt, writtenFlags } from './board'
import { layoutCells } from './cells'

const stroke = { id: 's1', points: [[10, 10, 0.5, 0], [20, 20, 0.5, 5]] }
const g = (total, extra = {}) => ({ total, shape: total / 2 + 0.04, position: total / 4, tilt: total / 4, empty: false, skipped: false, ...extra })
const setScore = (t) => ({ total: t, shapePct: t + 1, positionPct: t + 2, tiltPct: t + 3, counted: 1 })

describe('practice input', () => {
  it('ignores fingers once a pen has been used', () => {
    expect(pickInput(false, 'touch')).toEqual({ accept: true, sawPen: false })
    expect(pickInput(false, 'mouse')).toEqual({ accept: true, sawPen: false })
    expect(pickInput(false, 'pen')).toEqual({ accept: true, sawPen: true })
    expect(pickInput(true, 'touch')).toEqual({ accept: false, sawPen: true })
    expect(pickInput(true, 'pen')).toEqual({ accept: true, sawPen: true })
  })

  it('allows grading only with a loaded font and some writing in any question', () => {
    expect(canGrade([], true)).toBe(false)
    expect(canGrade([[], [[], undefined]], true)).toBe(false)
    expect(canGrade([[], [undefined, [stroke]]], false)).toBe(false) // 글꼴을 받기 전
    expect(canGrade([[], [undefined, [stroke]]], true, true)).toBe(false) // 채점 중 (연타 방지)
    expect(canGrade([[], [undefined, [stroke]]], true)).toBe(true)
  })

  it('tells which questions have writing', () => {
    expect(writtenFlags([[[stroke]], [], undefined, [[], [stroke]]], 5)).toEqual([true, false, false, true, false])
  })
})

describe('attempt body', () => {
  it('sends every question with its strokes and scores, blanks as null', () => {
    const q1 = { text: '강의 실', cells: layoutCells('강의 실'), cellStrokes: [[stroke]], glyphScores: [g(80), g(0, { empty: true }), null, g(0, { empty: true })], score: setScore(27) }
    const q2 = { text: '과제', cells: layoutCells('과제'), cellStrokes: [[stroke], [stroke]], glyphScores: [g(90), g(70)], score: setScore(80) }
    const body = buildAttemptBody({
      stage: 'word', fontId: 'hi-melody', guide: false, questions: [q1, q2],
      round: { total: 54, shapePct: 55, positionPct: 56, tiltPct: 57 },
      image: 'data:image/png;base64,AAA',
    })
    expect(body.stage).toBe('word')
    expect(body.fontLabel).toBe('하이멜로디')
    expect(body.items.length).toBe(2)
    expect(body.items[0].text).toBe('강의 실')
    expect(body.items[0].cells).toEqual([{ ch: '강', strokes: [stroke] }, { ch: '의', strokes: [] }, null, { ch: '실', strokes: [] }])
    expect(body.items[0].charScores[0]).toEqual({ total: 80, shape: 40, position: 20, tilt: 20, empty: false, skipped: false })
    expect(body.items[0].charScores[2]).toBe(null)
    expect(body.items[1].score).toEqual({ total: 80, shape: 81, position: 82, tilt: 83 })
    expect([body.totalScore, body.shapeScore, body.positionScore, body.tiltScore]).toEqual([54, 55, 56, 57])
    expect(body.guide).toBe(false)
    expect(body.image).toBe('data:image/png;base64,AAA')
  })

  it('turns a saved round back into a result', () => {
    const r = resultFromAttempt({
      id: 3, stage: 'syllable', text: '강\n물', fontId: 'gowun-dodum', guide: true,
      items: [
        { text: '강', cells: [{ ch: '강', strokes: [stroke] }], charScores: [g(80)], score: { total: 80 } },
        { text: '물', cells: [{ ch: '물', strokes: [] }], charScores: [g(0, { empty: true })], score: { total: 0 } },
      ],
      totalScore: 40, shapeScore: 41, positionScore: 42, tiltScore: 43, advice: null, adviceStatus: 'UNAVAILABLE',
    })
    expect(r.questions.map((q) => q.text)).toEqual(['강', '물'])
    expect(r.questions[0].cellStrokes).toEqual([[stroke]])
    expect(r.questions[1].score.total).toBe(0)
    expect(r.round.total).toBe(40)
    expect(r.adviceState).toBe('unavailable')
    expect(resultFromAttempt({ items: [], advice: '곧게', adviceStatus: 'OK' }).adviceState).toBe('ok')
  })

  it('labels each glyph', () => {
    expect(glyphLabel(g(73))).toBe('73점')
    expect(glyphLabel(g(0, { empty: true }))).toBe('안 씀')
    expect(glyphLabel(g(0, { skipped: true }))).toBe('–')
    expect(glyphLabel(null)).toBe('–')
  })
})
