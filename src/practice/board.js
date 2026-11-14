// 연습 화면의 판단 로직 (화면 없이 테스트할 수 있게 컴포넌트 밖에 둔다)
import { fontById } from '../note/fonts'

export const ADVICE_UNAVAILABLE = '지금은 조언을 할 수 없어요'

/**
 * 이 입력으로 글씨를 쓸지. 펜을 한 번이라도 쓴 뒤에는 손가락(손바닥)을 무시하고,
 * 펜이 없는 기기(폰)에서는 손가락·마우스로 쓴다.
 */
export function pickInput(sawPen, pointerType) {
  if (pointerType === 'pen') return { accept: true, sawPen: true }
  return { accept: !sawPen, sawPen }
}

/** 칸에 쓴 획이 하나라도 있는지 */
export const hasInk = (cellStrokes) => cellStrokes.some((strokes) => strokes && strokes.length > 0)

/** [채점하기]를 누를 수 있는지: 글꼴을 다 받았고, 한 칸이라도 썼고, 채점 중이 아닐 때 */
export function canGrade(cells, cellStrokes, fontReady, busy = false) {
  if (!fontReady || busy) return false
  return cells.some((c) => !c.blank && (cellStrokes[c.index]?.length ?? 0) > 0)
}

const round1 = (v) => Math.round(v * 10) / 10

/** 서버에 보낼 기록. 빈칸은 null, 글자 칸은 { ch, strokes } */
export function buildAttemptBody({ setId = null, text, fontId, guide, cells, cellStrokes, glyphScores, setScore, image }) {
  return {
    setId,
    text,
    fontId,
    fontLabel: fontById(fontId).label,
    guide,
    cells: cells.map((c) => (c.blank ? null : { ch: c.ch, strokes: cellStrokes[c.index] ?? [] })),
    charScores: cells.map((c) => {
      const g = glyphScores[c.index]
      if (c.blank || !g) return null
      return { total: g.total, shape: round1(g.shape), position: round1(g.position), tilt: round1(g.tilt), empty: g.empty, skipped: g.skipped }
    }),
    totalScore: setScore.total,
    shapeScore: setScore.shapePct,
    positionScore: setScore.positionPct,
    tiltScore: setScore.tiltPct,
    image: image ?? null,
  }
}

/** 저장된 기록(서버 응답)을 결과 화면이 쓰는 모양으로 */
export function resultFromAttempt(attempt) {
  return {
    setId: attempt.setId ?? null,
    text: attempt.text,
    fontId: attempt.fontId,
    guide: attempt.guide,
    cellStrokes: attempt.cells.map((c) => c?.strokes ?? []),
    glyphScores: attempt.charScores,
    setScore: {
      total: attempt.totalScore,
      shapePct: attempt.shapeScore,
      positionPct: attempt.positionScore,
      tiltPct: attempt.tiltScore,
    },
    advice: attempt.advice ?? null,
    adviceState: attempt.adviceStatus === 'OK' && attempt.advice ? 'ok' : 'unavailable',
  }
}

/** 글자 칸 아래에 보여 줄 점수 글자 */
export function glyphLabel(score) {
  if (!score || score.skipped) return '–'
  if (score.empty) return '안 씀'
  return `${score.total}점`
}
