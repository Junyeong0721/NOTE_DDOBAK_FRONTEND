// 커뮤니티 카드·보기에 쓰는 글 다듬기

/** 카드 한 줄: AI 요약 첫 줄 → 한 줄 소개 → 빈 글 */
export function cardLine(post) {
  const summary = (post.summaryLine ?? post.summary ?? '').split('\n').map((l) => l.trim()).find(Boolean)
  return summary || (post.intro ?? '').trim()
}

/** 숫자 줄여 쓰기: 999 → "999", 1234 → "1.2천", 12000 → "1.2만" */
export function countLabel(n) {
  const v = Number(n) || 0
  if (v < 1000) return String(v)
  if (v < 10000) return `${trim1(v / 1000)}천`
  return `${trim1(v / 10000)}만`
}

const trim1 = (x) => (Math.floor(x * 10) / 10).toFixed(1).replace(/\.0$/, '')

export const REPORT_REASONS = [
  { id: 'inappropriate', label: '부적절한 내용' },
  { id: 'spam', label: '광고·도배' },
  { id: 'other', label: '기타' },
]

const dateFormat = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

/** 공개 날짜. 정보·내용을 고쳤으면 "(업데이트 날짜 업데이트)"를 붙인다 */
export function publishedLabel(publishedAt, updatedAt) {
  const p = dateFormat.format(new Date(publishedAt))
  if (!updatedAt || new Date(updatedAt).getTime() - new Date(publishedAt).getTime() < 60_000) return `${p} 공개`
  return `${p} 공개 · ${dateFormat.format(new Date(updatedAt))} 업데이트`
}
