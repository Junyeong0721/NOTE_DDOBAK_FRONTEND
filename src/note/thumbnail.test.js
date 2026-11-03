import { describe, it, expect } from 'vitest'
import { THUMBNAIL_WIDTH, thumbnailSize } from './thumbnail'

describe('thumbnail', () => {
  it('is 240 wide with the A4 page ratio', () => {
    expect(THUMBNAIL_WIDTH).toBe(240)
    expect(thumbnailSize()).toEqual({ width: 240, height: 339, scale: 0.24 })
  })
})
