import { describe, it, expect } from 'vitest'
import { HIGHLIGHTER_ALPHA, HIGHLIGHTER_COLORS, HIGHLIGHTER_SIZES, PEN_COLORS, PEN_SIZES, isHighlighter } from './tools'
import { createStroke } from './content'

describe('tools', () => {
  it('has three pen sizes and three highlighter sizes', () => {
    expect(PEN_SIZES).toEqual({ thin: 1.6, normal: 2.4, bold: 4.0 })
    expect(HIGHLIGHTER_SIZES).toEqual({ thin: 12, normal: 18, bold: 26 })
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
