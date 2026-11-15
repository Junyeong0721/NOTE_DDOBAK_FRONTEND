import { useCallback, useEffect, useRef, useState } from 'react'
import { saveAttempt } from '../../api/practice'
import { renderAdviceImage } from '../../practice/adviceImage'
import { buildAttemptBody, resultFromAttempt } from '../../practice/board'
import { loadPracticeFont, savePracticeFont } from '../../practice/practiceFont'
import { drawRound } from '../../practice/questions'
import Logo from '../Logo'
import PracticeBoard from './PracticeBoard'
import PracticeHome from './PracticeHome'
import PracticeResult from './PracticeResult'
import './Practice.css'

/** 글씨 연습: 단계 고르기 → 랜덤 문제 5개 쓰기 → 판 결과 */
export default function Practice({ onExit }) {
  const [fontId, setFontId] = useState(loadPracticeFont)
  const [screen, setScreen] = useState('home') // home | board | result
  const [stage, setStage] = useState(null)
  const [texts, setTexts] = useState([]) // 이번 판 문제 5개
  const [result, setResult] = useState(null)
  const [review, setReview] = useState(false)
  const [roundNo, setRoundNo] = useState(0) // 판마다 쓰기 화면을 새로
  const lastTexts = useRef({}) // 단계별 바로 전 판 문제 (다음 판에서 겹치지 않게)
  const saveToken = useRef(0) // 가장 최근 채점만 화면에 반영

  useEffect(() => () => {
    saveToken.current = -1 // 화면을 떠난 뒤 도착한 조언은 버린다
  }, [])

  const changeFont = useCallback((id) => {
    setFontId(id)
    savePracticeFont(id)
  }, [])

  const start = (stageId) => {
    saveToken.current++
    const next = drawRound(stageId, { avoid: lastTexts.current[stageId] ?? [] })
    lastTexts.current[stageId] = next
    setStage(stageId)
    setTexts(next)
    setResult(null)
    setReview(false)
    setRoundNo((n) => n + 1)
    setScreen('board')
  }

  const goHome = () => {
    saveToken.current++
    setScreen('home')
  }

  /** 점수는 바로 보여 주고, 저장과 조언은 뒤에서 받아 붙인다 (한 판에 한 번만 저장) */
  const graded = async (g) => {
    const token = ++saveToken.current
    setResult({ ...g, advice: null, adviceState: 'pending' })
    setScreen('result')
    const settle = (patch) => {
      if (saveToken.current === token) setResult((r) => (r ? { ...r, ...patch } : r))
    }
    try {
      let image = null
      try {
        image = await renderAdviceImage({ fontId: g.fontId, questions: g.questions })
      } catch {
        // 그림을 못 만들면 조언 없이 기록만 저장
      }
      const saved = await saveAttempt(buildAttemptBody({ ...g, image }))
      settle(saved.adviceStatus === 'OK' && saved.advice ? { advice: saved.advice, adviceState: 'ok' } : { adviceState: 'unavailable' })
    } catch {
      settle({ adviceState: 'unavailable', saveFailed: true })
    }
  }

  const openReview = (attempt) => {
    saveToken.current++
    setStage(attempt.stage)
    setResult(resultFromAttempt(attempt))
    setReview(true)
    setScreen('result')
  }

  return (
    <div className="practice">
      <header className="landing-bar">
        <button type="button" className="btn-quiet logo-home" onClick={onExit} aria-label="홈으로">
          <Logo />
        </button>
        <button type="button" className="btn-quiet" onClick={onExit}>홈으로</button>
      </header>
      {screen === 'home' && <PracticeHome fontId={fontId} onFont={changeFont} onStart={start} onReview={openReview} />}
      {screen === 'board' && (
        <PracticeBoard key={roundNo} stage={stage} texts={texts} fontId={fontId} onFont={changeFont} onGraded={graded} onBack={goHome} />
      )}
      {screen === 'result' && result && (
        <PracticeResult result={result} review={review} onAgain={() => start(stage)} onBack={goHome} />
      )}
    </div>
  )
}
