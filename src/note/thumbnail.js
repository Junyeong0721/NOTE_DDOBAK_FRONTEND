// 목록에 보여줄 첫 페이지 미리보기(PNG data URL). 저장할 때 함께 서버로 보낸다.
import { PAGE_HEIGHT, PAGE_WIDTH } from './content'
import { drawPage } from './render'

export const THUMBNAIL_WIDTH = 240

export function thumbnailSize(width = THUMBNAIL_WIDTH) {
  const scale = width / PAGE_WIDTH
  return { width, height: Math.round(PAGE_HEIGHT * scale), scale }
}

export function renderThumbnail(page) {
  const { width, height, scale } = thumbnailSize()
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  // 썸네일에서는 획이 너무 가늘어 보이지 않게 조금 굵게 그린다
  const strokes = page.strokes.map((s) => (s.tool === 'highlighter' ? s : { ...s, width: s.width * 1.6 }))
  drawPage(canvas.getContext('2d'), { strokes, scale })
  return canvas.toDataURL('image/png')
}
