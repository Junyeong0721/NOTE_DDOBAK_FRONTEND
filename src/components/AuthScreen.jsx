import { useEffect, useRef, useState } from 'react'
import { login, signup } from '../api/auth'
import { validateLogin, validateSignup } from '../auth/validate'
import { BackIcon } from './Icons'
import Logo from './Logo'

function Field({ id, label, hint, error, children }) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="field-error" id={`${id}-error`}>{error}</p> : hint && <p className="field-hint">{hint}</p>}
    </div>
  )
}

/** 로그인 / 회원가입. 바인더 인덱스 탭으로 오간다. 소셜 로그인 버튼은 고정 주소를 만든 뒤 연결한다 */
export default function AuthScreen({ mode, onMode, onBack, onDone }) {
  const isSignup = mode === 'signup'
  const [form, setForm] = useState({ email: '', password: '', nickname: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const emailRef = useRef(null)

  useEffect(() => {
    emailRef.current?.focus()
    setErrors({})
    setServerError('')
  }, [mode])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }))
  }

  async function submit(e) {
    e.preventDefault()
    const found = isSignup ? validateSignup(form) : validateLogin(form)
    setErrors(found)
    setServerError('')
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const body = { email: form.email.trim(), password: form.password }
      const user = isSignup ? await signup({ ...body, nickname: form.nickname.trim() }) : await login(body)
      onDone(user)
    } catch (err) {
      setServerError(err.message)
      setBusy(false)
    }
  }

  const describedBy = (key) => (errors[key] ? `${key}-error` : undefined)

  return (
    <div className="auth">
      <header className="landing-bar">
        <button type="button" className="btn-quiet auth-back" onClick={onBack}>
          <BackIcon /> 처음으로
        </button>
        <Logo />
        <span className="auth-bar-spacer" />
      </header>

      <main className="auth-main">
        <div className="auth-tabs" role="tablist" aria-label="로그인 또는 회원가입">
          <button type="button" role="tab" aria-selected={!isSignup} className="auth-tab tab-login" onClick={() => onMode('login')}>로그인</button>
          <button type="button" role="tab" aria-selected={isSignup} className="auth-tab tab-signup" onClick={() => onMode('signup')}>회원가입</button>
        </div>

        <form className="auth-paper" onSubmit={submit} noValidate>
          <Field id="email" label="이메일" error={errors.email}>
            <input id="email" ref={emailRef} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={form.email} onChange={set('email')} aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email')} />
          </Field>
          <Field id="password" label="비밀번호" hint={isSignup ? '영문과 숫자를 넣어 8자 이상' : null} error={errors.password}>
            <span className="password-box">
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} value={form.password} onChange={set('password')} aria-invalid={Boolean(errors.password)} aria-describedby={describedBy('password')} />
              <button type="button" className="btn-quiet" aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? '숨기기' : '보기'}
              </button>
            </span>
          </Field>
          {isSignup && (
            <Field id="nickname" label="닉네임" hint="홈 화면에서 이 이름으로 불러 드려요" error={errors.nickname}>
              <input id="nickname" autoComplete="nickname" maxLength={20} value={form.nickname} onChange={set('nickname')} aria-invalid={Boolean(errors.nickname)} aria-describedby={describedBy('nickname')} />
            </Field>
          )}

          {serverError && <p className="error auth-error" role="alert">{serverError}</p>}

          <button type="submit" className="btn-primary btn-large auth-submit" disabled={busy}>
            {busy ? '잠시만요…' : isSignup ? '가입하고 시작하기' : '로그인'}
          </button>

          <p className="auth-or"><span>또는</span></p>
          <div className="social">
            <button type="button" className="social-btn social-google" disabled>
              <span className="social-mark" aria-hidden="true">G</span> Google로 계속하기
            </button>
            <button type="button" className="social-btn social-kakao" disabled>
              <span className="social-mark" aria-hidden="true">K</span> 카카오로 계속하기
            </button>
          </div>
          <p className="field-hint social-note">Google·카카오 로그인은 준비 중이에요. 지금은 이메일로 {isSignup ? '가입해' : '로그인해'} 주세요.</p>
        </form>
      </main>
    </div>
  )
}
