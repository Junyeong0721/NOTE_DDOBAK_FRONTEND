import { describe, it, expect } from 'vitest'
import { layoutQuestions } from './adviceImage'

const at = (placed, q, i) => placed.find((p) => p.q === q && p.i === i)

describe('advice image layout', () => {
  it('puts five single characters side by side on one row', () => {
    const placed = layoutQuestions(['강', '물', '밥', '산', '집'])
    expect(placed.every((p) => p.row === 0)).toBe(true)
    expect(placed.map((p) => p.col)).toEqual([0, 2, 4, 6, 8])
  })

  it('starts a question on a new row when it does not fit', () => {
    const placed = layoutQuestions(['강의', '중간고사', '기말고사'])
    expect([at(placed, 1, 0).row, at(placed, 1, 0).col]).toEqual([0, 3])
    expect([at(placed, 2, 0).row, at(placed, 2, 0).col]).toEqual([1, 0])
  })

  it('wraps a long sentence over two rows', () => {
    const placed = layoutQuestions(['다음 주까지 과제 제출', '오늘 배운 내용 정리하기'])
    expect([at(placed, 0, 9).row, at(placed, 0, 9).col]).toEqual([0, 9])
    expect([at(placed, 0, 10).row, at(placed, 0, 10).col]).toEqual([1, 0])
    expect([at(placed, 1, 0).row, at(placed, 1, 0).col]).toEqual([2, 0])
    expect(placed.length).toBe([...'다음 주까지 과제 제출'].length + [...'오늘 배운 내용 정리하기'].length)
  })
})
