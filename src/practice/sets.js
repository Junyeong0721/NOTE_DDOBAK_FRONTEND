// 미리 넣어 둔 연습 세트. 자음·모음 → 글자 → 단어 → 문장 순서로 쉬운 것부터.
export const STAGES = [
  { id: 'jamo', label: '자음·모음' },
  { id: 'syllable', label: '글자' },
  { id: 'word', label: '단어' },
  { id: 'sentence', label: '문장' },
]

export const SETS = [
  { id: 'consonant-1', stage: 'jamo', text: 'ㄱㄴㄷㄹㅁ' },
  { id: 'consonant-2', stage: 'jamo', text: 'ㅂㅅㅇㅈㅊ' },
  { id: 'consonant-3', stage: 'jamo', text: 'ㅋㅌㅍㅎ' },
  { id: 'vowel-1', stage: 'jamo', text: 'ㅏㅑㅓㅕㅗ' },
  { id: 'vowel-2', stage: 'jamo', text: 'ㅛㅜㅠㅡㅣ' },
  { id: 'syllable-1', stage: 'syllable', text: '가나다라마' },
  { id: 'syllable-2', stage: 'syllable', text: '바사아자차' },
  { id: 'syllable-3', stage: 'syllable', text: '카타파하' },
  { id: 'batchim-1', stage: 'syllable', text: '강물밥산집' },
  { id: 'batchim-2', stage: 'syllable', text: '길꽃닭값읽' },
  { id: 'word-1', stage: 'word', text: '강의 과제 시험' },
  { id: 'word-2', stage: 'word', text: '출석 발표 정리' },
  { id: 'word-3', stage: 'word', text: '중간고사 기말고사' },
  { id: 'sentence-1', stage: 'sentence', text: '오늘 배운 내용 정리' },
  { id: 'sentence-2', stage: 'sentence', text: '다음 주까지 과제 제출' },
  { id: 'sentence-3', stage: 'sentence', text: '시험 범위 꼭 확인하기' },
]

export const setsOf = (stageId) => SETS.filter((s) => s.stage === stageId)

export const setById = (id) => SETS.find((s) => s.id === id) ?? null

/** 같은 단계의 다음 세트. 마지막이면 null */
export function nextSet(setId) {
  const cur = setById(setId)
  if (!cur) return null
  const list = setsOf(cur.stage)
  return list[list.findIndex((s) => s.id === setId) + 1] ?? null
}
