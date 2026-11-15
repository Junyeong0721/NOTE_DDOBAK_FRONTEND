import { useEffect, useRef, useState } from 'react'
import { DEFAULT_FONT_ID, fontFamily } from '../../note/fonts'
import FontGallery from '../FontGallery'
import { useAvailableFonts } from '../useAvailableFonts'

/** 연습할 글씨체 고르기. 이름을 그 글씨체로 보여 주고, 끝에 [글씨체 더 보기] */
export default function FontPicker({ fontId, onChange }) {
  const { fonts } = useAvailableFonts()
  const [gallery, setGallery] = useState(false)
  const latest = useRef({ fontId, onChange })
  latest.current = { fontId, onChange }

  // 쓰던 글씨체를 뺐으면 기본 글씨체로
  const ids = fonts.map((f) => f.id).join()
  useEffect(() => {
    const { fontId: cur, onChange: change } = latest.current
    if (!fonts.some((f) => f.id === cur)) change(DEFAULT_FONT_ID)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])

  return (
    <>
      <div className="practice-fonts" role="radiogroup" aria-label="연습할 글씨체">
        {fonts.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={fontId === f.id}
            className={`practice-font${fontId === f.id ? ' selected' : ''}`}
            style={{ fontFamily: `${fontFamily(f.id)}, sans-serif` }}
            onClick={() => onChange(f.id)}
          >
            {f.label}
          </button>
        ))}
        <button type="button" className="practice-font more" onClick={() => setGallery(true)}>＋ 더 보기</button>
      </div>
      {gallery && <FontGallery onClose={() => setGallery(false)} />}
    </>
  )
}
