import { describe, it, expect } from 'vitest'
import { strokeBBox, strokePoints } from './geometry'
import {
  RESIZE_MIN, deleteStrokes, handleAt, moveStrokes, pointInPolygon, resizeFactor, resizeStrokes, selectStrokes, selectionBBox, selectionHandles, setStrokesKind,
} from './lasso'
import { groupLines } from './lines'
import { tidyPage } from './tidy'

const fakeStroke = (id, t0, minX, minY, maxX, maxY, extra = {}) => ({
  id, t0, color: '#1f2a44', width: 2.4, transform: null,
  points: [[minX, minY, 0.5, 0], [(minX + maxX) / 2, (minY + maxY) / 2, 0.5, 5], [maxX, maxY, 0.5, 10]],
  ...extra,
})
const square = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const tiltedLine = (prefix, t0, deg, n = 5) => {
  const t = Math.tan((deg * Math.PI) / 180)
  return Array.from({ length: n }, (_, i) => {
    const bottom = 300 - t * (i * 50)
    return fakeStroke(`${prefix}${i}`, t0 + i, 100 + i * 50, bottom - 40, 140 + i * 50, bottom)
  })
}

describe('pointInPolygon', () => {
  it('detects inside and outside', () => {
    const poly = square(0, 0, 100, 100)
    expect(pointInPolygon([50, 50], poly)).toBe(true)
    expect(pointInPolygon([150, 50], poly)).toBe(false)
  })

  it('handles a concave (U-shaped) lasso', () => {
    const u = [[0, 0], [30, 0], [30, 70], [70, 70], [70, 0], [100, 0], [100, 100], [0, 100]]
    expect(pointInPolygon([50, 30], u)).toBe(false)
    expect(pointInPolygon([15, 30], u)).toBe(true)
  })
})

describe('selectStrokes', () => {
  const strokes = [fakeStroke('in', 0, 10, 10, 40, 40), fakeStroke('out', 1, 200, 200, 240, 240), fakeStroke('half', 2, 80, 10, 160, 40)]

  it('selects strokes mostly inside the lasso and ignores strokes mostly outside', () => {
    expect(selectStrokes(strokes, square(0, 0, 100, 100))).toEqual(['in'])
  })

  it('uses transformed positions', () => {
    const moved = [fakeStroke('t', 0, 10, 10, 40, 40, { transform: { dx: 0, dy: 500, rotate: 0, ox: 0, oy: 0 } })]
    expect(selectStrokes(moved, square(0, 0, 100, 100))).toEqual([])
    expect(selectStrokes(moved, square(0, 500, 100, 600))).toEqual(['t'])
  })

  it('returns an empty list for a degenerate lasso', () => {
    expect(selectStrokes(strokes, [[0, 0], [10, 10]])).toEqual([])
  })
})

describe('selectionBBox', () => {
  it('wraps the selected strokes and returns null for nothing', () => {
    const strokes = [fakeStroke('a', 0, 10, 10, 40, 40), fakeStroke('b', 1, 50, 60, 70, 90)]
    expect(selectionBBox(strokes, ['a', 'b'])).toEqual({ minX: 10, minY: 10, maxX: 70, maxY: 90 })
    expect(selectionBBox(strokes, [])).toBeNull()
  })
})

describe('moveStrokes', () => {
  it('moves plain strokes and leaves others alone', () => {
    const strokes = [fakeStroke('a', 0, 10, 10, 40, 40), fakeStroke('b', 1, 50, 60, 70, 90)]
    const out = moveStrokes(strokes, ['a'], 5, -3)
    expect(strokeBBox(out[0])).toEqual({ minX: 15, minY: 7, maxX: 45, maxY: 37 })
    expect(out[1]).toBe(strokes[1])
  })

  it('moves a rotated stroke by the on-screen amount', () => {
    const s = fakeStroke('r', 0, 10, 0, 50, 0, { transform: { dx: 0, dy: 0, rotate: Math.PI / 2, ox: 0, oy: 0 } })
    const before = strokePoints(s)
    const after = strokePoints(moveStrokes([s], ['r'], 10, 0)[0])
    after.forEach(([x, y], i) => {
      expect(x - before[i][0]).toBeCloseTo(10, 6)
      expect(y - before[i][1]).toBeCloseTo(0, 6)
    })
  })

  it('keeps a moved tidy line near its new place after tidying again', () => {
    const tidied = tidyPage(tiltedLine('a', 0, 5))
    const ids = tidied.map((s) => s.id)
    const target = selectionBBox(tidied, ids).minY + 300
    const moved = moveStrokes(tidied, ids, 0, 300)
    const again = tidyPage(moved)
    expect(Math.abs(selectionBBox(again, ids).minY - target)).toBeLessThan(15)
  })
})

