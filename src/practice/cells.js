// 연습 원고지: 한 글자 한 칸. 칸 한 변은 100(칸 좌표), 한 줄 10칸.
export const MAX_TEXT = 30
export const COLS = 10
export const CELL = 100

/** 직접 입력한 글 다듬기: 앞뒤 공백 제거, 이어진 공백은 하나로, 30자까지 */
export function normalizeText(raw) {
  const chars = [...String(raw ?? '').replace(/\s+/g, ' ').trim()]
  return chars.slice(0, MAX_TEXT).join('').trim()
}

/** 글자마다 칸 위치. 띄어쓰기는 빈칸(blank)으로 두고 쓰지도 채점하지도 않는다 */
export function layoutCells(text) {
  return [...text].map((ch, index) => {
    const row = Math.floor(index / COLS)
    const col = index % COLS
    return { index, ch, row, col, x: col * CELL, y: row * CELL, blank: ch === ' ' }
  })
}

export const boardSize = (cells) => ({
  width: Math.min(cells.length, COLS) * CELL,
  height: (cells.length === 0 ? 0 : cells[cells.length - 1].row + 1) * CELL,
})

/** 이 점이 들어 있는 칸 번호. 빈칸이거나 원고지 밖이면 -1 */
export function cellAt(cells, px, py) {
  if (px < 0 || py < 0) return -1
  const col = Math.floor(px / CELL)
  const row = Math.floor(py / CELL)
  if (col >= COLS) return -1
  const cell = cells[row * COLS + col]
  return cell && !cell.blank ? cell.index : -1
}

/** 원고지 좌표의 획을 그 칸 기준 좌표(0~100)로 옮긴다 */
export function toCellStroke(stroke, cell) {
  return { ...stroke, points: stroke.points.map(([x, y, ...rest]) => [x - cell.x, y - cell.y, ...rest]) }
}
