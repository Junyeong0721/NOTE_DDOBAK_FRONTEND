import { describe, it, expect } from 'vitest'
import { eraseAlong } from './erase'

// (x0,y) → (x1,y) 가로 획, 점 간격 step
const line = (id, x0, x1, y = 100, step = 10, extra = {}) => {
  const points = []
  for (let x = x0, t = 0; x <= x1; x += step, t += 10) points.push([x, y, 0.5, t])
  return { id, t0: 0, color: '#1f2a44', width: 2.4, transform: null, points, ...extra }
}
const xs = (s) => s.points.map((p) => p[0])

describe('eraseAlong (partial eraser)', () => {
  it('cuts a stroke in two where the eraser passed over the middle', () => {
    const { strokes, changed } = eraseAlong([line('a', 0, 200)], { x: 100, y: 90 }, { x: 100, y: 110 }, 10)
    expect(changed).toBe(true)
    expect(strokes).toHaveLength(2)
    expect(Math.max(...xs(strokes[0]))).toBeLessThan(91)
    expect(Math.min(...xs(strokes[1]))).toBeGreaterThan(109)
    expect(strokes[0].id).not.toBe('a')
    expect(strokes[0].id).not.toBe(strokes[1].id)
    expect(strokes[0].color).toBe('#1f2a44')
  })

  it('cuts precisely even when the stroke points are far apart', () => {
    const sparse = line('a', 0, 200, 100, 100) // 점 3개: 0, 100, 200
    const { strokes } = eraseAlong([sparse], { x: 50, y: 100 }, { x: 50, y: 100 }, 5)
    expect(strokes).toHaveLength(2)
    expect(Math.max(...xs(strokes[0]))).toBeGreaterThan(40)
    expect(Math.max(...xs(strokes[0]))).toBeLessThan(46)
    expect(Math.min(...xs(strokes[1]))).toBeLessThan(60)
  })

  it('shortens a stroke from its end', () => {
    const { strokes } = eraseAlong([line('a', 0, 200)], { x: 195, y: 100 }, { x: 260, y: 100 }, 10)
    expect(strokes).toHaveLength(1)
    expect(Math.max(...xs(strokes[0]))).toBeLessThan(186)
  })

  it('removes a stroke completely when the eraser covers it, and leaves no specks', () => {
    const short = line('a', 100, 110, 100, 1)
    expect(eraseAlong([short], { x: 105, y: 100 }, { x: 105, y: 100 }, 8).strokes).toEqual([])
    const dot = { id: 'd', t0: 0, color: '#000', width: 2, transform: null, points: [[50, 50, 0.5, 0]] }
    expect(eraseAlong([dot], { x: 52, y: 50 }, { x: 52, y: 50 }, 5).strokes).toEqual([])
  })

  it('keeps the same strokes when nothing was touched', () => {
    const strokes = [line('a', 0, 200)]
    const r = eraseAlong(strokes, { x: 100, y: 300 }, { x: 120, y: 300 }, 10)
    expect(r.changed).toBe(false)
    expect(r.strokes).toBe(strokes)
  })

  it('erases where the stroke is shown, keeping its transform on the pieces', () => {
    const moved = line('a', 0, 200, 100, 10, { transform: { dx: 0, dy: 50, rotate: 0, ox: 0, oy: 0 } }) // 화면에서는 y 150
    expect(eraseAlong([moved], { x: 100, y: 100 }, { x: 100, y: 100 }, 10).changed).toBe(false)
    const { strokes } = eraseAlong([moved], { x: 100, y: 150 }, { x: 100, y: 150 }, 10)
    expect(strokes).toHaveLength(2)
    expect(strokes[0].transform).toEqual(moved.transform)
    expect(strokes[0].points[0][1]).toBe(100) // 원래 좌표는 그대로
  })

  it('removes whole corrected letters instead of cutting their hidden strokes', () => {
    const a = line('a', 0, 40)
    const b = line('b', 0, 40, 120)
    const c = line('c', 300, 400)
    const groupOf = (id) => (id === 'a' || id === 'b' ? ['a', 'b'] : null)
    const { strokes } = eraseAlong([a, b, c], { x: 20, y: 100 }, { x: 20, y: 100 }, 5, groupOf)
    expect(strokes.map((s) => s.id)).toEqual(['c'])
  })
})
