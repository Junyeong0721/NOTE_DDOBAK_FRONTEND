// 실행 취소 / 다시 실행. 상태 전체(페이지 배열)를 통째로 보관한다.
export const HISTORY_LIMIT = 50

export const createHistory = (present) => ({ past: [], present, future: [] })

export const push = (h, next) => ({ past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] })

export const canUndo = (h) => h.past.length > 0
export const canRedo = (h) => h.future.length > 0

export function undo(h) {
  if (!canUndo(h)) return h
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
}

export function redo(h) {
  if (!canRedo(h)) return h
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
}
