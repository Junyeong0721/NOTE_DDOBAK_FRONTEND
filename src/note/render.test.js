import { describe, it, expect } from 'vitest'
import { GUIDE_SPACING, drawPage, strokeLineWidth } from './render'

// 캔버스 호출을 기록하는 가짜 2D 컨텍스트
function fakeCtx() {
  const calls = []
  const ctx = new Proxy({ calls }, {
    get(target, key) {
      if (key in target) return target[key]
      return (...args) => calls.push([key, ...args])
    },
    set(target, key, value) {
      calls.push([`set:${String(key)}`, value])
      return true
    },
  })
  return ctx
}

const stroke = (points, extra = {}) => ({ id: 's', t0: 0, color: '#222222', width: 2.4, points, transform: null, ...extra })

describe('render', () => {
  it('stroke width grows with pressure and scale', () => {
    expect(strokeLineWidth(2.4, 0.5, 1)).toBeCloseTo(2.4, 6)
    expect(strokeLineWidth(2.4, 1, 1)).toBeGreaterThan(strokeLineWidth(2.4, 0.2, 1))
    expect(strokeLineWidth(2.4, 0.5, 2)).toBeCloseTo(4.8, 6)
  })

  it('draws guide lines only when showGuides is on', () => {
    const off = fakeCtx()
    drawPage(off, { strokes: [], scale: 1, showGuides: false })
    const on = fakeCtx()
    drawPage(on, { strokes: [], scale: 1, showGuides: true })
    const moveCount = (c) => c.calls.filter(([k]) => k === 'moveTo').length
    expect(moveCount(off)).toBe(0)
    expect(moveCount(on)).toBe(Math.floor(1414 / GUIDE_SPACING))
  })

  it('draws a stroke in its color', () => {
    const ctx = fakeCtx()
    drawPage(ctx, { strokes: [stroke([[10, 10, 0.5, 0], [20, 20, 0.5, 8], [30, 10, 0.5, 16]], { color: '#d32f2f' })], scale: 1 })
    expect(ctx.calls.some(([k, v]) => k === 'set:strokeStyle' && v === '#d32f2f')).toBe(true)
    expect(ctx.calls.filter(([k]) => k === 'stroke').length).toBeGreaterThan(0)
  })

  it('draws a single-point stroke as a dot', () => {
    const ctx = fakeCtx()
    drawPage(ctx, { strokes: [stroke([[10, 10, 0.5, 0]])], scale: 1 })
    expect(ctx.calls.some(([k]) => k === 'arc')).toBe(true)
  })

  it('outlines text lines in blue and drawings in red when showLines is on', () => {
    const ctx = fakeCtx()
    const s1 = stroke([[100, 100, 0.5, 0], [140, 140, 0.5, 8]], { id: 'a' })
    const s2 = stroke([[300, 80, 0.5, 0], [500, 280, 0.5, 8]], { id: 'b' })
    drawPage(ctx, {
      strokes: [s1, s2], scale: 1, showLines: true,
      lines: [{ id: 'a', kind: 'text', strokeIds: ['a'] }, { id: 'b', kind: 'drawing', strokeIds: ['b'] }],
    })
    const rects = ctx.calls.filter(([k]) => k === 'strokeRect')
    expect(rects).toHaveLength(2)
    expect(ctx.calls.some(([k, v]) => k === 'set:strokeStyle' && v === '#1e5bd8')).toBe(true)
    expect(ctx.calls.some(([k, v]) => k === 'set:strokeStyle' && v === '#d32f2f')).toBe(true)
  })
})
