import { ERASER_SIZE, HIGHLIGHTER_COLORS, HIGHLIGHTER_WIDTH, PEN_COLORS, PEN_WIDTH } from '../note/tools'
import { EraserIcon, GuidesIcon, HighlighterIcon, LassoIcon, LinesIcon, PenIcon, TidyIcon, FontIcon } from './Icons'

const TOOLS = [
  { key: 'pen', label: '펜', Icon: PenIcon },
  { key: 'highlighter', label: '형광펜', Icon: HighlighterIcon },
  { key: 'eraser', label: '지우개', Icon: EraserIcon },
  { key: 'lasso', label: '올가미', Icon: LassoIcon },
]
/** 슬라이더 하나: 왼쪽에 지금 굵기 미리보기, 오른쪽에 숫자 */
function SizeSlider({ label, range, value, onChange, preview }) {
  return (
    <label className="size-slider">
      <span className="size-preview" aria-hidden="true">{preview}</span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output className="size-value">{range.step < 1 ? value.toFixed(1) : value}</output>
    </label>
  )
}

export default function ToolPalette({
  tool, onTool, penColor, onPenColor, highlighterColor, onHighlighterColor, prefs, onPref,
  showGuides, onToggleGuides, showLines, onToggleLines, tidied, onTidy, onOpenSettings,
}) {
  const drawing = tool === 'pen' || tool === 'highlighter'
  const colors = tool === 'highlighter' ? HIGHLIGHTER_COLORS : PEN_COLORS
  const current = tool === 'highlighter' ? highlighterColor : penColor
  const pickColor = tool === 'highlighter' ? onHighlighterColor : onPenColor

  return (
    <div className="palette" role="toolbar" aria-label="필기 도구">
      <div className="palette-group">
        {TOOLS.map(({ key, label, Icon }) => (
          <button key={key} type="button" className={`tool${tool === key ? ' active' : ''}`} aria-pressed={tool === key} onClick={() => onTool(key)}>
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {drawing && (
        <>
          <div className="palette-group" role="group" aria-label="색">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className={`ink${current === c ? ' selected' : ''}${tool === 'highlighter' ? ' ink-highlighter' : ''}`}
                style={{ '--ink-color': c }}
                aria-label={`색 ${c}`}
                aria-pressed={current === c}
                onClick={() => pickColor(c)}
              />
            ))}
          </div>
          <div className="palette-group" role="group" aria-label="굵기">
            {tool === 'highlighter' ? (
              <SizeSlider
                label="형광펜 굵기"
                range={HIGHLIGHTER_WIDTH}
                value={prefs.highlighterWidth}
                onChange={(v) => onPref('highlighterWidth', v)}
                preview={<span className="size-dot" style={{ width: 4 + prefs.highlighterWidth * 0.45, height: 4 + prefs.highlighterWidth * 0.45, background: current, opacity: 0.6 }} />}
              />
            ) : (
              <SizeSlider
                label="펜 굵기"
                range={PEN_WIDTH}
                value={prefs.penWidth}
                onChange={(v) => onPref('penWidth', v)}
                preview={<span className="size-dot" style={{ width: 2 + prefs.penWidth * 2.2, height: 2 + prefs.penWidth * 2.2, background: current }} />}
              />
            )}
          </div>
        </>
      )}

      {tool === 'eraser' && (
        <>
          <div className="palette-group segmented" role="radiogroup" aria-label="지우개 방식">
            {[['part', '지나간 부분'], ['stroke', '획 전체']].map(([key, label]) => (
              <button key={key} type="button" role="radio" aria-checked={prefs.eraserMode === key} className={prefs.eraserMode === key ? 'selected' : ''} onClick={() => onPref('eraserMode', key)}>
                {label}
              </button>
            ))}
          </div>
          <div className="palette-group" role="group" aria-label="지우개 크기">
            <SizeSlider
              label="지우개 크기"
              range={ERASER_SIZE}
              value={prefs.eraserSize}
              onChange={(v) => onPref('eraserSize', v)}
              preview={<span className="eraser-dot" style={{ width: 6 + prefs.eraserSize * 0.35, height: 6 + prefs.eraserSize * 0.35 }} />}
            />
          </div>
        </>
      )}

      <div className="palette-group palette-view">
        <button type="button" className={`tool${showGuides ? ' active' : ''}`} aria-pressed={showGuides} onClick={onToggleGuides}>
          <GuidesIcon />
          <span>가이드 줄</span>
        </button>
        <button type="button" className={`tool${showLines ? ' active' : ''}`} aria-pressed={showLines} onClick={onToggleLines}>
          <LinesIcon />
          <span>줄 보기</span>
        </button>
        <button type="button" className="tool" onClick={onOpenSettings}>
          <FontIcon />
          <span>글씨체</span>
        </button>
        <button type="button" className={`tool${tidied ? ' active' : ''}`} aria-pressed={tidied} onClick={onTidy}>
          <TidyIcon />
          <span>{tidied ? '정리 취소' : '노트 정리'}</span>
        </button>
      </div>
    </div>
  )
}
