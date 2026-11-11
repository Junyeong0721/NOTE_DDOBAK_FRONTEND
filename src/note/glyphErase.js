// 보정 글자 부분 지우기. 보정 글자는 글꼴로 그린 글자라 획이 없으므로,
// 지우개가 지나간 자리를 그 글자 기준 좌표(가운데에서의 거리 ÷ 글자 크기)로 글자에 기억해 두고 그릴 때 빼고 그린다.
// 글자 기준이라 노트 정리·이동·크기 맞춤으로 글자가 움직여도 지운 자리가 따라간다.
import { distToSegment } from './geometry'

/** 글자 칸의 이만큼 이상을 지우면 글자를 아예 없앤다 (숨은 원래 획도 같이) */
export const COVERED_RATIO = 0.85
const GRID = 10

/** 화면에 보이는 글자 칸 (페이지 좌표). 한글 글자는 대략 크기의 1.1배 폭, 1.2배 높이 안에 그려진다 */
export function glyphCell(g) {
  const half = Math.min(g.maxWidth ?? Infinity, g.size * 1.1) / 2
  const halfH = g.size * 0.6
  return { minX: g.x - half, maxX: g.x + half, minY: g.y - halfH, maxY: g.y + halfH }
}

/** 점과 상자 사이 거리 (안이면 0) */
function distToBox(x, y, box) {
  const dx = Math.max(box.minX - x, 0, x - box.maxX)
  const dy = Math.max(box.minY - y, 0, y - box.maxY)
  return Math.hypot(dx, dy)
}

/** 지우개(a→b, 반지름 r)가 글자 칸에 닿는지 */
export function glyphHit(g, a, b, r) {
  const cell = glyphCell(g)
  for (const p of samples(a, b, r)) if (distToBox(p.x, p.y, cell) <= r) return true
  // 칸 모서리가 선분 가까이 있는 경우
  const corners = [[cell.minX, cell.minY], [cell.maxX, cell.minY], [cell.minX, cell.maxY], [cell.maxX, cell.maxY]]
  return corners.some(([x, y]) => distToSegment(x, y, [a.x, a.y], [b.x, b.y]) <= r)
}

/** 선분 위에 반지름의 절반 간격으로 놓은 점들 */
function samples(a, b, r) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (r * 0.5)))
  return Array.from({ length: n + 1 }, (_, k) => ({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n }))
}

const r3 = (n) => Math.round(n * 1000) / 1000

function coverage(g, cuts) {
  const cell = glyphCell(g)
  let covered = 0
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const x = cell.minX + ((i + 0.5) / GRID) * (cell.maxX - cell.minX)
      const y = cell.minY + ((j + 0.5) / GRID) * (cell.maxY - cell.minY)
      const u = (x - g.x) / g.size
      const v = (y - g.y) / g.size
      if (cuts.some((c) => Math.hypot(u - c.dx, v - c.dy) <= c.r)) covered += 1
    }
  }
  return covered / (GRID * GRID)
}

/**
 * 지우개 a→b가 지나간 보정 글자에 지운 자리(cuts)를 더한다.
 * glyphs: correctionGlyphs 결과 (ref로 어느 보정의 몇 번째 글자인지 안다)
 * 반환: { corrections, changed, removeStrokeIds(다 지워져 없앤 글자의 숨은 획) }
 */
export function eraseGlyphs(corrections, glyphs, a, b, r) {
  const added = new Map() // `${cid}:${index}` → 새 cuts
  for (const g of glyphs) {
    if (!glyphHit(g, a, b, r)) continue
    const cell = glyphCell(g)
    const cuts = samples(a, b, r)
      .filter((p) => distToBox(p.x, p.y, cell) <= r)
      .map((p) => ({ dx: r3((p.x - g.x) / g.size), dy: r3((p.y - g.y) / g.size), r: r3(r / g.size) }))
    if (cuts.length) added.set(`${g.ref.cid}:${g.ref.index}`, { g, cuts })
  }
  if (added.size === 0) return { corrections, changed: false, removeStrokeIds: [] }

  const removeStrokeIds = []
  const next = corrections.map((c) => {
    let touched = false
    const chars = []
    c.chars.forEach((ch, index) => {
      const hit = added.get(`${c.id}:${index}`)
      if (!hit) {
        chars.push(ch)
        return
      }
      touched = true
      const cuts = [...(ch.cuts ?? []), ...hit.cuts]
      if (coverage(hit.g, cuts) >= COVERED_RATIO) removeStrokeIds.push(...ch.strokeIds) // 거의 다 지움 → 글자째 없앰
      else chars.push({ ...ch, cuts })
    })
    return touched ? { ...c, chars } : c
  })
  return { corrections: next.filter((c) => c.chars.length > 0), changed: true, removeStrokeIds }
}
