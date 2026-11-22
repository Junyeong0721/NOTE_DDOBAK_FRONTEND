import { useEffect, useState } from 'react'
import { copyPost, getPost, reportPost, setLike } from '../../api/community'
import { REPORT_REASONS, countLabel, publishedLabel } from '../../community/format'
import { summaryLines } from '../../note/summary'
import { BackIcon, HeartIcon } from '../Icons'
import Comments from './Comments'
import ReadOnlyPages from './ReadOnlyPages'

/** 공개 노트 하나: 정보·요약, 좋아요·가져오기·신고, 읽기 전용 필기, 댓글 */
export default function CommunityPost({ postId, onBack, onChange, onOpenNote }) {
  const [post, setPost] = useState(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [liking, setLiking] = useState(false)
  const [copied, setCopied] = useState(null) // 가져온 노트 id
  const [copying, setCopying] = useState(false)
  const [reporting, setReporting] = useState(false) // 신고 이유 고르는 중
  const [reason, setReason] = useState('')
  const [reportDone, setReportDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    setPost(null)
    setError('')
    getPost(postId).then((p) => !cancelled && setPost(p)).catch((e) => !cancelled && setError(e.message))
    window.scrollTo?.(0, 0)
    return () => {
      cancelled = true
    }
  }, [postId])

  function patch(change) {
    setPost((p) => ({ ...p, ...change }))
    onChange(postId, change)
  }

  async function toggleLike() {
    setLiking(true)
    setActionError('')
    try {
      const res = await setLike(postId, !post.liked)
      patch({ liked: res.liked, likeCount: res.likeCount })
    } catch (e) {
      setActionError(e.message)
    } finally {
      setLiking(false)
    }
  }

  async function copy() {
    setCopying(true)
    setActionError('')
    try {
      const res = await copyPost(postId)
      setCopied(res.noteId)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setCopying(false)
    }
  }

  async function report(e) {
    e.preventDefault()
    if (!reason) return
    setActionError('')
    try {
      await reportPost(postId, reason)
      setReportDone(true)
      setReporting(false)
      setPost((p) => ({ ...p, reported: true }))
    } catch (err) {
      setActionError(err.message)
    }
  }

  const back = (
    <button type="button" className="btn-quiet community-back" onClick={onBack}>
      <BackIcon /> 목록
    </button>
  )

  if (error) {
    return (
      <div className="community-post">
        {back}
        <p className="community-empty">{error}</p>
      </div>
    )
  }
  if (!post) {
    return (
      <div className="community-post">
        {back}
        <p className="community-muted">불러오는 중…</p>
      </div>
    )
  }

  const lines = summaryLines(post.summary)

  return (
    <article className="community-post" aria-labelledby="post-title">
      {back}
      <header className="post-head">
        <span className="subject-tag">{post.subject}</span>
        <h1 id="post-title">{post.title}</h1>
        <p className="post-meta">
          <strong>{post.author}</strong> {publishedLabel(post.publishedAt, post.updatedAt)}
        </p>
        {post.intro && <p className="post-intro">{post.intro}</p>}
      </header>

      {post.mine && post.hidden && (
        <p className="publish-alert" role="alert">신고가 쌓여 다른 회원에게는 숨겨졌어요. 나만 볼 수 있어요.</p>
      )}

      {lines.length > 0 && (
        <section className="post-summary" aria-label="AI 요약">
          <h2>AI 요약</h2>
          <ul>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </section>
      )}

      <div className="post-actions">
        {post.mine ? (
          <span className="post-like-count"><HeartIcon /> {countLabel(post.likeCount)}</span>
        ) : (
          <button
            type="button"
            className={`like-btn${post.liked ? ' on' : ''}`}
            aria-pressed={post.liked}
            disabled={liking}
            onClick={toggleLike}
          >
            <HeartIcon filled={post.liked} /> 좋아요 {countLabel(post.likeCount)}
          </button>
        )}
        {copied ? (
          <span className="copy-done" role="status">
            가져왔어요 <button type="button" className="btn-primary" onClick={() => onOpenNote(copied)}>열기</button>
          </span>
        ) : (
          <button type="button" onClick={copy} disabled={copying}>{copying ? '가져오는 중…' : '내 노트로 가져오기'}</button>
        )}
        {post.mine ? (
          post.noteId != null && (
            <button type="button" className="btn-quiet" onClick={() => onOpenNote(post.noteId)}>내 노트에서 공개 설정</button>
          )
        ) : post.reported || reportDone ? (
          <span className="community-muted">{reportDone ? '신고했어요. 알려 주셔서 고마워요.' : '신고한 노트예요.'}</span>
        ) : (
          <button type="button" className="btn-quiet report-btn" aria-expanded={reporting} onClick={() => setReporting((v) => !v)}>신고</button>
        )}
      </div>

      {reporting && (
        <form className="report-form" onSubmit={report}>
          <fieldset>
            <legend>어떤 문제가 있나요?</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r.id}>
                <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} />
                {r.label}
              </label>
            ))}
          </fieldset>
          <p className="community-muted">신고는 한 번만 할 수 있어요. 여러 회원이 신고하면 노트가 숨겨져요.</p>
          <div className="dialog-actions">
            <button type="button" onClick={() => setReporting(false)}>취소</button>
            <button type="submit" className="btn-danger" disabled={!reason}>신고하기</button>
          </div>
        </form>
      )}
      {actionError && <p className="error" role="alert">{actionError}</p>}

      <ReadOnlyPages content={post.content} />

      <Comments postId={postId} onCountChange={(n) => onChange(postId, { commentCount: n })} />
    </article>
  )
}
