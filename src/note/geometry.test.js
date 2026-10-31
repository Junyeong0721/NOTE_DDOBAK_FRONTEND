import { describe, it, expect } from 'vitest'
import { applyTransform, clientToPage, rawBBox, strokeBBox, strokePoints } from './geometry'

const stroke = (points, transform = null) => ({ id: 's', t0: 0, color: '#000', width: 2, points, transform })

describe('geometry', () => {
  it('applyTransform with null returns the same point', () => {
    expect(applyTransform([3, 4], null)).toEqual([3, 4])
  })

  it('applyTransform rotates around the origin point then translates', () => {
    const [x, y] = applyTransform([10, 0], { dx: 5, dy: 0, rotate: Math.PI / 2, ox: 0, oy: 0 })
    expect(x).toBeCloseTo(5, 6)
    expect(y).toBeCloseTo(10, 6)
  })

  it('applyTransform rotates around a non-zero origin', () => {
    const [x, y] = applyTransform([20, 10], { dx: 0, dy: 0, rotate: Math.PI, ox: 10, oy: 10 })
    expect(x).toBeCloseTo(0, 6)
    expect(y).toBeCloseTo(10, 6)
  })

  it('strokePoints applies the transform and keeps pressure', () => {
    const pts = strokePoints(stroke([[1, 2, 0.3, 0]], { dx: 10, dy: 20, rotate: 0, ox: 0, oy: 0 }))
    expect(pts).toEqual([[11, 22, 0.3]])
  })

  it('strokeBBox uses transformed points, rawBBox ignores the transform', () => {
    const s = stroke([[0, 0, 0.5, 0], [10, 5, 0.5, 8]], { dx: 100, dy: 0, rotate: 0, ox: 0, oy: 0 })
    expect(strokeBBox(s)).toEqual({ minX: 100, minY: 0, maxX: 110, maxY: 5 })
    expect(rawBBox(s)).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 5 })
  })

  it('clientToPage converts screen pixels to page units', () => {
    expect(clientToPage(150, 100, { left: 100, top: 50, width: 500, height: 707 })).toEqual({ x: 100, y: 100 })
  })
})

describe('hitStroke', () => {
  it('hits a point near a segment, not only near its end points', async () => {
    const { hitStroke } = await import('./geometry')
    const s = stroke([[0, 0, 0.5, 0], [100, 0, 0.5, 8]])
    expect(hitStroke(s, { x: 50, y: 6 }, 10)).toBe(true)
    expect(hitStroke(s, { x: 50, y: 20 }, 10)).toBe(false)
  })

  it('uses the transformed position', async () => {
    const { hitStroke } = await import('./geometry')
    const s = stroke([[0, 0, 0.5, 0], [100, 0, 0.5, 8]], { dx: 0, dy: 200, rotate: 0, ox: 0, oy: 0 })
    expect(hitStroke(s, { x: 50, y: 200 }, 10)).toBe(true)
    expect(hitStroke(s, { x: 50, y: 0 }, 10)).toBe(false)
  })

  it('hits a single-point stroke', async () => {
    const { hitStroke } = await import('./geometry')
    expect(hitStroke(stroke([[10, 10, 0.5, 0]]), { x: 14, y: 13 }, 10)).toBe(true)
  })
})
