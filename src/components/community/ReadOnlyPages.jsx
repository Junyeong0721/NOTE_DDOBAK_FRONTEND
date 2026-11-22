import { useEffect, useMemo, useRef, useState } from 'react'
import { PAGE_HEIGHT, PAGE_WIDTH, parseContent } from '../../note/content'
import { ensureFont } from '../../note/fonts'
import { drawPage } from '../../note/render'

/** 공개 노트의 필기를 읽기 전용으로: 필기가 있는 페이지를 세로로, 화면 폭에 맞춰. 보정 글자는 쓴 사람이 고른 글씨체로 */
export default function ReadOnlyPages({ content }) {
  const pages = useMemo(() => {
    const all = parseContent(content).pages
    const written = all.filter((p) => p.strokes.length > 0)
    return written.length > 0 ? written : all.slice(0, 1)
  }, [content])
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const measure = () => setWidth(Math.min(el.clientWidth, 900))
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    const ids = new Set(pages.flatMap((p) => (p.corrections ?? []).map((c) => c.fontId)))
    Promise.all([...ids].map((id) => ensureFont(id))).finally(() => !cancelled && setFontsReady(true))
    return () => {
      cancelled = true
    }
  }, [pages])

  return (
    <div className="readonly-pages" ref={wrapRef}>
      {width > 0 && pages.map((p, i) => (
        <PageCanvas key={i} page={p} width={width} ready={fontsReady} label={`${i + 1}쪽`} />
      ))}
    </div>
  )
}

function PageCanvas({ page, width, ready, label }) {
  const ref = useRef(null)
  const height = Math.round((width * PAGE_HEIGHT) / PAGE_WIDTH)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    const ctx = canvas.getContext('2d')
    drawPage(ctx, { strokes: page.strokes, scale: (width * dpr) / PAGE_WIDTH, corrections: page.corrections })
  }, [page, width, height, ready])

  return <canvas ref={ref} className="readonly-page" style={{ width, height }} role="img" aria-label={`필기 ${label}`} />
}
