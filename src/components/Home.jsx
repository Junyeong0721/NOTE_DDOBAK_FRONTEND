import { FOLDER_COLORS } from '../api/folders'
import { PlusIcon, SettingsIcon } from './Icons'
import Logo from './Logo'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const RECENT = 4

/** 로그인 후 첫 화면: 최근 노트 이어 쓰기, 새 노트, 모든 노트, 글씨 연습 */
export default function Home({ user, notes, folders, loading, error, onOpen, onCreate, onShowAll, onPractice, onSettings, onLogout }) {
  const folderById = new Map(folders.map((f) => [f.id, f]))
  const recent = notes.slice(0, RECENT)

  return (
    <div className="home">
      <header className="landing-bar">
        <Logo />
        <div className="home-account">
          <button type="button" className="btn-quiet settings-btn" onClick={onSettings}>
            <SettingsIcon /> <span>설정·글씨체</span>
          </button>
          <button type="button" className="btn-quiet" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      <main className="home-main">
        <h1 className="home-title">안녕하세요, {user.nickname}님</h1>
        <div className="home-actions">
          <button type="button" className="btn-primary btn-large" onClick={onCreate}>
            <PlusIcon /> 새 노트
          </button>
          <button type="button" className="btn-large" onClick={onShowAll}>모든 노트 보기 ({notes.length})</button>
        </div>

        <section className="home-section" aria-labelledby="recent-title">
          <h2 id="recent-title">이어 쓰기</h2>
          {error && <p className="error">{error}</p>}
          {loading ? (
            <p className="home-empty">불러오는 중...</p>
          ) : recent.length === 0 ? (
            <p className="home-empty">아직 노트가 없어요. 새 노트로 첫 필기를 시작해 보세요.</p>
          ) : (
            <ul className="recent-notes">
              {recent.map((n) => {
                const folder = n.folderId != null ? folderById.get(n.folderId) : null
                return (
                  <li key={n.id}>
                    <button type="button" className="recent-note" onClick={() => onOpen(n.id)} style={{ '--tab': folder ? FOLDER_COLORS[folder.color] : 'var(--line-strong)' }}>
                      <span className="recent-thumb">{n.thumbnail && <img src={n.thumbnail} alt="" />}</span>
                      <span className="recent-title">{n.title}</span>
                      <span className="recent-meta">
                        <span className="recent-folder">{folder ? folder.name : '미분류'}</span>
                        <span>{dateFormat.format(new Date(n.updatedAt))}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="home-section" aria-labelledby="practice-title">
          <button type="button" className="practice-card" onClick={onPractice}>
            <h2 id="practice-title">글씨 연습</h2>
            <p>고른 글씨체를 칸에 따라 쓰면 점수와 조언을 알려 드려요.</p>
          </button>
        </section>
      </main>
    </div>
  )
}
