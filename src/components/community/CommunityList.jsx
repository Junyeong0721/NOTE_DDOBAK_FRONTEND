import { cardLine, countLabel } from '../../community/format'
import { HeartIcon, SearchIcon } from '../Icons'

/** 검색·정렬·과목 칩 + 카드 목록 (상태는 Community가 갖는다) */
export default function CommunityList({ filters, onFilters, subjects, items, hasMore, loading, error, onMore, onOpen }) {
  const { sort, subject, q } = filters
  const filtered = Boolean(subject || q.trim())

  return (
    <div className="community-list">
      <div className="community-tools">
        <label className="search community-search">
          <SearchIcon />
          <input
            type="search"
            value={q}
            maxLength={50}
            placeholder="제목·과목·소개·요약에서 찾기"
            aria-label="공개 노트 검색"
            onChange={(e) => onFilters({ q: e.target.value })}
          />
        </label>
        <div className="sort-toggle" role="group" aria-label="정렬">
          <button type="button" aria-pressed={sort === 'latest'} onClick={() => onFilters({ sort: 'latest' })}>최신순</button>
          <button type="button" aria-pressed={sort === 'popular'} onClick={() => onFilters({ sort: 'popular' })}>인기순</button>
        </div>
      </div>

      {subjects.length > 0 && (
        <div className="subject-chips community-subjects" role="group" aria-label="과목">
          <button type="button" className="subject-chip" aria-pressed={!subject} onClick={() => onFilters({ subject: '' })}>전체</button>
          {subjects.map((s) => (
            <button
              key={s.subject}
              type="button"
              className="subject-chip"
              aria-pressed={subject === s.subject}
              onClick={() => onFilters({ subject: subject === s.subject ? '' : s.subject })}
            >
              {s.subject} <small>{countLabel(s.count)}</small>
            </button>
          ))}
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      {!error && items.length === 0 && !loading && (
        <p className="community-empty">
          {filtered ? '조건에 맞는 노트가 없어요. 검색어나 과목을 바꿔 보세요.' : '아직 공개된 노트가 없어요. 노트 안의 [공개]로 첫 노트를 나눠 보세요.'}
        </p>
      )}

      <ul className="post-grid">
        {items.map((p) => {
          const line = cardLine(p)
          return (
            <li key={p.id}>
              <button type="button" className="post-card" onClick={() => onOpen(p.id)}>
                <span className="post-thumb">
                  {p.thumbnail && <img src={p.thumbnail} alt="" loading="lazy" />}
                  {p.mine && <span className="mine-badge">{p.hidden ? '내 노트 · 숨겨짐' : '내 노트'}</span>}
                </span>
                <span className="subject-tag">{p.subject}</span>
                <span className="post-card-title">{p.title}</span>
                {line && <span className="post-card-line">{line}</span>}
                <span className="post-card-meta">
                  <span className="post-card-author">{p.author}</span>
                  <span className={`post-card-likes${p.liked ? ' on' : ''}`} aria-label={`좋아요 ${p.likeCount}`}>
                    <HeartIcon filled={p.liked} /> {countLabel(p.likeCount)}
                  </span>
                  <span aria-label={`댓글 ${p.commentCount}`}>댓글 {countLabel(p.commentCount)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {loading && <p className="community-muted">불러오는 중…</p>}
      {hasMore && !loading && (
        <button type="button" className="community-more" onClick={onMore}>더 보기</button>
      )}
    </div>
  )
}
