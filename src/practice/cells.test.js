import { describe, it, expect } from 'vitest'
import { boardSize, cellAt, isHangul, layoutCells } from './cells'

describe('practice cells', () => {
  it('lays one character per cell and marks spaces blank', () => {
    const cells = layoutCells('가나 다')
    expect(cells.length).toBe(4)
    expect(cells[2].blank).toBe(true)
    expect(cells[3]).toEqual({ index: 3, ch: '다', row: 0, col: 3, x: 300, y: 0, blank: false })
  })

  it('wraps after ten cells', () => {
    const cells = layoutCells('가나다라마바사아자차카')
    expect(cells[10].row).toBe(1)
    expect(cells[10].col).toBe(0)
    expect(boardSize(cells)).toEqual({ width: 1000, height: 200 })
    expect(boardSize(layoutCells('가나'))).toEqual({ width: 200, height: 100 })
  })

  it('uses fewer columns on a narrow screen', () => {
    const cells = layoutCells('가나다라마', 4)
    expect(cells[4]).toEqual({ index: 4, ch: '마', row: 1, col: 0, x: 0, y: 100, blank: false })
    expect(boardSize(cells)).toEqual({ width: 400, height: 200 })
    expect(cellAt(cells, 50, 150)).toBe(4)
    expect(cellAt(cells, 450, 50)).toBe(-1)
  })

  it('finds the cell under a point', () => {
    const cells = layoutCells('가나 다')
    expect(cellAt(cells, 150, 50)).toBe(1)
    expect(cellAt(cells, 250, 50)).toBe(-1) // 빈칸
    expect(cellAt(cells, 450, 50)).toBe(-1) // 글자 없는 자리
    expect(cellAt(cells, -5, 50)).toBe(-1)
    expect(cellAt(cells, 50, 150)).toBe(-1)
  })

  it('only lets you write Hangul', () => {
    expect(['가', 'ㄱ', 'ㅏ', '힣'].every(isHangul)).toBe(true)
    expect(['a', '1', ' ', '!', '가나'].some(isHangul)).toBe(false)
    expect(layoutCells('가a').map((c) => c.blank)).toEqual([false, true])
  })
})
