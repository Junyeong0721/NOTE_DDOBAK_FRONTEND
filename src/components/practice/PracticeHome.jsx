import { useEffect, useMemo, useState } from 'react'
import { getAttempt, listAttempts, listBest, listWeak } from '../../api/practice'
import { fontById, fontFamily } from '../../note/fonts'
import { ROUND_SIZE, STAGES, WEAK_STAGE, canDrawWeak, stageById, weakPool } from '../../practice/questions'
import FontPicker from './FontPicker'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })

const WEAKEST = { shape: '모양이 약해요', position: '위치·크기가 약해요', tilt: '기울기가 약해요' }

// 단계 카드에 보여 줄 예시 (실제 문제는 랜덤)
const SAMPLE = { syllable: '강 물 읽', word: '강의 과제', sentence: '또박또박 써 보기' }

/** 연습 고르기: 글씨체 → 단계(글자·단어·문장·내 약점 글자). 아래에는 최근 연습 */
export default function PracticeHome({ fontId, onFont, onStart, onReview }) {
  const [best, setBest] = useState([])
  const [recent, setRecent] = useState([])
  const [weak, setWeak] = useState(null) // null = 불러오는 중
  const [showWeak, setShowWeak] = useState(false)
  const [error, setError] = useState('')
  const [opening, setOpening] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([listBest(), listAttempts(), listWeak()])
      .then(([b, r, w]) => {
        if (!alive) return
        setBest(b)
        setRecent(r)
        setWeak(w)
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
          <li>
            <button
              type="button"
              className="practice-stage stage-weak"
              onClick={() => onStart(WEAK_STAGE.id, weakPool(weak))}
              disabled={!canDrawWeak(weak)}
            >
              <span className="practice-stage-label">{WEAK_STAGE.label}</span>
              <span className="practice-stage-sample" style={{ fontFamily: family }} aria-hidden="true">
                {canDrawWeak(weak) ? weak.slice(0, 4).map((w) => w.ch).join(' ') : '? ? ?'}
              </span>
              <span className="practice-stage-hint">
                {weak === null
                  ? '약점 글자를 찾는 중…'
                  : canDrawWeak(weak)
                    ? `${WEAK_STAGE.hint} ${weak.length}자`
                    : `연습을 더 하면 점수가 낮았던 글자가 여기 모여요 (지금 ${weak.length}자, ${ROUND_SIZE}자부터)`}
              </span>
              <span className="practice-stage-meta">
                {bestByStage.get(WEAK_STAGE.id) ? `최고 ${bestByStage.get(WEAK_STAGE.id).best}점 · ${bestByStage.get(WEAK_STAGE.id).count}판` : '아직 안 함'}
              </span>
            </button>
          </li>
        </ul>
        {weak?.length > 0 && (
          <div className="practice-weak">
            <button type="button" className="btn-quiet" aria-expanded={showWeak} onClick={() => setShowWeak((v) => !v)}>
              {showWeak ? '약점 글자 닫기' : '왜 약점인가요?'}
            </button>
            {showWeak && (
              <ul className="practice-weak-list" aria-label="약점 글자">
                {weak.map((w) => (
                  <li key={w.ch}>
                    <span className="practice-weak-ch" style={{ fontFamily: family }}>{w.ch}</span>
                    <span>평균 {w.average}점 · {w.count}번 · {WEAKEST[w.weakest] ?? ''}</span>
                  </li>
                ))}
              </ul>
            )}
            {showWeak && <p className="practice-weak-note">최근 30일 연습에서 평균 80점이 안 된 글자예요. 최근 3번 평균이 85점을 넘으면 목록에서 빠져요.</p>}
          </div>
        )}
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
