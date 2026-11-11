import { useEffect } from 'react'
import { FONTS, fontFamily } from '../note/fonts'

const SAMPLE = '또박또박 예쁜 글씨'

/** 설정: 목표 글씨체(보정·연습 모드 공용)와 자동 보정안. 바꾸는 즉시 이 기기에 저장된다. */
export default function SettingsDialog({ settings, onChange, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 id="settings-title">설정</h2>
        <fieldset className="field">
          <legend>목표 글씨체 — 보정과 연습 모드에 같이 쓰여요</legend>
          <div className="font-options" role="radiogroup" aria-label="목표 글씨체">
            {FONTS.map((f) => (
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
    </div>
  )
}
