// 노트 목록 거르기: 폴더(전체 / 미분류 / 폴더 id)와 제목 검색
export const ALL = 'all'
export const UNFILED = 'unfiled'

const folderOf = (note) => note.folderId ?? null

export function filterNotes(notes, { folder, query }) {
  const q = (query ?? '').trim().toLowerCase()
  return notes.filter((n) => {
    if (folder === UNFILED && folderOf(n) !== null) return false
    if (folder !== ALL && folder !== UNFILED && folderOf(n) !== folder) return false
    return q === '' || n.title.toLowerCase().includes(q)
  })
}

export function countByFolder(notes) {
  const counts = { all: notes.length, unfiled: 0 }
  for (const n of notes) {
    const f = folderOf(n)
    if (f === null) counts.unfiled += 1
    else counts[f] = (counts[f] ?? 0) + 1
  }
  return counts
}
