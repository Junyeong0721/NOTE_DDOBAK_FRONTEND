// AI 조언용 그림: 문제마다 고른 글씨체로 그린 목표 글자(위 줄)와 내가 쓴 글씨(아래 줄)를 칸을 맞춰 한 장에 담는다.
// 겹친 그림은 사람이 보기엔 좋지만 AI가 헷갈릴 수 있어서 위아래로 나눈다.
import { ensureFont } from '../note/fonts'
import { COLS } from './cells'
import { INK_COLOR, drawCellStrokes, drawTarget, makeCanvas } from './raster'

const CELL_PX = 80
const LABEL_W = 76
const NUMBER_H = 22 // 문제 번호 줄
const GAP = 12 // 줄 쌍 사이

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
 * 문제들을 줄에 배치한다: 한 줄 10칸, 문제 사이 한 칸 띄움, 줄에 안 들어가는 문제는 다음 줄에서 시작
 * (10자보다 긴 문제는 여러 줄에 걸친다). 짧은 글자 문제 5개는 한 줄에 나란히 놓인다.
 * @returns {Array<{ q: number, i: number, ch: string, row: number, col: number }>}
 */
export function layoutQuestions(texts, cols = COLS) {
  const out = []
  let row = 0
  let col = 0
  texts.forEach((text, q) => {
    const chars = [...text]
    if (col > 0 && col + chars.length > cols) {
      row++
      col = 0
    }
    chars.forEach((ch, i) => {
      if (col >= cols) {
        row++
        col = 0
      }
      out.push({ q, i, ch, row, col })
      col++
    })
    col++ // 문제 사이 한 칸
  })
  return out
}

/**
 * @param {{ fontId: string, questions: Array<{ text: string, cellStrokes: Array<Array|undefined> }> }} p
 * @returns {Promise<string>} PNG data URL
 */
export async function renderAdviceImage({ fontId, questions }) {
  await ensureFont(fontId)
  const placed = layoutQuestions(questions.map((q) => q.text))
  const rows = placed.reduce((m, p) => Math.max(m, p.row + 1), 0)
  const cols = placed.reduce((m, p) => Math.max(m, p.col + 1), 0)
  const blockH = NUMBER_H + CELL_PX * 2
  const canvas = makeCanvas(LABEL_W + cols * CELL_PX + 1, rows * blockH + (rows - 1) * GAP + 1)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  for (let row = 0; row < rows; row++) {
    const top = row * (blockH + GAP) + NUMBER_H
    ctx.fillStyle = '#444'
    ctx.font = '16px system-ui, sans-serif'
    ctx.fillText('목표', 8, top + CELL_PX / 2)
    ctx.fillText('내 글씨', 8, top + CELL_PX * 1.5)
  }
  ctx.lineWidth = 1
  for (const p of placed) {
    const x = LABEL_W + p.col * CELL_PX
    const top = p.row * (blockH + GAP) + NUMBER_H
    if (p.i === 0) {
      ctx.fillStyle = '#1f2a44'
      ctx.font = 'bold 15px system-ui, sans-serif'
      ctx.fillText(`${p.q + 1}번`, x + 2, top - NUMBER_H / 2)
    }
    ctx.strokeStyle = '#c4ccdb'
    ctx.strokeRect(x + 0.5, top + 0.5, CELL_PX, CELL_PX)
    ctx.strokeRect(x + 0.5, top + CELL_PX + 0.5, CELL_PX, CELL_PX)
    if (p.ch === ' ') continue
    drawTarget(ctx, p.ch, fontId, x, top, CELL_PX, { color: '#000' })
    drawCellStrokes(ctx, questions[p.q].cellStrokes[p.i] ?? [], x, top + CELL_PX, CELL_PX, { color: INK_COLOR })
  }
  return toDataUrl(canvas)
}
