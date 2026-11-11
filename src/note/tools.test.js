import { describe, it, expect } from 'vitest'
import {
  ERASER_SIZE, HIGHLIGHTER_ALPHA, HIGHLIGHTER_COLORS, HIGHLIGHTER_WIDTH, PEN_COLORS, PEN_WIDTH, clampToRange, isHighlighter,
} from './tools'
import { createStroke } from './content'

describe('tools', () => {
  it('lets pen, highlighter and eraser sizes slide over a range, starting where the old normal size was', () => {
    expect(PEN_WIDTH).toEqual({ min: 0.8, max: 8, step: 0.1, initial: 2.4 })
    expect(HIGHLIGHTER_WIDTH).toEqual({ min: 6, max: 40, step: 1, initial: 18 })
    expect(ERASER_SIZE).toEqual({ min: 4, max: 60, step: 1, initial: 10 })
  })

  it('keeps a size inside its range and on its step', () => {
    expect(clampToRange(100, PEN_WIDTH)).toBe(8)
    expect(clampToRange(0, PEN_WIDTH)).toBe(0.8)
    expect(clampToRange(2.4567, PEN_WIDTH)).toBe(2.5)
    expect(clampToRange('x', PEN_WIDTH)).toBe(2.4)
  })

  it('has four pen colors starting with navy ink and four highlighter colors', () => {
    expect(PEN_COLORS).toEqual(['#1f2a44', '#2563eb', '#e5484d', '#16a34a'])
    expect(HIGHLIGHTER_COLORS).toEqual(['#ffd84d', '#ff7aa8', '#3ccfa8', '#4da8ff'])
    expect(HIGHLIGHTER_ALPHA).toBe(0.35)
  })

  it('createStroke stores tool only for highlighter', () => {
    expect(createStroke({ t0: 1, color: '#ffd84d', width: 18, tool: 'highlighter' }).tool).toBe('highlighter')
    expect('tool' in createStroke({ t0: 1, color: '#1f2a44', width: 2.4, tool: 'pen' })).toBe(false)
    expect('tool' in createStroke({ t0: 1, color: '#1f2a44', width: 2.4 })).toBe(false)
  })

  it('old strokes without tool are pens', () => {
    expect(isHighlighter({ points: [] })).toBe(false)
    expect(isHighlighter({ tool: 'highlighter', points: [] })).toBe(true)
  })
})
