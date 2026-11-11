import Logo from './Logo'

// 첫 화면 보정 시연: 흘려 쓴 글씨(손글씨 글꼴, 글자마다 기울기·높이가 제각각)가 반듯한 글씨체로 맞춰진다
const DEMO = '오늘 배운 내용 정리'
const JITTER = [[-7, 4], [5, -5], [0, 0], [-4, 6], [8, -3], [0, 0], [-6, -6], [6, 5], [0, 0], [-5, -2], [4, 7]] // 글자마다 [기울기 deg, 높이 px]
const jitter = (i) => JITTER[i % JITTER.length]

const FEATURES = [
  { color: 'var(--yellow)', title: '글씨 보정', text: '한 줄을 다 쓰면 고른 글씨체로 바꾼 보정안을 보여 줘요. 마음에 안 드는 글자만 원래대로 둘 수도 있어요.' },
  { color: 'var(--mint)', title: '노트 정리', text: '기울어진 줄은 반듯하게, 들쭉날쭉한 줄 시작은 가지런하게 맞춰요.' },
  { color: 'var(--sky)', title: '글씨 연습', text: '같은 글씨체를 따라 쓰면서 내 손글씨를 다듬어요.', soon: true },
]

export default function Landing({ onStart, onLogin }) {
  return (
    <div className="landing">
      <header className="landing-bar">
        <Logo />
        <button type="button" className="btn-quiet" onClick={onLogin}>로그인</button>
      </header>

      <main className="landing-main">
        <figure className="demo-paper" aria-label={`흘려 쓴 "${DEMO}"가 반듯한 글씨로 바뀌는 모습`}>
          <span className="demo-tabs" aria-hidden="true"><i /><i /><i /></span>
          <p className="demo-line demo-hand" aria-hidden="true">
            {[...DEMO].map((ch, i) => (
              <span key={i} style={{ '--r': `${jitter(i)[0]}deg`, '--y': `${jitter(i)[1]}px`, '--i': i }}>{ch === ' ' ? ' ' : ch}</span>
            ))}
          </p>
          <p className="demo-line demo-neat" aria-hidden="true">
            {[...DEMO].map((ch, i) => (
              <span key={i} style={{ '--r': `${jitter(i)[0]}deg`, '--y': `${jitter(i)[1]}px`, '--i': i }}>{ch === ' ' ? ' ' : ch}</span>
            ))}
          </p>
        </figure>

        <h1 className="landing-title">흘려 쓴 필기도 또박또박</h1>
        <p className="landing-lead">
          iPad에 쓴 글씨를 고른 글씨체로 바꾸고, 삐뚤어진 줄은 반듯하게 맞춰요. 원래 글씨는 지우지 않아서 언제든 되돌릴 수 있어요.
        </p>
        <div className="landing-actions">
          <button type="button" className="btn-primary btn-large" onClick={onStart}>무료로 시작하기</button>
          <button type="button" className="btn-large" onClick={onLogin}>이미 계정이 있어요</button>
        </div>

        <ul className="landing-features">
          {FEATURES.map((f) => (
            <li key={f.title} style={{ '--tab': f.color }}>
              <h2>{f.title}{f.soon && <span className="soon">곧 열려요</span>}</h2>
              <p>{f.text}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
