// 앱 전용 선 아이콘 (24×24, 선 굵기 1.8). 색은 currentColor를 따른다.
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export const PenIcon = () => (
  <svg {...base}><path d="M4 20l1.2-4.4L15.6 5.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.4 18.8z" /><path d="M13.8 7l3.2 3.2" /></svg>
)
export const HighlighterIcon = () => (
  <svg {...base}><path d="M9 14l-2.5 2.5V19h2.5L11.5 16.5" /><path d="M9 14l7.6-7.6a2 2 0 0 1 2.8 2.8L11.8 16.8z" /><path d="M4 21h8" /></svg>
)
export const EraserIcon = () => (
  <svg {...base}><path d="M8.5 19.5h11" /><path d="M5.2 15.3l8.9-8.9a2 2 0 0 1 2.8 0l2.1 2.1a2 2 0 0 1 0 2.8l-8.2 8.2H8.3l-3.1-3.1a.8.8 0 0 1 0-1.1z" /><path d="M9.6 10.9l5 5" /></svg>
)
export const LassoIcon = () => (
  <svg {...base}><path d="M7.5 17.5C4.6 16.3 3 14.2 3 12c0-4 4-7 9-7s9 3 9 7-4 7-9 7c-.9 0-1.8-.1-2.6-.3" strokeDasharray="2.6 2.6" /><path d="M8 15.5c1.4 0 2 1 1.6 2.2-.4 1.1-1.7 1.8-2.6 2.8" /></svg>
)
export const UndoIcon = () => (
  <svg {...base}><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
)
export const RedoIcon = () => (
  <svg {...base}><path d="M15 14l5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></svg>
)
export const BackIcon = () => (
  <svg {...base}><path d="M15 18l-6-6 6-6" /></svg>
)
export const PlusIcon = () => (
  <svg {...base}><path d="M12 5v14M5 12h14" /></svg>
)
export const SearchIcon = () => (
  <svg {...base}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>
)
export const MoreIcon = () => (
  <svg {...base}><circle cx="6" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="18" cy="12" r="1" fill="currentColor" /></svg>
)
export const EditIcon = () => (
  <svg {...base}><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M13.5 8.5l3 3" /></svg>
)
export const GuidesIcon = () => (
  <svg {...base}><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M7.5 8.5h9M7.5 12h9M7.5 15.5h9" /></svg>
)
export const LinesIcon = () => (
  <svg {...base}><rect x="3.5" y="5" width="11" height="5" rx="1" strokeDasharray="2 2" /><rect x="3.5" y="14" width="17" height="5" rx="1" strokeDasharray="2 2" /></svg>
)
export const TidyIcon = () => (
  <svg {...base}><path d="M4 7h12M4 12h16M4 17h9" /><path d="M18.5 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="currentColor" stroke="none" /></svg>
)
export const ZoomOutIcon = () => (
  <svg {...base}><path d="M6 12h12" /></svg>
)
export const ZoomInIcon = () => (
  <svg {...base}><path d="M12 6v12M6 12h12" /></svg>
)
export const TrashIcon = () => (
  <svg {...base}><path d="M5 7h14M10 7V5h4v2M7 7l.8 12h8.4L17 7" /></svg>
)
export const SettingsIcon = () => (
  <svg {...base}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></svg>
)
export const FontIcon = () => (
  <svg {...base}><path d="M4 19l5-14h1l5 14" /><path d="M6.2 13.5h6.6" /><path d="M17 11v8" /><path d="M15 11.5c1.5-1 4-1 4 1.2V19" /></svg>
)
