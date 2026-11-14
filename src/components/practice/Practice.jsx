import { useCallback, useEffect, useRef, useState } from 'react'
import { saveAttempt } from '../../api/practice'
import { renderAdviceImage } from '../../practice/adviceImage'
import { buildAttemptBody, resultFromAttempt } from '../../practice/board'
import { layoutCells } from '../../practice/cells'
import { loadPracticeFont, savePracticeFont } from '../../practice/practiceFont'
import { nextSet } from '../../practice/sets'
import Logo from '../Logo'
import PracticeBoard from './PracticeBoard'
import PracticeHome from './PracticeHome'
import PracticeResult from './PracticeResult'
import './Practice.css'

/** 글씨 연습: 고르기 → 쓰기 → 결과 */
export default function Practice({ onExit }) {
  const [fontId, setFontId] = useState(loadPracticeFont)
  const [screen, setScreen] = useState('home') // home | board | result
  const [task, setTask] = useState(null) // { setId, text }
  const [result, setResult] = useState(null)
  const [review, setReview] = useState(false)
  const [round, setRound] = useState(0) // 다시 하기마다 쓰기 화면을 새로
  const saveToken = useRef(0) // 가장 최근 채점만 화면에 반영

  useEffect(() => () => {
    saveToken.current = -1 // 화면을 떠난 뒤 도착한 조언은 버린다
  }, [])

  const changeFont = useCallback((id) => {
    setFontId(id)
    savePracticeFont(id)
  }, [])

  const start = (next) => {
    saveToken.current++
    setTask(next)
    setResult(null)
    setReview(false)
    setRound((r) => r + 1)
    setScreen('board')
  }

  const goHome = () => {
    saveToken.current++
    setScreen('home')
  }

  /** 점수는 바로 보여 주고, 저장과 조언은 뒤에서 받아 붙인다 (한 번 채점에 한 번만 저장) */
  const graded = async (g) => {
    const token = ++saveToken.current
    setResult({ ...g, setId: task.setId, advice: null, adviceState: 'pending' })
    setScreen('result')
    const settle = (patch) => {
      if (saveToken.current === token) setResult((r) => (r ? { ...r, ...patch } : r))
    }
    try {
      let image = null
      try {
        image = await renderAdviceImage({ text: g.text, fontId: g.fontId, cellStrokes: g.cellStrokes })
      } catch {
        // 그림을 못 만들면 조언 없이 기록만 저장
      }
      const saved = await saveAttempt(buildAttemptBody({ ...g, setId: task.setId, cells: layoutCells(g.text), image }))
      settle(saved.adviceStatus === 'OK' && saved.advice ? { advice: saved.advice, adviceState: 'ok' } : { adviceState: 'unavailable' })
    } catch {
      settle({ adviceState: 'unavailable', saveFailed: true })
    }
  }

  const openReview = (attempt) => {
    saveToken.current++
    setTask({ setId: attempt.setId ?? null, text: attempt.text })
    setResult(resultFromAttempt(attempt))
    setReview(true)
    setScreen('result')
  }

  const next = task?.setId ? nextSet(task.setId) : null

  return (
    <div className="practice">
      <header className="landing-bar">
        <button type="button" className="btn-quiet logo-home" onClick={onExit} aria-label="홈으로">
          <Logo />
        </button>
        <button type="button" className="btn-quiet" onClick={onExit}>홈으로</button>
      </header>
      {screen === 'home' && <PracticeHome fontId={fontId} onFont={changeFont} onStart={start} onReview={openReview} />}
      {screen === 'board' && task && (
        <PracticeBoard key={round} text={task.text} fontId={fontId} onFont={changeFont} onGraded={graded} onBack={goHome} />
      )}
      {screen === 'result' && result && (
        <PracticeResult
          result={result}
          review={review}
          onRetry={() => start(task)}
          onNext={next ? () => start({ setId: next.id, text: next.text }) : null}
          onBack={goHome}
        />
      )}
    </div>
  )
}
