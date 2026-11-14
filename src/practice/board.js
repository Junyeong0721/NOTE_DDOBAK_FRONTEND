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

/** 칸들에 쓴 획이 하나라도 있는지 */
export const hasInk = (cellStrokes) => (cellStrokes ?? []).some((strokes) => strokes && strokes.length > 0)

/** 문제마다 쓴 게 있는지: [true, false, …] */
export const writtenFlags = (roundStrokes, count) => Array.from({ length: count }, (_, i) => hasInk(roundStrokes[i]))

/** [채점하기]를 누를 수 있는지: 글꼴을 다 받았고, 어느 문제든 한 칸이라도 썼고, 채점 중이 아닐 때 */
export function canGrade(roundStrokes, fontReady, busy = false) {
  if (!fontReady || busy) return false
  return roundStrokes.some((cellStrokes) => hasInk(cellStrokes))
}

const round1 = (v) => Math.round(v * 10) / 10

/**
 * 서버에 보낼 한 판 기록.
 * questions: [{ text, cells, cellStrokes, glyphScores, score }] — score는 scoreSet 결과
 * round: scoreRound 결과
 */
export function buildAttemptBody({ stage, fontId, guide, questions, round, image }) {
  return {
    stage,
    fontId,
    fontLabel: fontById(fontId).label,
    guide,
    items: questions.map((q) => ({
      text: q.text,
      cells: q.cells.map((c) => (c.blank ? null : { ch: c.ch, strokes: q.cellStrokes[c.index] ?? [] })),
      charScores: q.cells.map((c) => {
        const g = q.glyphScores[c.index]
        if (c.blank || !g) return null
        return { total: g.total, shape: round1(g.shape), position: round1(g.position), tilt: round1(g.tilt), empty: g.empty, skipped: g.skipped }
      }),
      score: { total: q.score.total, shape: q.score.shapePct, position: q.score.positionPct, tilt: q.score.tiltPct },
    })),
    totalScore: round.total,
    shapeScore: round.shapePct,
    positionScore: round.positionPct,
    tiltScore: round.tiltPct,
    image: image ?? null,
  }
}

/** 저장된 기록(서버 응답)을 결과 화면이 쓰는 모양으로 */
export function resultFromAttempt(attempt) {
  return {
    stage: attempt.stage,
    fontId: attempt.fontId,
    guide: attempt.guide,
    questions: (attempt.items ?? []).map((item) => ({
      text: item.text,
      cellStrokes: item.cells.map((c) => c?.strokes ?? []),
      glyphScores: item.charScores,
      score: { total: item.score?.total ?? 0 },
    })),
    round: {
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
