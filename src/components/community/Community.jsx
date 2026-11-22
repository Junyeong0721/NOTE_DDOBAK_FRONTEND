import { useCallback, useEffect, useRef, useState } from 'react'
import { listPosts, listSubjects } from '../../api/community'
import { BackIcon } from '../Icons'
import Logo from '../Logo'
import CommunityList from './CommunityList'
import CommunityPost from './CommunityPost'
import './Community.css'

const SEARCH_DELAY_MS = 300

/** 커뮤니티: 목록과 공개 노트 보기. postId가 있으면 그 노트를 연다 */
export default function Community({ postId, onPostId, onExit, onOpenNote }) {
  const [filters, setFilters] = useState({ sort: 'latest', subject: '', q: '' })
  const [subjects, setSubjects] = useState([])
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestRef = useRef(0)

  const load = useCallback(async (f, p) => {
    const id = ++requestRef.current
    setLoading(true)
    setError('')
    try {
      const res = await listPosts({ ...f, page: p })
      if (id !== requestRef.current) return // 더 새 요청이 있으면 버린다
      setItems((prev) => (p === 0 ? res.items : [...prev, ...res.items.filter((x) => !prev.some((y) => y.id === x.id))]))
      setHasMore(res.hasMore)
      setPage(p)
    } catch (e) {
      if (id === requestRef.current) setError(e.message)
    } finally {
      if (id === requestRef.current) setLoading(false)
    }
  }, [])

  // 조건이 바뀌면 첫 페이지부터 (검색어는 잠깐 기다렸다가)
  useEffect(() => {
    const t = setTimeout(() => load(filters, 0), filters.q ? SEARCH_DELAY_MS : 0)
    return () => clearTimeout(t)
  }, [filters, load])

  useEffect(() => {
    listSubjects().then(setSubjects).catch(() => {})
  }, [])

  const changePost = useCallback((id, change) => {
    setItems((list) => list.map((p) => (p.id === id ? { ...p, ...change } : p)))
  }, [])

  return (
    <div className="community">
      <header className="landing-bar">
        <Logo />
        <button type="button" className="btn-quiet" onClick={onExit}>
          <BackIcon /> 홈
        </button>
      </header>
      <main className="community-main">
        <div hidden={postId != null}>
          <h1 className="community-title">커뮤니티</h1>
          <p className="community-lead">또박 회원들이 공개한 필기 노트예요. 마음에 들면 내 노트로 가져가 이어 쓸 수 있어요.</p>
          <CommunityList
            filters={filters}
            onFilters={(change) => setFilters((f) => ({ ...f, ...change }))}
            subjects={subjects}
            items={items}
            hasMore={hasMore}
            loading={loading}
            error={error}
            onMore={() => load(filters, page + 1)}
            onOpen={onPostId}
          />
        </div>
        {postId != null && (
          <CommunityPost postId={postId} onBack={() => onPostId(null)} onChange={changePost} onOpenNote={onOpenNote} />
        )}
      </main>
    </div>
  )
}
