import { useEffect, useRef, useState } from 'react'
import { getPublish, listSubjects, savePublish, unpublish } from '../api/community'
import { countLabel } from '../community/format'
import { SUBJECT_MAX, suggestSubjects } from '../community/subjects'

/**
 * 노트 안 [공개] 창. 공개하면 지금 모습이 복사돼 고정되고, [공개본 업데이트]를 눌러야 바뀐다.
 * saving: 자동 저장이 아직 안 끝났으면 공개·업데이트를 잠시 막는다 (서버에 있는 노트가 복사되므로)
 */
export default function PublishDialog({ noteId, noteTitle, folderName, hasWriting, hasSummary, saving, onViewPost, onClose }) {
  const [status, setStatus] = useState(null) // 서버 공개 상태
  const [loadError, setLoadError] = useState('')
  const [subjects, setSubjects] = useState([])
  const [title, setTitle] = useState(noteTitle)
  const [subject, setSubject] = useState(folderName ?? '')
  const [intro, setIntro] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmStop, setConfirmStop] = useState(false)
  const titleRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    getPublish(noteId)
      .then((s) => {
        if (cancelled) return
        setStatus(s)
        if (s.published) {
          setTitle(s.title)
          setSubject(s.subject)
          setIntro(s.intro ?? '')
        }
      })
      .catch((e) => !cancelled && setLoadError(e.message))
    listSubjects().then((list) => !cancelled && setSubjects(list)).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [noteId])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (status) titleRef.current?.focus()
  }, [status])

  const published = Boolean(status?.published)
  const suggestions = suggestSubjects(folderName, subjects).filter((s) => s !== subject.trim())

  async function run(fn, doneMessage) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await fn()
      if (doneMessage) setNotice(doneMessage)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  function validate() {
    if (!title.trim()) return '제목을 입력해 주세요.'
    if (!subject.trim()) return '과목을 입력해 주세요.'
    return ''
  }

  function submit(e, refreshContent = false) {
    e?.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    const first = !published
    run(async () => {
      const next = await savePublish(noteId, { title, subject, intro, refreshContent: first || refreshContent })
      setStatus(next)
      setTitle(next.title)
      setSubject(next.subject)
      setIntro(next.intro ?? '')
    }, first ? '공개했어요. 커뮤니티에서 다른 회원이 볼 수 있어요.' : refreshContent ? '공개본을 지금 노트로 바꿨어요.' : '저장했어요.')
  }

  function stop() {
    run(async () => {
      await unpublish(noteId)
      setStatus({ published: false })
      setConfirmStop(false)
    }, '공개를 그만했어요.')
  }

  const blockedBySave = saving ? '저장이 끝나면 할 수 있어요.' : ''

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog publish-dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title" onSubmit={submit}>
        <h2 id="publish-title">{published ? '커뮤니티에 공개 중' : '커뮤니티에 공개'}</h2>

        {loadError && <p className="error">{loadError}</p>}
        {!status && !loadError && <p className="publish-hint">불러오는 중…</p>}

        {status && (
          <>
            {published ? (
              <div className="publish-stats" aria-label="반응">
                <span>♥ {countLabel(status.likeCount)}</span>
                <span>댓글 {countLabel(status.commentCount)}</span>
                <span>가져감 {countLabel(status.copyCount)}</span>
              </div>
            ) : (
              <p className="publish-hint">
                지금 노트 모습 그대로 또박 회원에게 공개돼요. 노트를 고쳐도 [공개본 업데이트]를 누르기 전에는 공개본이 바뀌지 않아요.
              </p>
            )}

            {published && status.hidden && (
              <p className="publish-alert" role="alert">신고가 쌓여 다른 회원에게는 숨겨졌어요. 나만 볼 수 있어요.</p>
            )}
            {published && status.outdated && (
              <div className="publish-outdated">
                <p>공개한 뒤에 노트가 바뀌었어요.</p>
                <button type="button" onClick={() => submit(null, true)} disabled={busy || Boolean(blockedBySave) || !hasWriting}>
                  공개본 업데이트
                </button>
              </div>
            )}

            <label className="field">
              <span>제목</span>
              <input ref={titleRef} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="field">
              <span>과목</span>
              <input value={subject} maxLength={SUBJECT_MAX} placeholder="예: 수학" onChange={(e) => setSubject(e.target.value)} />
            </label>
            {suggestions.length > 0 && (
              <div className="subject-chips" aria-label="과목 추천">
                {suggestions.map((s) => (
                  <button key={s} type="button" className="subject-chip" onClick={() => setSubject(s)}>{s}</button>
                ))}
              </div>
            )}
            <label className="field">
              <span>한 줄 소개 (선택)</span>
              <input value={intro} maxLength={200} placeholder="예: 2강 극한 정의와 예제 3개" onChange={(e) => setIntro(e.target.value)} />
            </label>
            {!published && hasSummary && <p className="publish-hint">AI 요약도 같이 공개돼요.</p>}
            {!published && !hasWriting && <p className="error">필기가 있어야 공개할 수 있어요.</p>}
            {blockedBySave && <p className="publish-hint" role="status">{blockedBySave}</p>}
            {error && <p className="error" role="alert">{error}</p>}
            {notice && <p className="publish-notice" role="status">{notice}</p>}

            {confirmStop ? (
              <div className="publish-confirm" role="alert">
                <p>공개를 그만하면 받은 좋아요와 댓글도 함께 사라져요.</p>
                <div className="dialog-actions">
                  <button type="button" onClick={() => setConfirmStop(false)}>취소</button>
                  <button type="button" className="btn-danger" onClick={stop} disabled={busy}>공개 그만하기</button>
                </div>
              </div>
            ) : (
              <div className="dialog-actions publish-actions">
                {published && (
                  <>
                    <button type="button" className="btn-quiet btn-danger dialog-delete" onClick={() => setConfirmStop(true)}>공개 그만하기</button>
                    <button type="button" onClick={() => onViewPost(status.postId)}>커뮤니티에서 보기</button>
                  </>
                )}
                {!published && <button type="button" onClick={onClose}>닫기</button>}
                <button type="submit" className="btn-primary" disabled={busy || (!published && (!hasWriting || Boolean(blockedBySave)))}>
                  {published ? '저장' : '공개하기'}
                </button>
              </div>
            )}
          </>
        )}
      </form>
    </div>
  )
}
