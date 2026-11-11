// 필기 도구 설정값. 펜은 필압에 따라 굵기가 변하고, 형광펜은 반투명 고정 굵기로 펜 아래에 그린다.
export const PEN_COLORS = ['#1f2a44', '#2563eb', '#e5484d', '#16a34a'] // 남색 잉크, 파랑, 빨강, 초록
export const HIGHLIGHTER_COLORS = ['#ffd84d', '#ff7aa8', '#3ccfa8', '#4da8ff']
// 굵기·크기는 슬라이더로 고른다 (페이지 좌표). initial은 예전 '보통' 굵기
export const PEN_WIDTH = { min: 0.8, max: 8, step: 0.1, initial: 2.4 }
export const HIGHLIGHTER_WIDTH = { min: 6, max: 40, step: 1, initial: 18 }
export const ERASER_SIZE = { min: 4, max: 60, step: 1, initial: 10 } // 지우개 반지름

/** 범위 안, 눈금(step)에 맞춘 값. 숫자가 아니면 initial */
export function clampToRange(value, { min, max, step, initial }) {
  const n = Number(value)
  if (!Number.isFinite(n)) return initial
  const snapped = Math.round(n / step) * step
  return Math.round(Math.min(max, Math.max(min, snapped)) * 1000) / 1000
}
export const HIGHLIGHTER_ALPHA = 0.35

export const isHighlighter = (stroke) => stroke.tool === 'highlighter'
