import { describe, it, expect } from 'vitest'
import { ALL_FONTS, BASE_FONTS, DEFAULT_FONT_ID, EXTRA_FONTS, FONT_GROUPS, FONTS, fontById, fontFamily, isKnownFont } from './fonts'

describe('fonts', () => {
  it('keeps the five base fonts with Gowun Dodum as the default', () => {
    expect(BASE_FONTS.map((f) => f.id)).toEqual(['gowun-dodum', 'nanum-pen-script', 'hi-melody', 'gamja-flower', 'poor-story'])
    expect(FONTS).toBe(BASE_FONTS)
    expect(BASE_FONTS.every((f) => f.base && f.group === 'base')).toBe(true)
    expect(DEFAULT_FONT_ID).toBe('gowun-dodum')
  })

  it('offers more fonts in known groups, each with its own file', () => {
    expect(EXTRA_FONTS.length >= 14).toBe(true)
    const groups = FONT_GROUPS.map((g) => g.id)
    expect(ALL_FONTS.every((f) => f.file === `/fonts/${f.id}.woff` && f.label && f.note && groups.includes(f.group))).toBe(true)
    expect(new Set(ALL_FONTS.map((f) => f.id)).size).toBe(ALL_FONTS.length)
    expect(EXTRA_FONTS.some((f) => f.base)).toBe(false)
  })

  it('finds every font, falling back to the default for unknown ids', () => {
    expect(fontById('nope').id).toBe('gowun-dodum')
    expect(fontById('hi-melody').label).toBe('하이멜로디')
    expect(fontById('gungsuh').label).toBe('궁서')
    expect(isKnownFont('batang')).toBe(true)
    expect(isKnownFont('gaegu')).toBe(false)
  })

  it('uses its own family name so it never clashes with page fonts', () => {
    expect(fontFamily('poor-story')).toBe('"ddobak-poor-story"')
    expect(fontFamily('42dot-sans')).toBe('"ddobak-42dot-sans"')
  })
})
