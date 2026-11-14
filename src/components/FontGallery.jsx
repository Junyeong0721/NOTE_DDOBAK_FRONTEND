import { useEffect, useRef, useState } from 'react'
import { ALL_FONTS, FONT_GROUPS, fontFamily } from '../note/fonts'
import { setFontAdded } from '../note/myFonts'
import { useAvailableFonts } from './useAvailableFonts'

const SAMPLE = '오늘 배운 내용 정리하기'

/** 화면에 보일 때만 그 글씨체로 그린다 (글씨체 파일은 0.2~2.6MB라 한꺼번에 받지 않게) */
function Preview({ fontId }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return undefined
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setSeen(true)
        io.disconnect()
      }
    }, { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <span ref={ref} className={`gallery-sample${seen ? '' : ' waiting'}`} style={seen ? { fontFamily: `${fontFamily(fontId)}, sans-serif` } : undefined}>
      {SAMPLE}
    </span>
  )
}

/**
 * 글씨체 더 보기: 무료 한글 글씨체를 미리 보고 내 목록에 추가하거나 뺀다.
 * 추가한 글씨체는 설정(노트 보정)과 글씨 연습의 글씨체 고르기에 나온다. 기본 글씨체 5종은 늘 있다.
 */
export default function FontGallery({ onClose }) {
  const { added } = useAvailableFonts()
  const on = new Set(added)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className="dialog-backdrop gallery-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog gallery-dialog" role="dialog" aria-modal="true" aria-labelledby="gallery-title">
        <div className="gallery-head">
          <h2 id="gallery-title">글씨체 더 보기</h2>
          <p>마음에 드는 글씨체를 추가하면 노트 보정과 글씨 연습에서 고를 수 있어요. 모두 무료 글꼴이에요.</p>
        </div>
        <div className="gallery-body">
          {FONT_GROUPS.map((g) => (
            <section key={g.id} className="gallery-group" aria-labelledby={`gallery-${g.id}`}>
              <h3 id={`gallery-${g.id}`}>{g.label}</h3>
              <ul>
                {ALL_FONTS.filter((f) => f.group === g.id).map((f) => {
                  const has = f.base || on.has(f.id)
                  return (
                    <li key={f.id} className={`gallery-item${has ? ' added' : ''}`}>
                      <Preview fontId={f.id} />
                      <span className="gallery-name">
                        {f.label}
                        <span className="font-note"> · {f.note}</span>
                      </span>
                      {f.base ? (
                        <span className="gallery-badge">기본</span>
                      ) : (
                        <button
                          type="button"
                          className={has ? 'gallery-toggle on' : 'gallery-toggle'}
                          aria-pressed={has}
                          aria-label={has ? `${f.label} 빼기` : `${f.label} 추가`}
                          onClick={() => setFontAdded(f.id, !has)}
                        >
                          {has ? '추가됨' : '추가'}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn-primary" onClick={onClose}>완료</button>
        </div>
      </div>
    </div>
  )
}