describe('deleteStrokes and setStrokesKind', () => {
  it('deleteStrokes removes only the selected strokes', () => {
    const strokes = [fakeStroke('a', 0, 0, 0, 1, 1), fakeStroke('b', 1, 0, 0, 1, 1)]
    expect(deleteStrokes(strokes, ['a']).map((s) => s.id)).toEqual(['b'])
  })

  it('marking a text-sized stroke as drawing makes it a drawing', () => {
    const strokes = [fakeStroke('a', 0, 100, 100, 140, 140), fakeStroke('b', 1, 150, 100, 190, 140)]
    const lines = groupLines(setStrokesKind(strokes, ['b'], 'drawing'))
    expect(lines.find((l) => l.strokeIds.includes('b')).kind).toBe('drawing')
    expect(lines.find((l) => l.strokeIds.includes('a')).strokeIds).toEqual(['a'])
  })

  it('marking a big stroke as text keeps it as text', () => {
    const strokes = [fakeStroke('big', 0, 100, 100, 160, 300)]
    expect(groupLines(strokes)[0].kind).toBe('drawing')
    expect(groupLines(setStrokesKind(strokes, ['big'], 'text'))[0].kind).toBe('text')
  })

  it('setting kind to null returns to automatic', () => {
    const marked = setStrokesKind([fakeStroke('a', 0, 0, 0, 1, 1)], ['a'], 'drawing')
    expect('kind' in setStrokesKind(marked, ['a'], null)[0]).toBe(false)
  })
})

describe('lasso resize', () => {
  const box = { minX: 100, minY: 100, maxX: 200, maxY: 150 }

  it('puts a handle on each corner of the selection box, opposite corner as the anchor', () => {
    const hs = selectionHandles(box, 8)
    expect(hs).toHaveLength(4)
    const br = hs.find((h) => h.corner === 'br')
    expect(br).toEqual({ corner: 'br', x: 208, y: 158, anchor: { x: 100, y: 100 } })
    expect(handleAt(box, { x: 205, y: 160 }, 8, 12).corner).toBe('br')
    expect(handleAt(box, { x: 150, y: 125 }, 8, 12)).toBeNull()
  })

  it('scales by how far the pen moved from the anchor, never below the minimum', () => {
    const anchor = { x: 100, y: 100 }
    expect(resizeFactor(anchor, { x: 200, y: 150 }, { x: 300, y: 200 })).toBeCloseTo(2, 6)
    expect(resizeFactor(anchor, { x: 200, y: 150 }, { x: 150, y: 125 })).toBeCloseTo(0.5, 6)
    expect(resizeFactor(anchor, { x: 200, y: 150 }, { x: 100, y: 100 })).toBe(RESIZE_MIN)
  })

  it('scales the selected strokes around the anchor, line width too', () => {
    const strokes = [fakeStroke('a', 1, 100, 100, 200, 150), fakeStroke('b', 2, 300, 300, 310, 310)]
    const out = resizeStrokes(strokes, ['a'], { x: 100, y: 100 }, 2)
    expect(strokeBBox(out[0])).toEqual({ minX: 100, minY: 100, maxX: 300, maxY: 200 })
    expect(out[0].width).toBeCloseTo(4.8, 6)
    expect(out[1]).toBe(strokes[1])
  })

  it('scales what is shown even for strokes rotated by note tidying', () => {
    const rotated = fakeStroke('r', 1, 100, 100, 140, 100, { transform: { dx: 5, dy: 0, rotate: 0.3, ox: 120, oy: 100 } })
    const before = strokePoints(rotated)
    const anchor = { x: 0, y: 0 }
    const after = strokePoints(resizeStrokes([rotated], ['r'], anchor, 1.5)[0])
    after.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(before[i][0] * 1.5, 0)
      expect(y).toBeCloseTo(before[i][1] * 1.5, 0)
    })
  })
})
