import { describe, it, expect } from 'vitest'
import { boardSize, cellAt, layoutCells, normalizeText, toCellStroke } from './cells'

describe('practice cells', () => {
  it('cleans typed text', () => {
    expect(normalizeText('  가  나 ')).toBe('가 나')
    expect(normalizeText('')).toBe('')
    expect(normalizeText(null)).toBe('')
    expect([...normalizeText('가'.repeat(31))].length).toBe(30)
  })

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

  it('treats anything but Hangul as a cell you cannot write in', () => {
    const cells = layoutCells('가a1ㄱㅏ!')
    expect(cells.map((c) => c.blank)).toEqual([false, true, true, false, false, true])
    expect(cellAt(cells, 150, 50)).toBe(-1)
  })

  it('finds the cell under a point', () => {
    const cells = layoutCells('가나 다')
    expect(cellAt(cells, 150, 50)).toBe(1)
    expect(cellAt(cells, 250, 50)).toBe(-1) // 빈칸
    expect(cellAt(cells, 450, 50)).toBe(-1) // 글자 없는 자리
    expect(cellAt(cells, -5, 50)).toBe(-1)
    expect(cellAt(cells, 50, 150)).toBe(-1)
    expect(cellAt(layoutCells('가'.repeat(11)), 1050, 50)).toBe(-1) // 오른쪽 밖은 다음 줄로 넘기지 않는다
  })

  it('moves a stroke into cell coordinates', () => {
    const cell = layoutCells('가나')[1]
    const s = toCellStroke({ id: 'a', points: [[120, 30, 0.5, 7]] }, cell)
    expect(s).toEqual({ id: 'a', points: [[20, 30, 0.5, 7]] })
  })
})
