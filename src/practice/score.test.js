import { describe, it, expect } from 'vitest'
import { bbox, emptyGrid, fMeasure, fitTo, scoreGlyph, scoreRound, scoreSet, shear } from './score'

const N = 64

/** 굵기 3 선분들을 모눈에 그린다. segs: [[x0,y0,x1,y1], ...] */
function draw(segs, { dx = 0, dy = 0, k = 1, pen = 3 } = {}) {
  const g = emptyGrid(N)
  const c = N / 2
  for (const [ax, ay, bx, by] of segs) {
    const x0 = (ax - c) * k + c + dx, y0 = (ay - c) * k + c + dy
    const x1 = (bx - c) * k + c + dx, y1 = (by - c) * k + c + dy
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1
    const r = (pen * k) / 2
    for (let i = 0; i <= steps; i++) {
      const px = x0 + ((x1 - x0) * i) / steps, py = y0 + ((y1 - y0) * i) / steps
      for (let y = Math.floor(py - r); y <= Math.ceil(py + r); y++) {
        for (let x = Math.floor(px - r); x <= Math.ceil(px + r); x++) {
          if (x >= 0 && y >= 0 && x < N && y < N && Math.hypot(x - px, y - py) <= r) g.data[y * N + x] = 1
        }
      }
    }
  }
  return g
}

// 'ㅏ': 세로 획 + 오른쪽 짧은 가로 획
const A = [[28, 14, 28, 50], [28, 32, 40, 32]]
// '가' 비슷한 모양: ㄱ + ㅏ
const GA = [[14, 18, 28, 18], [28, 18, 20, 44], [40, 12, 40, 52], [40, 32, 50, 32]]

describe('scoreGlyph', () => {
  it('gives a near-perfect score to the same ink', () => {
    expect(scoreGlyph(draw(A), draw(A)).total >= 95).toBe(true)
    expect(scoreGlyph(draw(GA), draw(GA)).total >= 95).toBe(true)
  })

  it('takes points only from position when the glyph is shifted', () => {
    const s = scoreGlyph(draw(GA), draw(GA, { dx: 12 }))
    expect(s.shape >= 45).toBe(true)
    expect(s.tilt >= 24).toBe(true)
    expect(s.position < 20).toBe(true)
  })

  it('takes points only from size when the glyph is twice as big', () => {
    const small = [[26, 24, 26, 40], [26, 32, 32, 32]]
    const s = scoreGlyph(draw(small), draw(small, { k: 2 }))
    expect(s.shape >= 40).toBe(true)
    expect(s.position <= 13).toBe(true)
    expect(s.tilt >= 24).toBe(true)
  })

  it('takes points only from tilt when the glyph leans', () => {
    const s = scoreGlyph(draw(GA), shear(draw(GA), 0.35))
    expect(s.tilt < 10).toBe(true)
    expect(s.shape >= 40).toBe(true)
    expect(s.position >= 20).toBe(true)
  })

  it('takes shape points when a stroke is missing', () => {
    const full = scoreGlyph(draw(GA), draw(GA))
    // ㅏ의 짧은 가로 획(잉크는 적지만 빠지면 다른 글자), ㄱ의 긴 획
    for (const mine of [draw(GA.slice(0, 3)), draw([GA[0], GA[2], GA[3]])]) {
      const s = scoreGlyph(draw(GA), mine)
      expect(s.shape < 40).toBe(true)
      expect(s.shape < full.shape - 10).toBe(true)
    }
  })

  it('takes shape points for an extra stroke', () => {
    const s = scoreGlyph(draw(GA), draw([...GA, [10, 50, 30, 54]]))
    expect(s.shape < 40).toBe(true)
  })

  it('scores a scribble low', () => {
    const scribble = [[8, 50, 56, 10], [10, 12, 54, 54], [8, 30, 56, 34], [30, 6, 34, 58]]
    expect(scoreGlyph(draw(GA), draw(scribble)).total < 40).toBe(true)
  })

  it('marks an unwritten cell and a glyph the font lacks', () => {
    expect(scoreGlyph(draw(GA), emptyGrid(N))).toEqual({ total: 0, shape: 0, position: 0, tilt: 0, empty: true, skipped: false })
    expect(scoreGlyph(emptyGrid(N), draw(GA)).skipped).toBe(true)
  })

  it('survives a single dot of ink', () => {
    const dot = emptyGrid(N)
    dot.data[30 * N + 30] = 1
    const s = scoreGlyph(draw(GA), dot)
    expect(Number.isFinite(s.total)).toBe(true)
    expect(s.total >= 0 && s.total <= 100).toBe(true)
    expect(s.total < 50).toBe(true)
  })

  it('always gives the same score for the same ink', () => {
    const mine = draw(GA, { dx: 3, dy: -2 })
    expect(scoreGlyph(draw(GA), mine)).toEqual(scoreGlyph(draw(GA), mine))
  })
})

describe('score helpers', () => {
  it('fits ink onto the target box', () => {
    const fitted = bbox(fitTo(draw(GA, { dx: 8, dy: 5 }), draw(GA)))
    const t = bbox(draw(GA))
    expect(Math.abs(fitted.mx - t.mx) <= 1).toBe(true)
    expect(Math.abs(fitted.height - t.height) <= 1).toBe(true)
  })

  it('measures overlap between 0 and 1', () => {
    expect(fMeasure(draw(A), draw(A))).toBe(1)
    expect(fMeasure(draw([[5, 5, 12, 5]]), draw([[40, 55, 58, 55]]))).toBe(0)
  })
})

describe('scoreSet', () => {
  const g = (total) => ({ total, shape: total / 2, position: total / 4, tilt: total / 4, empty: false, skipped: false })

  it('averages written and unwritten cells, skipping blanks and missing glyphs', () => {
    const empty = { total: 0, shape: 0, position: 0, tilt: 0, empty: true, skipped: false }
    const skipped = { ...empty, empty: false, skipped: true }
    expect(scoreSet([g(90), null, empty, skipped])).toEqual({ total: 45, shapePct: 45, positionPct: 45, tiltPct: 45, counted: 2 })
  })

  it('returns zeros when nothing can be scored', () => {
    expect(scoreSet([null]).counted).toBe(0)
  })
})

describe('scoreRound', () => {
  it('averages the questions of a round', () => {
    const q = (t) => ({ total: t, shapePct: t, positionPct: t - 10, tiltPct: t + 10, counted: 1 })
    expect(scoreRound([q(90), q(80), q(70), q(0), q(61)])).toEqual({ total: 60, shapePct: 60, positionPct: 50, tiltPct: 70 })
    expect(scoreRound([]).total).toBe(0)
  })
})
