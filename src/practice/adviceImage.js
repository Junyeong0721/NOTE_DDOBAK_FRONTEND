// AI 조언용 그림: 고른 글씨체로 그린 목표 글자(위 줄)와 내가 쓴 글씨(아래 줄)를 칸을 맞춰 한 장에 담는다.
// 겹친 그림은 사람이 보기엔 좋지만 AI가 헷갈릴 수 있어서 위아래로 나눈다.
import { ensureFont } from '../note/fonts'
import { COLS, layoutCells } from './cells'
import { INK_COLOR, drawCellStrokes, drawTarget, makeCanvas } from './raster'

const CELL_PX = 96
const LABEL_W = 84
const GAP = 14 // 줄 쌍 사이

async function toDataUrl(canvas) {
  if (typeof canvas.toDataURL === 'function') return canvas.toDataURL('image/png')
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * @param {{ text: string, fontId: string, cellStrokes: Array<Array|undefined> }} p 칸 번호별 획(칸 좌표)
 * @returns {Promise<string>} PNG data URL
 */
export async function renderAdviceImage({ text, fontId, cellStrokes }) {
  await ensureFont(fontId)
  const cells = layoutCells(text)
  const rows = cells.length === 0 ? 0 : cells[cells.length - 1].row + 1
  const cols = Math.min(cells.length, COLS)
  const pairH = CELL_PX * 2
  const canvas = makeCanvas(LABEL_W + cols * CELL_PX + 1, rows * pairH + (rows - 1) * GAP + 1)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let row = 0; row < rows; row++) {
    const top = row * (pairH + GAP)
    ctx.fillStyle = '#444'
    ctx.font = '18px system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText('목표', 8, top + CELL_PX / 2)
    ctx.fillText('내 글씨', 8, top + CELL_PX * 1.5)
  }
  ctx.strokeStyle = '#c4ccdb'
  ctx.lineWidth = 1
  for (const cell of cells) {
    const x = LABEL_W + cell.col * CELL_PX
    const top = cell.row * (pairH + GAP)
    ctx.strokeRect(x + 0.5, top + 0.5, CELL_PX, CELL_PX)
    ctx.strokeRect(x + 0.5, top + CELL_PX + 0.5, CELL_PX, CELL_PX)
    if (cell.blank) continue
    drawTarget(ctx, cell.ch, fontId, x, top, CELL_PX, { color: '#000' })
    drawCellStrokes(ctx, cellStrokes[cell.index] ?? [], x, top + CELL_PX, CELL_PX, { color: INK_COLOR })
  }
  return toDataUrl(canvas)
}
