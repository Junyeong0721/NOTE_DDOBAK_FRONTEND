import { useEffect, useState } from 'react'
import { FONTS_CHANGED, availableFonts, loadAddedFonts } from '../note/myFonts'

/** 고를 수 있는 글씨체 목록. [글씨체 더 보기]에서 추가·빼면 바로 바뀐다 */
export function useAvailableFonts() {
  const [added, setAdded] = useState(loadAddedFonts)
  useEffect(() => {
    const onChange = () => setAdded(loadAddedFonts())
    window.addEventListener(FONTS_CHANGED, onChange)
    return () => window.removeEventListener(FONTS_CHANGED, onChange)
  }, [])
  return { added, fonts: availableFonts(added) }
}
