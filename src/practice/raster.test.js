import { describe, it, expect } from 'vitest'
import { gridFromImageData, strokesGrid } from './raster'
import { bbox } from './score'

const N = 64
const ink = (g, x, y) => g.data[y * N + x]

describe('raster', () => {
  it('keeps only pixels that are more than half covered', () => {
    const data = new Uint8ClampedArray(4 * 4 * 4)
    data[3] = 128 // (0,0)
    data[7] = 127 // (1,0)
    const g = gridFromImageData({ width: 4, height: 4, data })
    expect(g.data[0]).toBe(1)
    expect(g.data[1]).toBe(0)
    expect(g.w).toBe(4)
  })

  it('stamps a stroke with a fixed pen, ignoring pressure and width', () => {
    const a = strokesGrid([{ points: [[10, 50, 0.2, 0], [90, 50, 0.2, 9]], width: 1 }])
    const b = strokesGrid([{ points: [[10, 50, 1, 0], [90, 50, 1, 9]], width: 8 }])
    expect(Array.from(a.data)).toEqual(Array.from(b.data))
    expect(ink(a, 32, 32)).toBe(1)
    expect(ink(a, 32, 20)).toBe(0)
    const box = bbox(a)
    expect(box.height >= 2 && box.height <= 4).toBe(true)
    expect(box.minX <= 7 && box.maxX >= 56).toBe(true)
  })

  it('turns a single tap into a dot', () => {
    expect(bbox(strokesGrid([{ points: [[50, 50, 0.5, 0]] }])).count >= 1).toBe(true)
  })

  it('drops ink outside the cell without failing', () => {
    const g = strokesGrid([{ points: [[-50, 200, 0.5, 0], [50, 50, 0.5, 1], [400, -300, 0.5, 2]] }, { points: [] }])
    expect(ink(g, 32, 32)).toBe(1)
    expect(g.data.length).toBe(N * N)
  })
})
