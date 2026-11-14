// 연습 채점: 목표 글자와 내 글씨를 64×64 모눈(1 = 잉크) 두 장으로 받아 점수를 낸다. 브라우저 없이도 도는 순수 계산.
// 모양 50 + 위치·크기 25 + 기울기 25. 획순은 보지 않는다.

/** 채점 기준값. 실제 손글씨로 확인하면서 여기만 조정한다 */
export const SCORE_TUNING = {
  GRID: 64, // 칸 하나를 나누는 모눈 수
  NEAR: 3, // "근처"로 치는 거리(모눈)
  F_MIN: 0.4, // 이 일치도 이하는 모양 0점
  F_MAX: 0.95, // 이 일치도 이상은 모양 만점
  CENTER_MAX: 0.25, // 중심이 칸 한 변의 이만큼 벗어나면 위치 0점
  SIZE_MAX: 1.6, // 크기가 이 배(또는 1/배) 다르면 크기 0점
  TILT_FREE_DEG: 3, // 이 각도까지는 기울기 만점
  TILT_MAX_DEG: 20, // 이 각도부터 기울기 0점
  FAR_MAX: 12, // 가장 동떨어진 잉크가 이만큼(모눈) 떨어져 있으면 모양 점수를 절반으로 (짧은 획을 빼먹거나 엉뚱한 획을 그은 경우)
  FAR_WEIGHT: 0.5,
  SHEAR_RANGE: 0.5, // 기울기를 찾는 범위(가로 밀기 비율)
  SHEAR_STEP: 0.05,
  SHEAR_COST: 0.1, // 기울기 1만큼에 일치도 이만큼 손해로 쳐서, 조금 더 겹친다고 기운 것으로 보지 않는다
  SCALE_MAX: 3, // 크기를 맞출 때 이 배(또는 1/배)까지만 (점 하나가 글자만큼 부풀지 않게)
  SHAPE_GATE: 0.5, // 모양이 만점의 이 비율보다 낮으면 위치·기울기 점수도 같이 줄인다 (낙서가 자리만 맞아서 점수를 받지 않게)
  PEN: 3, // 내 획을 모눈에 그리는 굵기
  GLYPH_FILL: 0.8, // 목표 글자 높이 ÷ 칸 높이
}

const SHAPE_MAX = 50
const POSITION_MAX = 25
const TILT_MAX = 25

const clamp01 = (v) => Math.max(0, Math.min(1, v))

export const emptyGrid = (w, h = w) => ({ w, h, data: new Uint8Array(w * h) })

/** 잉크가 차지하는 상자. 잉크가 없으면 null */
export function bbox(grid) {
  const { w, h, data } = grid
  let minX = w, minY = h, maxX = -1, maxY = -1, count = 0, sumX = 0, sumY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!data[y * w + x]) continue
      count++
      sumX += x
      sumY += y
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (count === 0) return null
  return {
    minX, minY, maxX, maxY, count,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    // 잉크의 무게 중심: 획 하나가 빠지거나 삐쳐도 상자 가운데보다 덜 흔들린다
    mx: sumX / count,
    my: sumY / count,
  }
}

/** 가로 밀기: 위쪽은 한쪽으로, 아래쪽은 반대쪽으로 민다 (기울어진 글자를 세우거나 눕힘). 중심 높이는 그대로 */
export function shear(grid, s) {
  const box = bbox(grid)
  if (!box || s === 0) return grid
  const out = emptyGrid(grid.w, grid.h)
  for (let y = box.minY; y <= box.maxY; y++) {
    const shift = Math.round(-s * (y - box.cy))
    for (let x = box.minX; x <= box.maxX; x++) {
      if (!grid.data[y * grid.w + x]) continue
      const nx = x + shift
      if (nx >= 0 && nx < grid.w) out.data[y * grid.w + nx] = 1
    }
  }
  return out
}

/**
 * 내 잉크를 목표 잉크와 같은 자리(무게 중심)·같은 크기로 옮긴다.
 * 크기는 가로세로 중 목표의 긴 쪽에 맞춰 같은 비율로 (가는 글자가 찌그러지지 않게).
 */
