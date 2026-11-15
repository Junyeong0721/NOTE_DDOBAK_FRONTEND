import { useEffect, useState } from 'react'
import { ensureFont, fontFamily } from '../../note/fonts'

/**
 * 글씨체를 다 받았는지: 'loading' | 'ready' | 'failed'.
 * 받기 전에 그리면 기본 글꼴로 가이드·채점이 돼 버리므로, ready일 때만 목표 글자를 그린다.
 */
export function useFontReady(fontId) {
  const [state, setState] = useState({ fontId: null, status: 'loading' })
  useEffect(() => {
    let alive = true
    ensureFont(fontId).then(() => {
      if (!alive) return
      const ok = typeof document === 'undefined' || !document.fonts || document.fonts.check(`32px ${fontFamily(fontId)}`, '가')
      setState({ fontId, status: ok ? 'ready' : 'failed' })
    })
    return () => {
      alive = false
    }
  }, [fontId])
  return state.fontId === fontId ? state.status : 'loading'
}
