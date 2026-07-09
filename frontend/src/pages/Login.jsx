import { useState } from 'react'
import { useStore } from '../store'
import { C } from '../components/UI'

export default function LoginScreen() {
  const { login, authLoading } = useStore()
  const [username, setUsername] = useState('priya')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    const ok = await login(username, password)
    if (!ok) setError('Invalid credentials. Try username: priya, password: 123456')
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:`linear-gradient(135deg, ${C.al} 0%, #fff 100%)`,
      fontFamily:'Inter, system-ui, sans-serif', padding:'20px'
    }}>
      <div style={{
        width:'100%', maxWidth:360, background:'#fff',
        borderRadius:20, padding:32, boxShadow:'0 8px 40px rgba(0,0,0,0.12)'
      }}>
        {/* Logo */}
        <div style={{textAlign:'center', marginBottom:28}}>
          <div style={{
            width:64, height:64, background:C.a, borderRadius:18,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:32, margin:'0 auto 14px'
          }}>🧠</div>
          <div style={{fontSize:22, fontWeight:700, color:'#131311', letterSpacing:'-.03em'}}>SmokeSense AI</div>
          <div style={{fontSize:12, color:'#636360', marginTop:4}}>BTech IT Final Year · Somaiya Vidyavihar</div>
        </div>

        {/* Stats pills */}
        <div style={{display:'flex', gap:7, justifyContent:'center', flexWrap:'wrap', marginBottom:24}}>
          {['NumPyro SVI','ROC-AUC 0.9869','FastAPI Backend','AI Companion'].map(s=>(
            <div key={s} style={{
              padding:'3px 10px', borderRadius:20, background:C.al,
              color:'#1F4A07', fontSize:10, fontWeight:500
            }}>{s}</div>
          ))}
        </div>

        {/* Form */}
        <div style={{display:'flex', flexDirection:'column', gap:13}}>
          <div>
            <div style={{fontSize:12, color:'#636360', fontWeight:500, marginBottom:5}}>Username</div>
            <input
              value={username} onChange={e=>setUsername(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&submit()}
              style={{
                width:'100%', border:'0.5px solid rgba(0,0,0,0.12)',
                borderRadius:9, padding:'10px 12px', fontSize:14,
                background:'#F5F5F3', outline:'none', fontFamily:'inherit'
              }}
            />
          </div>
          <div>
            <div style={{fontSize:12, color:'#636360', fontWeight:500, marginBottom:5}}>Password</div>
            <input
              type="password" value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&submit()}
              style={{
                width:'100%', border:'0.5px solid rgba(0,0,0,0.12)',
                borderRadius:9, padding:'10px 12px', fontSize:14,
                background:'#F5F5F3', outline:'none', fontFamily:'inherit'
              }}
            />
          </div>

          {error && (
            <div style={{background:'#FDEAEA', color:'#6B1C1C', borderRadius:8, padding:'9px 12px', fontSize:12}}>
              {error}
            </div>
          )}

          <button
            onClick={submit} disabled={authLoading}
            style={{
              background: authLoading ? '#ccc' : C.a, color:'#fff', border:'none',
              borderRadius:9, padding:'13px', fontSize:15, fontWeight:600,
              cursor: authLoading ? 'not-allowed' : 'pointer', fontFamily:'inherit',
              transition:'background .18s'
            }}
          >
            {authLoading ? '⟳ Logging in…' : '🔐 Login'}
          </button>
        </div>

        {/* Demo hint */}
        <div style={{
          marginTop:18, padding:'10px 12px', background:'#E3EFF9',
          borderRadius:8, fontSize:11, color:'#0A3870', lineHeight:1.55
        }}>
          <strong>Demo credentials:</strong><br/>
          Username: <code>priya</code> · Password: <code>123456</code><br/>
          Backend: FastAPI + SQLite · Real NumPyro weights
        </div>

        {/* Architecture note */}
        <div style={{marginTop:14, fontSize:11, color:'#9A9A97', textAlign:'center', lineHeight:1.6}}>
          Full-stack: React + Vite + Zustand → FastAPI → SQLite<br/>
          Bayesian LR (NumPyro) · MAML (PyTorch) · AI Companion
        </div>
      </div>
    </div>
  )
}
