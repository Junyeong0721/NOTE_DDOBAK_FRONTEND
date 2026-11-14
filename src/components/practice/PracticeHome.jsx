import { useEffect, useMemo, useState } from 'react'
import { getAttempt, listAttempts, listBest } from '../../api/practice'
import { fontById, fontFamily } from '../../note/fonts'
import { MAX_TEXT, isHangul, normalizeText } from '../../practice/cells'
import { STAGES, setsOf } from '../../practice/sets'
import FontPicker from './FontPicker'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** 연습 고르기: 글씨체 → 단계별 세트 또는 직접 입력 → 쓰기. 아래에는 최근 연습 */
export default function PracticeHome({ fontId, onFont, onStart, onReview }) {
  const [stage, setStage] = useState(STAGES[0].id)
  const [custom, setCustom] = useState('')
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

  const bestByText = useMemo(() => new Map(best.map((b) => [b.text, b])), [best])
  const customText = normalizeText(custom)
  const customOk = [...customText].some(isHangul)
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
      <p className="practice-lead">따라 쓸 글씨체를 고르고, 연한 글자 위에 써 보세요. 다 쓰면 점수와 조언을 알려 드려요.</p>

      <section className="practice-section" aria-labelledby="pf-title">
        <h2 id="pf-title">글씨체</h2>
        <FontPicker fontId={fontId} onChange={onFont} />
      </section>

      <section className="practice-section" aria-labelledby="ps-title">
        <h2 id="ps-title">연습할 글</h2>
        <div className="practice-tabs" role="tablist" aria-label="단계">
          {STAGES.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={stage === s.id} className={`practice-tab${stage === s.id ? ' selected' : ''}`} onClick={() => setStage(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <ul className="practice-sets">
          {setsOf(stage).map((s) => {
            const b = bestByText.get(s.text)
            return (
              <li key={s.id}>
                <button type="button" className="practice-set" onClick={() => onStart({ setId: s.id, text: s.text })}>
                  <span className="practice-set-text" style={{ fontFamily: family }}>{s.text}</span>
                  <span className="practice-set-meta">{b ? `최고 ${b.best}점 · ${b.count}번` : '아직 안 함'}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <form
          className="practice-custom"
          onSubmit={(e) => {
            e.preventDefault()
            if (customOk) onStart({ setId: null, text: customText })
          }}
        >
          <label htmlFor="practice-custom">직접 입력</label>
          <input
            id="practice-custom"
            type="text"
            value={custom}
            maxLength={MAX_TEXT * 2}
            placeholder="연습하고 싶은 글자나 문장"
            onChange={(e) => setCustom(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="btn-primary" disabled={!customOk}>시작</button>
          <small>
            {customText && !customOk
              ? '한글을 한 글자 이상 넣어 주세요.'
              : `한글 ${MAX_TEXT}자까지 (${[...customText].length}/${MAX_TEXT}). 영문·숫자는 칸만 보이고 채점하지 않아요.`}
          </small>
        </form>
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
                  <span className="practice-recent-text">{a.text}</span>
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
