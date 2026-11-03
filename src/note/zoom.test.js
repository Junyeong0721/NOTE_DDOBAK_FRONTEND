import { describe, it, expect } from 'vitest'
import { MAX_CANVAS_PIXELS, MAX_ZOOM, MIN_ZOOM, clampZoom, effectiveDpr, pinchDistance, zoomAround } from './zoom'

describe('zoom', () => {
  it('limits zoom to 0.75–2.5', () => {
    expect([MIN_ZOOM, MAX_ZOOM]).toEqual([0.75, 2.5])
    expect(clampZoom(0.5)).toBe(0.75)
    expect(clampZoom(3)).toBe(2.5)
    expect(clampZoom(1.3)).toBe(1.3)
  })

  it('keeps the point under the fingers in place when zooming in', () => {
    // 확대 전: 스크롤 (100, 200)에서 화면 (300, 400) 지점 = 내용 (400, 600)
    const next = zoomAround({ zoom: 1, nextZoom: 2, scrollLeft: 100, scrollTop: 200, cx: 300, cy: 400 })
    // 확대 후 같은 내용 지점은 (800, 1200) → 화면 (300, 400)에 오려면 스크롤 (500, 800)
    expect(next).toEqual({ scrollLeft: 500, scrollTop: 800 })
  })

  it('never scrolls to negative positions', () => {
    expect(zoomAround({ zoom: 2, nextZoom: 1, scrollLeft: 0, scrollTop: 0, cx: 300, cy: 300 })).toEqual({ scrollLeft: 0, scrollTop: 0 })
  })

  it('lowers the pixel ratio for very large canvases only', () => {
    expect(MAX_CANVAS_PIXELS).toBe(16_000_000)
    expect(effectiveDpr(820, 1160, 2)).toBe(2)
    const big = effectiveDpr(2050, 2899, 2) // 2.5배 확대한 페이지
    expect(big).toBeLessThan(2)
    expect(2050 * 2899 * big * big).toBeLessThanOrEqual(MAX_CANVAS_PIXELS + 1)
  })

  it('measures the distance between two fingers', () => {
    expect(pinchDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
})
