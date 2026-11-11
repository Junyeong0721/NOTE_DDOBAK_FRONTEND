import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DEFAULT_TOOL_PREFS, loadToolPrefs, saveToolPrefs } from './toolPrefs'

let store
beforeEach(() => {
  store = new Map()
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) }
})
afterEach(() => {
  delete globalThis.localStorage
})

describe('tool preferences', () => {
  it('starts with the usual sizes and the partial eraser', () => {
    expect(loadToolPrefs()).toEqual({ penWidth: 2.4, highlighterWidth: 18, eraserSize: 10, eraserMode: 'part' })
    expect(DEFAULT_TOOL_PREFS.eraserMode).toBe('part')
  })

  it('remembers sizes and eraser mode on this device', () => {
    saveToolPrefs({ penWidth: 3.1, highlighterWidth: 25, eraserSize: 30, eraserMode: 'stroke' })
    expect(loadToolPrefs()).toEqual({ penWidth: 3.1, highlighterWidth: 25, eraserSize: 30, eraserMode: 'stroke' })
  })

  it('fixes values that are out of range or broken', () => {
    store.set('ddobak.tools', JSON.stringify({ penWidth: 99, highlighterWidth: 'a', eraserSize: 1, eraserMode: 'x' }))
    expect(loadToolPrefs()).toEqual({ penWidth: 8, highlighterWidth: 18, eraserSize: 4, eraserMode: 'part' })
    store.set('ddobak.tools', '{oops')
    expect(loadToolPrefs()).toEqual(DEFAULT_TOOL_PREFS)
  })
})
