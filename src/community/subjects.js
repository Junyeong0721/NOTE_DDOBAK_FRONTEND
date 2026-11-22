// 공개 창의 과목 추천: 이 노트의 폴더 이름을 먼저, 그다음 커뮤니티에 이미 있는 과목(많은 순)
export const SUBJECT_MAX = 30
export const SUGGEST_LIMIT = 8

const clean = (s) => (s ?? '').trim().replace(/\s+/g, ' ')

/** folderName: 노트의 폴더 이름(없으면 null), communitySubjects: [{ subject, count }] → 과목 이름 최대 8개 (같은 이름은 한 번) */
export function suggestSubjects(folderName, communitySubjects = []) {
  const out = []
  const seen = new Set()
  for (const raw of [folderName, ...communitySubjects.map((s) => s.subject)]) {
    const name = clean(raw)
    if (!name || name.length > SUBJECT_MAX) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
    if (out.length >= SUGGEST_LIMIT) break
  }
  return out
}
