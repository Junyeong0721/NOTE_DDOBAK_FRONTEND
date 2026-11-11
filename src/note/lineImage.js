// 한 줄의 획을 흰 배경 PNG로 그려 OCR에 보낸다. 사용자가 보는 모습(정리 transform 적용) 그대로 그린다.
// origin { minX, minY, fit }: 인식 결과의 이미지 좌표를 페이지 좌표로 되돌릴 때 쓴다 (페이지 x = minX + 이미지 x / fit)
import { strokeBBox } from './geometry'
import { drawStroke } from './render'

const MAX_SIDE = 4096

export function renderLineToPng(strokes, { padding = 12, scale = 2 } = {}) {
  const boxes = strokes.map(strokeBBox)
  const minX = Math.min(...boxes.map((b) => b.minX)) - padding
  const minY = Math.min(...boxes.map((b) => b.minY)) - padding
  const maxX = Math.max(...boxes.map((b) => b.maxX)) + padding
  const maxY = Math.max(...boxes.map((b) => b.maxY)) + padding
  const fit = Math.min(scale, MAX_SIDE / (maxX - minX), MAX_SIDE / (maxY - minY))
  const width = Math.max(1, Math.ceil((maxX - minX) * fit))
  const height = Math.max(1, Math.ceil((maxY - minY) * fit))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.translate(-minX * fit, -minY * fit)
  for (const s of strokes) drawStroke(ctx, { ...s, color: '#000000' }, fit)

  const dataUrl = canvas.toDataURL('image/png')
  return { imageBase64: dataUrl.slice(dataUrl.indexOf(',') + 1), width, height, origin: { minX, minY, fit } }
}
