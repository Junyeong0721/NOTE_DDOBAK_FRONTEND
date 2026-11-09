// 줄 이미지 글자 인식 API. 백엔드에 Google Vision 키가 있으면 실제 인식, 없으면 가짜 결과(engine: "fake").
import { request } from './notes'

export const recognizeLine = ({ imageBase64, width, height }) =>
  request('/api/ocr/line', { method: 'POST', body: JSON.stringify({ imageBase64, width, height }) })

// "줄 보기"에서 줄 옆에 보여 줄 글자
export function ocrLabel(result) {
  if (result?.text) return result.text
  return result?.engine === 'fake' ? '가짜 인식 (키 없음)' : '(글자 없음)'
}

export const ocrErrorLabel = (error) => `⚠ ${error?.message || '인식 실패'}`
