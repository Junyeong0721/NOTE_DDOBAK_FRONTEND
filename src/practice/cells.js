// 연습 원고지: 한 글자 한 칸. 칸 한 변은 100(칸 좌표), 한 줄 10칸.
export const MAX_TEXT = 30
export const COLS = 10
export const CELL = 100

/** 직접 입력한 글 다듬기: 앞뒤 공백 제거, 이어진 공백은 하나로, 30자까지 */
export function normalizeText(raw) {
  const chars = [...String(raw ?? '').replace(/\s+/g, ' ').trim()]
  return chars.slice(0, MAX_TEXT).join('').trim()
}

/** 따라 쓸 수 있는 글자인지: 한글 글자와 낱자만 (영문·숫자·기호는 칸만 보여 주고 채점하지 않는다) */
export const isHangul = (ch) => /^[가-힣ㄱ-ㅎㅏ-ㅣ]$/.test(ch)

/**
 * 글자마다 칸 위치. 띄어쓰기와 한글이 아닌 글자는 빈칸(blank)으로 두고 쓰지도 채점하지도 않는다.
 * cols: 한 줄 칸 수 (화면이 좁으면 줄여서 칸이 너무 작아지지 않게)
 */
export function layoutCells(text, cols = COLS) {
  return [...text].map((ch, index) => {
    const row = Math.floor(index / cols)
    const col = index % cols
    return { index, ch, row, col, x: col * CELL, y: row * CELL, blank: !isHangul(ch) }
  })
}

export const boardSize = (cells) => ({
  width: cells.reduce((m, c) => Math.max(m, c.col + 1), 0) * CELL,
  height: cells.reduce((m, c) => Math.max(m, c.row + 1), 0) * CELL,
})

/** 이 점이 들어 있는 칸 번호. 빈칸이거나 원고지 밖이면 -1 */
export function cellAt(cells, px, py) {
  if (px < 0 || py < 0) return -1
  const col = Math.floor(px / CELL)
  const row = Math.floor(py / CELL)
  const cell = cells.find((c) => c.row === row && c.col === col)
  return cell && !cell.blank ? cell.index : -1
}

/** 원고지 좌표의 획을 그 칸 기준 좌표(0~100)로 옮긴다 */
export function toCellStroke(stroke, cell) {
  return { ...stroke, points: stroke.points.map(([x, y, ...rest]) => [x - cell.x, y - cell.y, ...rest]) }
}
