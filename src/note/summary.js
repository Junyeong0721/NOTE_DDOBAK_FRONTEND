// AI 노트 요약: 필기가 있는 페이지를 그림으로 만들어 서버(→ Gemini)에 보낸다.
import { PAGE_HEIGHT, PAGE_WIDTH } from './content'
import { drawPage } from './render'

export const SUMMARY_MAX_PAGES = 10
export const SUMMARY_PAGE_WIDTH = 900 // 손글씨를 읽을 수 있을 만큼, 한 장 2MB를 넘지 않게
const STALE_TOLERANCE_MS = 2000

/** 요약에 보낼 페이지 번호: 획이 있는 페이지만, 앞에서부터 최대 10장 */
export function pagesToSummarize(pages) {
  return pages.map((p, i) => (p.strokes.length > 0 ? i : -1)).filter((i) => i >= 0).slice(0, SUMMARY_MAX_PAGES)
}

/** 서버의 summary(줄바꿈으로 이어 붙인 글) → 줄 목록 */
export const summaryLines = (summary) => (summary ?? '').split('\n').map((l) => l.trim()).filter(Boolean)

/** 요약 뒤에 노트가 바뀌었는지 (저장 시각 비교, 자동 저장 지연을 감안해 2초 여유) */
export function isSummaryStale(updatedAt, summarizedAt) {
  if (!updatedAt || !summarizedAt) return false
  return new Date(updatedAt).getTime() - new Date(summarizedAt).getTime() > STALE_TOLERANCE_MS
}

/** 페이지 하나를 흰 바탕 PNG로 (보정된 글자는 보정 글씨체로) */
export function renderSummaryPage(page, fontId = null) {
  const scale = SUMMARY_PAGE_WIDTH / PAGE_WIDTH
  const canvas = document.createElement('canvas')
  canvas.width = SUMMARY_PAGE_WIDTH
  canvas.height = Math.round(PAGE_HEIGHT * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // 줄여 그려도 획이 끊겨 보이지 않게 조금 굵게
  const strokes = page.strokes.map((s) => (s.tool === 'highlighter' ? s : { ...s, width: s.width * 1.3 }))
  drawPage(ctx, { strokes, scale, corrections: page.corrections, fontId })
  return canvas.toDataURL('image/png')
}
