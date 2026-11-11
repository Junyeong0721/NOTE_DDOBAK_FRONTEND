import { describe, it, expect } from 'vitest'
import { DEFAULT_FONT_ID, FONTS, fontById, fontFamily } from './fonts'

describe('fonts', () => {
  it('offers five fonts with Gowun Dodum as the default', () => {
    expect(FONTS.map((f) => f.id)).toEqual(['gowun-dodum', 'nanum-pen-script', 'hi-melody', 'gamja-flower', 'poor-story'])
    expect(DEFAULT_FONT_ID).toBe('gowun-dodum')
    expect(FONTS.every((f) => f.file === `/fonts/${f.id}.woff` && f.label)).toBe(true)
  })

  it('falls back to the default font for unknown ids', () => {
    expect(fontById('nope').id).toBe('gowun-dodum')
    expect(fontById('hi-melody').label).toBe('하이멜로디')
  })

  it('uses its own family name so it never clashes with page fonts', () => {
    expect(fontFamily('poor-story')).toBe('"ddobak-poor-story"')
  })
})
