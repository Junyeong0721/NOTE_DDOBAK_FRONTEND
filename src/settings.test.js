import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings'

let store
beforeEach(() => {
  store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  }
})
afterEach(() => {
  delete globalThis.localStorage
})

describe('settings', () => {
  it('starts with Gowun Dodum and automatic suggestions on', () => {
    expect(loadSettings()).toEqual({ fontId: 'gowun-dodum', autoSuggest: true })
    expect(DEFAULT_SETTINGS).toEqual({ fontId: 'gowun-dodum', autoSuggest: true })
  })

  it('saves and loads the chosen font and switch', () => {
    saveSettings({ fontId: 'hi-melody', autoSuggest: false })
    expect(loadSettings()).toEqual({ fontId: 'hi-melody', autoSuggest: false })
  })

  it('ignores broken or unknown values', () => {
    store.set('ddobak.settings', '{oops')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    store.set('ddobak.settings', JSON.stringify({ fontId: 'gaegu', autoSuggest: 'yes' }))
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('works when storage is not available', () => {
    delete globalThis.localStorage
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    expect(() => saveSettings({ fontId: 'hi-melody', autoSuggest: true })).not.toThrow()
  })
})
