import { useEffect, useMemo, useState } from 'react'
import { getAttempt, listAttempts, listBest } from '../../api/practice'
import { fontById, fontFamily } from '../../note/fonts'
import { ROUND_SIZE, STAGES, stageById } from '../../practice/questions'
import FontPicker from './FontPicker'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// 단계 카드에 보여 줄 예시 (실제 문제는 랜덤)
const SAMPLE = { syllable: '강 물 읽', word: '강의 과제', sentence: '또박또박 써 보기' }

/** 연습 고르기: 글씨체 → 단계(글자·단어·문장). 아래에는 최근 연습 */
export default function PracticeHome({ fontId, onFont, onStart, onReview }) {
  const [best, setBest] = useState([])
  const [recent, setRecent] = useState([])
  const [error, setError] = useState('')
  const [opening, setOpening] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([listBest(), listAttempts()])
      .then(([b, r]) => {
        if (!alive) return
        setBest(b)
        setRecent(r)
      })
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  const bestByStage = useMemo(() => new Map(best.map((b) => [b.stage, b])), [best])
  const family = `${fontFamily(fontId)}, sans-serif`

  const review = async (id) => {
    setOpening(id)
    try {
      onReview(await getAttempt(id))
    } catch (e) {
      setError(e.message)
      setOpening(null)
    }
  }

  return (
    <main className="practice-main">
      <h1 className="practice-title">글씨 연습</h1>
      <p className="practice-lead">
        따라 쓸 글씨체와 단계를 고르면 문제 {ROUND_SIZE}개가 랜덤으로 나와요. 다 쓰면 점수와 조언을 알려 드려요.
      </p>

      <section className="practice-section" aria-labelledby="pf-title">
        <h2 id="pf-title">글씨체</h2>
        <FontPicker fontId={fontId} onChange={onFont} />
      </section>

      <section className="practice-section" aria-labelledby="ps-title">
        <h2 id="ps-title">단계</h2>
        <ul className="practice-stages">
          {STAGES.map((s) => {
            const b = bestByStage.get(s.id)
            return (
              <li key={s.id}>
                <button type="button" className={`practice-stage stage-${s.id}`} onClick={() => onStart(s.id)}>
                  <span className="practice-stage-label">{s.label}</span>
                  <span className="practice-stage-sample" style={{ fontFamily: family }} aria-hidden="true">{SAMPLE[s.id]}</span>
                  <span className="practice-stage-hint">{s.hint}</span>
                  <span className="practice-stage-meta">{b ? `최고 ${b.best}점 · ${b.count}판` : '아직 안 함'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="practice-section" aria-labelledby="pr-title">
        <h2 id="pr-title">최근 연습</h2>
        {error && <p className="error">{error}</p>}
        {recent.length === 0 ? (
          <p className="home-empty">아직 연습한 기록이 없어요.</p>
        ) : (
          <ul className="practice-recent">
            {recent.map((a) => (
              <li key={a.id}>
                <button type="button" className="practice-recent-row" onClick={() => review(a.id)} disabled={opening === a.id}>
                  <span className="practice-recent-stage">{stageById(a.stage)?.label ?? a.stage}</span>
                  <span className="practice-recent-text">{a.text.split('\n').join(' · ')}</span>
                  <span className="practice-recent-font">{fontById(a.fontId).label}</span>
                  <span className="practice-recent-date">{dateFormat.format(new Date(a.createdAt))}</span>
                  <span className="practice-recent-score">{a.totalScore}점</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
