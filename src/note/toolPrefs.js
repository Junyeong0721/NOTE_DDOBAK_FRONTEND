// 도구 굵기·지우개 설정을 이 기기에 기억한다 (노트를 다시 열어도 그대로)
import { ERASER_SIZE, HIGHLIGHTER_WIDTH, PEN_WIDTH, clampToRange } from './tools'

const KEY = 'ddobak.tools'
export const ERASER_MODES = ['part', 'stroke'] // part: 지나간 부분만, stroke: 닿은 획 전체

export const DEFAULT_TOOL_PREFS = Object.freeze({
  penWidth: PEN_WIDTH.initial, highlighterWidth: HIGHLIGHTER_WIDTH.initial, eraserSize: ERASER_SIZE.initial, eraserMode: 'part',
})

export function loadToolPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_TOOL_PREFS }
    return {
      penWidth: clampToRange(raw.penWidth, PEN_WIDTH),
      highlighterWidth: clampToRange(raw.highlighterWidth, HIGHLIGHTER_WIDTH),
      eraserSize: clampToRange(raw.eraserSize, ERASER_SIZE),
      eraserMode: ERASER_MODES.includes(raw.eraserMode) ? raw.eraserMode : 'part',
    }
  } catch {
    return { ...DEFAULT_TOOL_PREFS }
  }
}

export function saveToolPrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만
  }
}
