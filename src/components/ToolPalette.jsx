import { HIGHLIGHTER_COLORS, PEN_COLORS } from '../note/tools'
import { EraserIcon, GuidesIcon, HighlighterIcon, LassoIcon, LinesIcon, PenIcon, TidyIcon, FontIcon } from './Icons'

const TOOLS = [
  { key: 'pen', label: '펜', Icon: PenIcon },
  { key: 'highlighter', label: '형광펜', Icon: HighlighterIcon },
  { key: 'eraser', label: '지우개', Icon: EraserIcon },
  { key: 'lasso', label: '올가미', Icon: LassoIcon },
]
const SIZES = [
  { key: 'thin', label: '가늘게', dot: 4 },
  { key: 'normal', label: '보통', dot: 7 },
  { key: 'bold', label: '굵게', dot: 11 },
]

export default function ToolPalette({
  tool, onTool, penColor, onPenColor, highlighterColor, onHighlighterColor, size, onSize,
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
            {SIZES.map(({ key, label, dot }) => (
              <button
                key={key}
                type="button"
                className={`size${size === key ? ' selected' : ''}`}
                aria-label={label}
                aria-pressed={size === key}
                onClick={() => onSize(key)}
              >
                <span className="size-dot" style={{ width: dot, height: dot, background: current, opacity: tool === 'highlighter' ? 0.6 : 1 }} />
              </button>
            ))}
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
