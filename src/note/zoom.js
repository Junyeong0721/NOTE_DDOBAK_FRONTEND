// 확대·축소 계산. 화면 상태(스크롤, 손가락 위치)만 다루는 순수 함수.
export const MIN_ZOOM = 0.75
export const MAX_ZOOM = 2.5
export const MAX_CANVAS_PIXELS = 16_000_000 // iPad Safari 캔버스 한도(약 1,677만 픽셀)보다 조금 작게

export const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

/** 손가락 가운데(cx, cy: 스크롤 영역 기준 화면 좌표)가 확대 뒤에도 같은 내용을 가리키도록 새 스크롤 위치를 구한다 */
export function zoomAround({ zoom, nextZoom, scrollLeft, scrollTop, cx, cy }) {
  const ratio = nextZoom / zoom
  return {
    scrollLeft: Math.max(0, (scrollLeft + cx) * ratio - cx),
    scrollTop: Math.max(0, (scrollTop + cy) * ratio - cy),
  }
}

/** 캔버스 실제 픽셀 수가 한도를 넘으면 기기 픽셀 비율을 낮춘다 (조금 흐려지지만 하얗게 비지 않는다) */
export function effectiveDpr(cssWidth, cssHeight, dpr) {
  const limit = Math.sqrt(MAX_CANVAS_PIXELS / (cssWidth * cssHeight))
  return Math.min(dpr, limit)
}

export const pinchDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
