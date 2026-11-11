import { FOLDER_COLORS } from '../api/folders'
import { ALL, UNFILED } from '../note/filterNotes'
import { PlusIcon } from './Icons'
import Logo from './Logo'

// 바인더 인덱스 탭처럼 폴더마다 왼쪽에 형광펜 색 띠를 붙인다
function FolderTab({ label, color, count, selected, onSelect, variant }) {
  return (
    <li>
      <button
        type="button"
        className={`folder-tab${variant ? ` folder-tab-${variant}` : ''}${selected ? ' selected' : ''}`}
        style={{ '--tab': color }}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
      >
        <span className="folder-tab-name">{label}</span>
        <span className="folder-tab-count">{count}</span>
      </button>
    </li>
  )
}

export default function FolderSidebar({ folders, counts, selected, onSelect, onCreateFolder, onHome }) {
  return (
    <nav className="sidebar" aria-label="폴더">
      <div className="sidebar-logo">
        <button type="button" className="btn-quiet logo-home" aria-label="홈으로" onClick={onHome}>
          <Logo />
        </button>
      </div>
      <ul className="folder-tabs">
        <FolderTab label="전체 노트" variant="all" color="var(--yellow)" count={counts.all} selected={selected === ALL} onSelect={() => onSelect(ALL)} />
        {folders.map((f) => (
          <FolderTab
            key={f.id}
            label={f.name}
            color={FOLDER_COLORS[f.color]}
            count={counts[f.id] ?? 0}
            selected={selected === f.id}
            onSelect={() => onSelect(f.id)}
          />
        ))}
        <FolderTab label="미분류" color="var(--line-strong)" count={counts.unfiled} selected={selected === UNFILED} onSelect={() => onSelect(UNFILED)} />
      </ul>
      <button type="button" className="btn-quiet add-folder" onClick={onCreateFolder}>
        <PlusIcon /> 폴더 추가
      </button>
    </nav>
  )
}
