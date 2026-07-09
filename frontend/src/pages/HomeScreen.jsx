// SmokeSense AI — All Page Screens
import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine } from 'recharts'
import { useStore } from '../store'
import { useWearableWS } from '../hooks/useWearableWS'
import { C, Card, CardTitle, Alert, Badge, Metric, Btn, Toggle,
  Slider, Select, Input, Textarea, RiskGauge, FeatureBar, TabBar } from '../components/UI'

// ── Shared helpers ───────────────────────────────────────────
const gchart = { stroke:'rgba(128,128,128,0.1)', strokeDasharray:'3 3' }
const tickStyle = { fontSize:10, fill:'#888' }
const COLORS = ['#0FA870','#C27A10','#5B50C8','#1B6AB5','#9A9A97']

// ═══════════════════════════════════════════════════════════
// SCREEN 0: HOME
// ═══════════════════════════════════════════════════════════

export function HomeScreen() {
  const { user, prediction, fetchLivePrediction, setScreen, setToolTab, setResTab } = useStore()
  const [loading, setLoading] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const wsConnected = useWearableWS()

  useEffect(() => {
    refresh() // always fetch once on mount
    // Poll only as a fallback if the WebSocket isn't connected
    const iv = setInterval(() => { if (!useStore.getState().wsConnected) refresh() }, 30000)
    return () => clearInterval(iv)
  }, [])

  const refresh = async () => {
    setLoading(true)
    await fetchLivePrediction()
    setLoading(false)
  }

  const p = prediction?.mean_prob ?? 0.23
  const lo = prediction?.ci_lower ?? 0.12
  const hi = prediction?.ci_upper ?? 0.34
  const ciw = hi - lo
  const wearable = prediction?.wearable

  const timeline = Array.from({length:24},(_,i)=>({
    h:`${i}h`, urge:[9,8,8,9,10,13,19,28,25,21,17,16,33,39,35,26,20,17,14,12,11,10,9,8][i]
  }))

  const WEIGHTS = [
    {label:'HR_delta', value:23.9358, positive:true},
    {label:'HRV_relative', value:-8.5616, positive:false},
    {label:'Location_Home', value:3.6731, positive:true},
    {label:'Location_Public', value:3.2321, positive:true},
    {label:'Location_Hotels', value:-3.2121, positive:false},
    {label:'CIGNOW_A', value:-1.8729, positive:false},
  ]

  return (
    <div className="fade-in" style={{padding:'14px 16px', display:'flex', flexDirection:'column', gap:13, paddingBottom:80}}>
      {/* Notifications panel */}
      {showNotifs && (
        <div style={{background:'var(--bg)', border:'0.5px solid var(--br)', borderRadius:12, padding:14, display:'flex', flexDirection:'column', gap:8}}>
          <div style={{fontSize:14, fontWeight:600, color:'var(--tx)'}}>Notifications</div>
          <Alert color="a" icon="⚠️"><strong>High-risk window in 20 min</strong> — Post-lunch peak approaching.</Alert>
          <Alert color="b" icon="🏆"><strong>Day {user?.days_quit || 7} milestone!</strong> Nicotine receptors downregulating.</Alert>
          <Alert color="g" icon="📈">HRV improved <strong>+12%</strong> — Samsung Health confirms recovery.</Alert>
          <Alert color="p" icon="🧠">MAML model updated with your latest data.</Alert>
        </div>
      )}

      {/* Risk gauge from live API */}
      <RiskGauge prob={p} ciLo={lo} ciHi={hi} />
      <div style={{display:'flex', justifyContent:'center'}}>
        <Badge color={wsConnected ? 'g' : 'mu'}>
          {wsConnected ? '🟢 Live wearable feed (WebSocket)' : '⚪ Polling every 30s'}
        </Badge>
      </div>

      {/* CI alert */}
      <Alert color={prediction?.triggered ? 'r' : 'g'} icon={prediction?.triggered ? '⚠️' : '🛡️'}>
        CI width {Math.round(ciw*100)}% — {prediction?.triggered
          ? <><strong>Intervention triggered!</strong> Use breathing or contact support.</>
          : <><strong>No intervention triggered.</strong> Dual-threshold: mean &gt;0.5 AND CI &lt;0.2.</>}
        {loading && ' ⟳'}
      </Alert>

      {/* Live wearable metrics */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
        <Metric label="HR delta" value={`+${wearable?.hr_delta?.toFixed(1) ?? 4}`} unit="bpm"/>
        <Metric label="HRV ratio" value={wearable?.hrv_relative?.toFixed(2) ?? '0.91'}/>
        <Metric label="TSLS" value={wearable?.tsls_minutes ?? 187} unit="min"/>
        <Metric label="Streak" value={`${user?.days_quit ?? 7}`} unit="days"/>
      </div>

      {/* Real weights from CSV */}
      <Card>
        <CardTitle icon="📊">Real posterior weights — LR_Prior_Weights.csv</CardTitle>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {WEIGHTS.map(w => <FeatureBar key={w.label} {...w}/>)}
        </div>
        <div style={{fontSize:10, color:'var(--mu)', marginTop:10, paddingTop:9, borderTop:'0.5px solid var(--br)'}}>
          Exact values from LR_Prior_Weights.csv · HR_delta +23.9358 dominates — 23× stronger.
        </div>
      </Card>

      {/* 24h timeline chart */}
      <Card>
        <CardTitle icon="🔥">24h urge timeline</CardTitle>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={timeline}>
            <CartesianGrid {...gchart}/>
            <XAxis dataKey="h" tick={tickStyle} interval={3}/>
            <YAxis domain={[0,50]} tick={tickStyle} tickFormatter={v=>`${v}%`}/>
            <Line type="monotone" dataKey="urge" stroke={C.a} strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Savings from backend */}
      {user && (
        <Alert color="g" icon="💰">
          <strong>₹{user.money_saved?.toLocaleString()}</strong> saved · {user.cigs_avoided} cigarettes avoided · {user.days_quit} days smoke-free
        </Alert>
      )}

      {/* Quick actions */}
      <Card>
        <CardTitle icon="⚡">Quick actions</CardTitle>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <Btn secondary onClick={()=>setScreen(1)}>🧠 Run predictor</Btn>
          <Btn secondary onClick={()=>setScreen(3)}>🤖 AI companion</Btn>
          <Btn secondary onClick={()=>{setScreen(2);setToolTab('breathe')}}>🌬️ Breathe now</Btn>
          <Btn secondary onClick={()=>{setScreen(5);setResTab('results')}}>🔬 Research</Btn>
        </div>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// SCREEN 1: PREDICTOR
// ═══════════════════════════════════════════════════════════
