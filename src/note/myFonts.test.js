import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FONTS_CHANGED, availableFonts, isAvailableFont, loadAddedFonts, setFontAdded } from './myFonts'

let store
let events
beforeEach(() => {
  store = new Map()
  events = []
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  }
  globalThis.window = { dispatchEvent: (e) => events.push(e) }
  globalThis.CustomEvent ??= class { constructor(type, init) { this.type = type; this.detail = init?.detail } }
})
afterEach(() => {
  delete globalThis.localStorage
  delete globalThis.window
})

describe('my fonts', () => {
  it('starts with only the five base fonts', () => {
    expect(loadAddedFonts()).toEqual([])
    expect(availableFonts().map((f) => f.id)).toEqual(['gowun-dodum', 'nanum-pen-script', 'hi-melody', 'gamja-flower', 'poor-story'])
  })

  it('adds and removes extra fonts, keeping the catalog order', () => {
    setFontAdded('gungsuh', true)
    setFontAdded('single-day', true)
    expect(loadAddedFonts()).toEqual(['gungsuh', 'single-day'])
    expect(availableFonts().slice(5).map((f) => f.id)).toEqual(['single-day', 'gungsuh'])
    expect(isAvailableFont('gungsuh')).toBe(true)
    setFontAdded('gungsuh', false)
    expect(isAvailableFont('gungsuh')).toBe(false)
    expect(events.map((e) => e.type)).toEqual([FONTS_CHANGED, FONTS_CHANGED, FONTS_CHANGED])
    expect(events[2].detail).toEqual(['single-day'])
  })

  it('never removes base fonts or adds unknown ones', () => {
    setFontAdded('gowun-dodum', false)
    setFontAdded('gaegu', true)
    expect(isAvailableFont('gowun-dodum')).toBe(true)
    expect(loadAddedFonts()).toEqual([])
  })

  it('ignores broken or unknown saved values', () => {
    store.set('ddobak.fonts', '{oops')
    expect(loadAddedFonts()).toEqual([])
    store.set('ddobak.fonts', JSON.stringify({ added: ['batang', 'nope', 'batang'] }))
    expect(loadAddedFonts()).toEqual(['batang'])
  })
})
