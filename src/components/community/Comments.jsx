import { useEffect, useState } from 'react'
import { addComment, deleteComment, listComments } from '../../api/community'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const MAX = 500

/** 댓글 목록 + 쓰기. 내 댓글과 내 노트에 달린 댓글엔 [삭제] */
export default function Comments({ postId, onCountChange }) {
  const [comments, setComments] = useState(null)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    listComments(postId).then((c) => !cancelled && setComments(c)).catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [postId])

  async function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setError('')
    try {
      const c = await addComment(postId, text)
      const next = [...(comments ?? []), c]
      setComments(next)
      onCountChange(next.length)
      setText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    if (!window.confirm('이 댓글을 지울까요?')) return
    try {
      await deleteComment(postId, id)
      const next = comments.filter((c) => c.id !== id)
      setComments(next)
      onCountChange(next.length)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="comments" aria-labelledby="comments-title">
      <h2 id="comments-title">댓글 {comments ? comments.length : ''}</h2>
      {comments === null && !error && <p className="community-muted">불러오는 중…</p>}
      {comments?.length === 0 && <p className="community-muted">아직 댓글이 없어요. 첫 댓글을 남겨 보세요.</p>}
      {comments?.length > 0 && (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id} className={c.mine ? 'mine' : ''}>
              <div className="comment-head">
                <strong>{c.author}</strong>
                <time dateTime={c.createdAt}>{dateFormat.format(new Date(c.createdAt))}</time>
                {c.canDelete && (
                  <button type="button" className="btn-quiet comment-delete" onClick={() => remove(c.id)}>삭제</button>
                )}
              </div>
              <p>{c.body}</p>
            </li>
          ))}
        </ul>
      )}
      <form className="comment-form" onSubmit={submit}>
        <label className="sr-only" htmlFor="comment-input">댓글 쓰기</label>
        <textarea
          id="comment-input"
          value={text}
          maxLength={MAX}
          rows={2}
          placeholder="고마움이나 궁금한 점을 남겨 보세요"
          onChange={(e) => setText(e.target.value)}
        />
        <div className="comment-form-foot">
          <small>{text.length}/{MAX}</small>
          <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>댓글 달기</button>
        </div>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  )
}
