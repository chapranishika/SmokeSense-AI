import { useEffect } from 'react'
import { useStore } from './store'
import { NavBar } from './components/UI'
import { ErrorBoundary } from './components/ErrorBoundary'
import LoginScreen from './pages/Login'
import {
  HomeScreen, PredictorScreen, ToolsScreen, AIScreen,
  CommunityScreen, ResearchScreen, ProfileScreen
} from './pages'
import { C } from './components/UI'

const SCREENS = [
  HomeScreen, PredictorScreen, ToolsScreen, AIScreen,
  CommunityScreen, ResearchScreen, ProfileScreen
]

const TITLES = [
  null, // Home uses custom logo
  'Urge predictor',
  'Tools & interventions',
  null, // AI uses custom logo
  'Community',
  'Research dashboard',
  'Profile & settings',
]

export default function App() {
  const { token, user, screen, setScreen, fetchMe } = useStore()

  useEffect(() => {
    if (token) fetchMe()
  }, [token])

  // Not logged in → show login
  if (!token) return <LoginScreen />

  const Screen = SCREENS[screen]
  const title = TITLES[screen]

  return (
    <div style={{
      width: '100%',
      maxWidth: 430,
      minHeight: '100vh',
      background: 'var(--bg)',
      boxShadow: '0 0 80px rgba(0,0,0,0.18)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 17px 9px',
        background: 'var(--bg)',
        borderBottom: '0.5px solid var(--br)',
        position: 'sticky',
        top: 0,
        zIndex: 60,
        backdropFilter: 'blur(16px)',
      }}>
        {screen === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 30, height: 30, background: C.a, borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#fff'
            }}>🧠</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.03em' }}>SmokeSense AI</div>
              <div style={{ fontSize: 9, color: 'var(--mu2)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                Day {user?.days_quit || 7} smoke-free
              </div>
            </div>
          </div>
        ) : screen === 3 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 30, height: 30, background: C.p, borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#fff'
            }}>🤖</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)' }}>AI Companion</div>
              <div style={{ fontSize: 9, color: 'var(--mu2)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Urge intervention</div>
            </div>
          </div>
        ) : (
          <h1 style={{ fontSize: 16, fontWeight: 500, color: 'var(--tx)', letterSpacing: '-.02em' }}>{title}</h1>
        )}

        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {screen === 5 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
              background: C.pl, color: '#30257A'
            }}>SomaiyaVU</div>
          )}
          {screen === 4 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
              background: C.gl, color: '#1F4A07'
            }}>847 online</div>
          )}
          {screen === 0 && (
            <>
              <div onClick={() => setScreen(6)} style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--sf)',
                border: '0.5px solid var(--br)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', fontSize: 16
              }}>👤</div>
            </>
          )}
        </div>
      </div>

      {/* Screen content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <ErrorBoundary key={screen}>
          <Screen />
        </ErrorBoundary>
      </div>

      {/* Bottom navbar */}
      <NavBar screen={screen} onNav={setScreen} />
    </div>
  )
}
