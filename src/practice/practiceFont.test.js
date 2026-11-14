import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadPracticeFont, savePracticeFont } from './practiceFont'
import { loadSettings, saveSettings } from '../settings'

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

describe('practice font', () => {
  it('starts from the settings font', () => {
    expect(loadPracticeFont()).toBe('gowun-dodum')
    saveSettings({ fontId: 'hi-melody', autoSuggest: true })
    expect(loadPracticeFont()).toBe('hi-melody')
  })

  it('remembers its own choice without touching settings', () => {
    savePracticeFont('gamja-flower')
    expect(loadPracticeFont()).toBe('gamja-flower')
    expect(loadSettings().fontId).toBe('gowun-dodum')
  })

  it('ignores unknown or broken values', () => {
    store.set('ddobak.practice', JSON.stringify({ fontId: 'gaegu' }))
    expect(loadPracticeFont()).toBe('gowun-dodum')
    store.set('ddobak.practice', '{oops')
    expect(loadPracticeFont()).toBe('gowun-dodum')
  })
})
