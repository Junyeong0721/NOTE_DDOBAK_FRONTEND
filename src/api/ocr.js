// 줄 이미지 글자 인식 API. 2주차는 백엔드가 가짜 결과(engine: "fake")를 돌려준다.
import { request } from './notes'

export const recognizeLine = ({ imageBase64, width, height }) =>
  request('/api/ocr/line', { method: 'POST', body: JSON.stringify({ imageBase64, width, height }) })
