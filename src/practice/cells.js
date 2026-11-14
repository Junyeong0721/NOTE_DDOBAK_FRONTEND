// 연습 원고지: 한 글자 한 칸. 칸 한 변은 100(칸 좌표), 한 줄 10칸.
export const COLS = 10
export const CELL = 100

/** 따라 쓸 수 있는 글자인지: 한글 글자와 낱자만 (그 밖의 글자는 칸만 보여 주고 채점하지 않는다) */
export const isHangul = (ch) => /^[가-힣ㄱ-ㅎㅏ-ㅣ]$/.test(ch)

/**
 * 글자마다 칸 위치. 띄어쓰기(와 혹시 섞인 한글이 아닌 글자)는 빈칸(blank)으로 두고 쓰지도 채점하지도 않는다.
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