export function fitTo(mine, target, scaleMax = SCORE_TUNING.SCALE_MAX) {
  const m = bbox(mine)
  const t = bbox(target)
  if (!m || !t) return mine
  const raw = t.height >= t.width ? t.height / m.height : t.width / m.width
  const k = Math.max(1 / scaleMax, Math.min(scaleMax, raw))
  const out = emptyGrid(target.w, target.h)
  for (let y = m.minY; y <= m.maxY; y++) {
    for (let x = m.minX; x <= m.maxX; x++) {
      if (!mine.data[y * mine.w + x]) continue
      // 모눈 한 칸이 옮겨 갈 범위를 채운다 (줄일 때 선이 끊기거나 키울 때 구멍이 나지 않게)
      const x0 = Math.round((x - 0.5 - m.mx) * k + t.mx)
      const x1 = Math.max(x0, Math.round((x + 0.5 - m.mx) * k + t.mx) - 1)
      const y0 = Math.round((y - 0.5 - m.my) * k + t.my)
      const y1 = Math.max(y0, Math.round((y + 0.5 - m.my) * k + t.my) - 1)
      for (let oy = Math.max(0, y0); oy <= Math.min(out.h - 1, y1); oy++) {
        for (let ox = Math.max(0, x0); ox <= Math.min(out.w - 1, x1); ox++) out.data[oy * out.w + ox] = 1
      }
    }
  }
  return out
}

/** 모눈마다 가장 가까운 잉크까지의 거리(모눈 단위, 근사) */
export function distanceMap(grid) {
  const { w, h, data } = grid
  const INF = 1e9
  const d = new Float64Array(w * h)
  for (let i = 0; i < d.length; i++) d[i] = data[i] ? 0 : INF
  const A = 1, B = 4 / 3
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (x > 0 && d[i - 1] + A < d[i]) d[i] = d[i - 1] + A
      if (y > 0) {
        if (d[i - w] + A < d[i]) d[i] = d[i - w] + A
        if (x > 0 && d[i - w - 1] + B < d[i]) d[i] = d[i - w - 1] + B
        if (x < w - 1 && d[i - w + 1] + B < d[i]) d[i] = d[i - w + 1] + B
      }
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (x < w - 1 && d[i + 1] + A < d[i]) d[i] = d[i + 1] + A
      if (y < h - 1) {
        if (d[i + w] + A < d[i]) d[i] = d[i + w] + A
        if (x < w - 1 && d[i + w + 1] + B < d[i]) d[i] = d[i + w + 1] + B
        if (x > 0 && d[i + w - 1] + B < d[i]) d[i] = d[i + w - 1] + B
      }
    }
  }
  return d
}

function nearRatio(grid, dist, near) {
  let ink = 0, hit = 0
  for (let i = 0; i < grid.data.length; i++) {
    if (!grid.data[i]) continue
    ink++
    if (dist[i] <= near) hit++
  }
  return ink === 0 ? 0 : hit / ink
}

/** 잉크 중 상대에게서 가장 동떨어진 부분의 거리 (모눈 몇 개짜리 잡티는 무시하도록 98번째 백분위) */
function farDistance(grid, dist) {
  const ds = []
  for (let i = 0; i < grid.data.length; i++) if (grid.data[i]) ds.push(dist[i])
  if (ds.length === 0) return 0
  ds.sort((a, b) => a - b)
  return ds[Math.min(ds.length - 1, Math.floor(ds.length * 0.98))]
}

/**
 * 짧은 획 하나는 잉크가 적어서 일치도(F)에 거의 안 잡힌다(ㅏ에서 가로 획을 빼도 ㅣ와 95% 겹침).
 * 그래서 서로 가장 동떨어진 잉크의 거리도 본다: 0(다 근처) ~ 1(FAR_MAX 이상 떨어진 잉크가 있음)
 */
export function farness(mine, target, tuning = SCORE_TUNING, targetDist = distanceMap(target)) {
  const far = Math.max(farDistance(mine, targetDist), farDistance(target, distanceMap(mine)))
  return clamp01((far - tuning.NEAR) / (tuning.FAR_MAX - tuning.NEAR))
}

