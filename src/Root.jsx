import { useEffect, useState } from 'react'
import { fetchMe, logout } from './api/auth'
import App from './App'
import AuthScreen from './components/AuthScreen'
import Landing from './components/Landing'
import Logo from './components/Logo'
import './Auth.css'

/** 로그인 확인 → 안 했으면 소개·로그인·회원가입, 했으면 앱 */
export default function Root() {
  const [user, setUser] = useState(undefined) // undefined: 확인 중, null: 로그인 안 함
  const [screen, setScreen] = useState('landing') // landing | login | signup

  useEffect(() => {
    fetchMe().then(setUser).catch(() => setUser(null))
    const onUnauthorized = () => {
      setUser(null)
      setScreen('login')
    }
    window.addEventListener('ddobak:unauthorized', onUnauthorized)
    return () => window.removeEventListener('ddobak:unauthorized', onUnauthorized)
  }, [])

  async function handleLogout() {
    try {
      await logout()
    } finally {
      setUser(null)
      setScreen('landing')
    }
  }

  if (user === undefined) {
    return <div className="splash"><Logo /></div>
  }
  if (!user) {
    if (screen === 'landing') return <Landing onStart={() => setScreen('signup')} onLogin={() => setScreen('login')} />
    return <AuthScreen mode={screen} onMode={setScreen} onBack={() => setScreen('landing')} onDone={setUser} />
  }
  return <App user={user} onLogout={handleLogout} />
}
