import { useEffect, useRef, useState } from 'react'
import { DEFAULT_FONT_ID, fontFamily } from '../note/fonts'
import FontGallery from './FontGallery'
import { useAvailableFonts } from './useAvailableFonts'

const SAMPLE = '또박또박 예쁜 글씨'

/** 설정: 목표 글씨체(노트 보정)와 자동 보정안. 바꾸는 즉시 이 기기에 저장된다. */
export default function SettingsDialog({ settings, onChange, onClose }) {
  const { fonts } = useAvailableFonts()
  const [gallery, setGallery] = useState(false)
  const latest = useRef({ settings, onChange })
  latest.current = { settings, onChange }

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // 쓰던 글씨체를 [글씨체 더 보기]에서 뺐으면 기본 글씨체로 돌아간다
  const ids = fonts.map((f) => f.id).join()
  useEffect(() => {
    const { settings: s, onChange: change } = latest.current
    if (!fonts.some((f) => f.id === s.fontId)) change({ ...s, fontId: DEFAULT_FONT_ID })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 id="settings-title">설정</h2>
        <fieldset className="field">
          <legend>목표 글씨체 — 노트 보정에 쓰여요</legend>
          <div className="font-options" role="radiogroup" aria-label="목표 글씨체">
            {fonts.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={settings.fontId === f.id}
                className={`font-option${settings.fontId === f.id ? ' selected' : ''}`}
                onClick={() => onChange({ ...settings, fontId: f.id })}
              >
                <span className="font-sample" style={{ fontFamily: `${fontFamily(f.id)}, sans-serif` }}>{SAMPLE}</span>
                <span className="font-name">{f.label}<span className="font-note"> · {f.note}</span></span>
              </button>
            ))}
          </div>
          <button type="button" className="font-more" onClick={() => setGallery(true)}>＋ 글씨체 더 보기</button>
        </fieldset>
        <label className="switch-row">
          <input
            type="checkbox"
            checked={settings.autoSuggest}
            onChange={(e) => onChange({ ...settings, autoSuggest: e.target.checked })}
          />
          <span>
            줄을 다 쓰면 보정안 보여 주기
            <small>끄면 올가미로 고른 글씨만 보정해요. 하루 글자 인식 횟수를 아낄 수 있어요.</small>
          </span>
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn-primary" onClick={onClose}>완료</button>
        </div>
      </div>
      {gallery && <FontGallery onClose={() => setGallery(false)} />}
    </div>
  )
}