/**
 * 두 잉크가 얼마나 겹치는지 0~1.
 * 정확도(내 잉크가 목표 근처에 있나 — 군더더기)와 재현도(목표 잉크 근처를 내가 지나갔나 — 빠뜨림)의 조화 평균.
 */
export function fMeasure(mine, target, near = SCORE_TUNING.NEAR, targetDist = distanceMap(target)) {
  const p = nearRatio(mine, targetDist, near)
  const r = nearRatio(target, distanceMap(mine), near)
  return p + r === 0 ? 0 : (2 * p * r) / (p + r)
}

const ZERO = { total: 0, shape: 0, position: 0, tilt: 0, empty: false, skipped: false }

/**
 * 글자 하나 채점.
 * - target에 잉크가 없으면(글씨체에 없는 글자) skipped: 채점 대상이 아님
 * - mine에 잉크가 없으면 empty: 안 쓴 칸, 0점
 */
export function scoreGlyph(target, mine, tuning = SCORE_TUNING) {
  const t = bbox(target)
  if (!t) return { ...ZERO, skipped: true }
  const m = bbox(mine)
  if (!m) return { ...ZERO, empty: true }

  // 기울기를 바꿔 가며 가장 잘 겹치는 값을 찾는다. 같으면 덜 기운 쪽
  const targetDist = distanceMap(target)
  const steps = Math.round(tuning.SHEAR_RANGE / tuning.SHEAR_STEP)
  let best = { f: 0, gain: -1, s: 0, upright: mine, fitted: mine }
  for (let i = 0; i <= steps; i++) {
    for (const sign of i === 0 ? [1] : [1, -1]) {
      const s = sign * i * tuning.SHEAR_STEP
      const upright = shear(mine, s)
      const fitted = fitTo(upright, target, tuning.SCALE_MAX)
      const f = fMeasure(fitted, target, tuning.NEAR, targetDist)
      const gain = f - tuning.SHEAR_COST * Math.abs(s)
      if (gain > best.gain + 1e-9) best = { f, gain, s, upright, fitted }
    }
  }

  const quality = clamp01((best.f - tuning.F_MIN) / (tuning.F_MAX - tuning.F_MIN))
    * (1 - tuning.FAR_WEIGHT * farness(best.fitted, target, tuning, targetDist))
  const shape = SHAPE_MAX * quality
  const gate = clamp01(quality / tuning.SHAPE_GATE)

  // 위치는 쓴 그대로의 자리, 크기는 세운 뒤의 크기로 (기울기 때문에 두 번 깎이지 않게)
  const d = Math.hypot(m.mx - t.mx, m.my - t.my) / target.w
  const u = bbox(best.upright) ?? m
  const r = Math.hypot(u.width, u.height) / Math.hypot(t.width, t.height)
  const position = gate * POSITION_MAX * (
    0.5 * clamp01(1 - d / tuning.CENTER_MAX)
    + 0.5 * clamp01(1 - Math.abs(Math.log(r)) / Math.log(tuning.SIZE_MAX))
  )

  const deg = (Math.abs(Math.atan(best.s)) * 180) / Math.PI
  const tilt = gate * TILT_MAX * clamp01(1 - (deg - tuning.TILT_FREE_DEG) / (tuning.TILT_MAX_DEG - tuning.TILT_FREE_DEG))

  return { total: Math.round(shape + position + tilt), shape, position, tilt, empty: false, skipped: false }
}

/**
 * 세트 점수. 빈칸(null)과 채점 대상이 아닌 글자(skipped)는 빼고, 안 쓴 칸은 0점으로 넣어 평균을 낸다.
 * 항목 점수는 각 만점 대비 %.
 */
export function scoreSet(glyphs) {
  const counted = glyphs.filter((g) => g && !g.skipped)
  if (counted.length === 0) return { total: 0, shapePct: 0, positionPct: 0, tiltPct: 0, counted: 0 }
  const mean = (key) => counted.reduce((t, g) => t + g[key], 0) / counted.length
  return {
    total: Math.round(mean('total')),
    shapePct: Math.round((mean('shape') / SHAPE_MAX) * 100),
    positionPct: Math.round((mean('position') / POSITION_MAX) * 100),
    tiltPct: Math.round((mean('tilt') / TILT_MAX) * 100),
    counted: counted.length,
  }
}
