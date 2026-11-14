import { FONTS, fontFamily } from '../../note/fonts'

/** 연습할 글씨체 고르기. 이름을 그 글씨체로 보여 준다 */
export default function FontPicker({ fontId, onChange }) {
  return (
    <div className="practice-fonts" role="radiogroup" aria-label="연습할 글씨체">
      {FONTS.map((f) => (
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
    </div>
  )
}
