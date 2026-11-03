// 필기 도구 설정값. 펜은 필압에 따라 굵기가 변하고, 형광펜은 반투명 고정 굵기로 펜 아래에 그린다.
export const PEN_COLORS = ['#1f2a44', '#2563eb', '#e5484d', '#16a34a'] // 남색 잉크, 파랑, 빨강, 초록
export const HIGHLIGHTER_COLORS = ['#ffd84d', '#ff7aa8', '#3ccfa8', '#4da8ff']
export const PEN_SIZES = { thin: 1.6, normal: 2.4, bold: 4.0 }
export const HIGHLIGHTER_SIZES = { thin: 12, normal: 18, bold: 26 }
export const HIGHLIGHTER_ALPHA = 0.35

export const isHighlighter = (stroke) => stroke.tool === 'highlighter'
