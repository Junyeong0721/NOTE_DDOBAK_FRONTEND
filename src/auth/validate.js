// 가입·로그인 입력 확인 (서버 SignupRequest와 같은 규칙, 같은 문구). 서버도 다시 확인한다.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LETTER_AND_DIGIT = /^(?=.*[A-Za-z])(?=.*\d).*$/

/** 입력하는 동안 보여 줄 비밀번호 확인 상태: 아직 안 씀 null, 같음 true, 다름 false */
export function passwordMatch(password, passwordConfirm) {
  if (!password || !passwordConfirm) return null
  return password === passwordConfirm
}

/** 가입: 비밀번호 확인(passwordConfirm)은 화면에서만 확인하고 서버로는 보내지 않는다 */
export function validateSignup({ email, password, passwordConfirm = '', nickname }) {
  const errors = {}
  if (!email.trim()) errors.email = '이메일을 입력해 주세요.'
  else if (!EMAIL.test(email.trim())) errors.email = '이메일 형식이 올바르지 않습니다.'
  if (!password) errors.password = '비밀번호를 입력해 주세요.'
  else if (password.length < 8 || password.length > 64) errors.password = '비밀번호는 8~64자로 입력해 주세요.'
  else if (!LETTER_AND_DIGIT.test(password)) errors.password = '비밀번호에 영문과 숫자를 모두 넣어 주세요.'
  if (!passwordConfirm) errors.passwordConfirm = '비밀번호를 한 번 더 입력해 주세요.'
  else if (passwordConfirm !== password) errors.passwordConfirm = '비밀번호가 서로 달라요.'
  if (!nickname.trim()) errors.nickname = '닉네임을 입력해 주세요.'
  else if (nickname.trim().length > 20) errors.nickname = '닉네임은 20자 이하로 입력해 주세요.'
  return errors
}

export function validateLogin({ email, password }) {
  const errors = {}
  if (!email.trim()) errors.email = '이메일을 입력해 주세요.'
  if (!password) errors.password = '비밀번호를 입력해 주세요.'
  return errors
}
