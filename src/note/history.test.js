import { describe, it, expect } from 'vitest'
import { HISTORY_LIMIT, canRedo, canUndo, createHistory, push, redo, undo } from './history'

describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const h = createHistory('a')
    expect(h.present).toBe('a')
    expect(canUndo(h)).toBe(false)
    expect(canRedo(h)).toBe(false)
  })

  it('undo and redo move between states', () => {
    let h = push(push(createHistory('a'), 'b'), 'c')
    h = undo(h)
    expect(h.present).toBe('b')
    h = undo(h)
    expect(h.present).toBe('a')
    expect(canUndo(h)).toBe(false)
    h = redo(h)
    expect(h.present).toBe('b')
  })

  it('a new change after undo clears redo', () => {
    let h = undo(push(createHistory('a'), 'b'))
    h = push(h, 'x')
    expect(canRedo(h)).toBe(false)
    expect(h.present).toBe('x')
  })

  it(`keeps at most ${50} undo steps`, () => {
    let h = createHistory(0)
    for (let i = 1; i <= 60; i++) h = push(h, i)
    expect(HISTORY_LIMIT).toBe(50)
    expect(h.past).toHaveLength(50)
    expect(h.past[0]).toBe(10)
  })

  it('undo and redo are no-ops at the ends', () => {
    const h = createHistory('a')
    expect(undo(h)).toBe(h)
    expect(redo(h)).toBe(h)
  })
})
