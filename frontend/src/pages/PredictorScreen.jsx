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

export function PredictorScreen() {
  const { predict, predicting, predHistory, fetchPredHistory } = useStore()
  const [hr, setHr] = useState(4)
  const [hrv, setHrv] = useState(0.91)
  const [tsls, setTsls] = useState(87)
  const [location, setLocation] = useState('home')
  const [hour, setHour] = useState(new Date().getHours())
  const [result, setResult] = useState(null)

  useEffect(() => { fetchPredHistory() }, [])

  const run = async () => {
    const data = await predict({ hr_delta:hr, hrv_relative:hrv, tsls_minutes:tsls, location, hour, n_samples:1000 })
    if (data && !data.error) setResult(data)
  }

  const histData = predHistory.slice(0,7).reverse().map((p,i)=>({
    i: i+1, prob: Math.round(p.mean_prob*100)
  }))

  return (
    <div className="fade-in" style={{padding:'14px 16px', display:'flex', flexDirection:'column', gap:13, paddingBottom:80}}>
      <Alert color="b" icon="ℹ️">
        Real NumPyro weights from LR_Prior_Weights.csv · AutoNormal SVI · Adam lr=0.01 · 3,000 ELBO steps · 1,000 posterior samples
      </Alert>

      <Card style={{display:'flex', flexDirection:'column', gap:12}}>
        <CardTitle icon="💓">Physiological signals (real weights)</CardTitle>
        <div>
          <div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>HR_delta — bpm above resting (raw +23.9358, dominant)</div>
          <Slider min={-5} max={20} step={1} value={hr} onChange={setHr} fmt={v=>`${v} bpm`}/>
        </div>
        <div>
          <div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>HRV_relative — RMSSD ratio to baseline (raw -8.5616, protective)</div>
          <Slider min={0.4} max={1.6} step={0.01} value={hrv} onChange={setHrv} fmt={v=>v.toFixed(2)}/>
        </div>
        <div>
          <div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>TSLS_Minutes — time since last smoked (÷120 normalisation)</div>
          <Slider min={0} max={240} step={1} value={tsls} onChange={setTsls} fmt={v=>`${v} min`}/>
        </div>
      </Card>

      <Card style={{display:'flex', flexDirection:'column', gap:12}}>
        <CardTitle icon="📍">Contextual features</CardTitle>
        <div>
          <div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>Location (real CSV weights)</div>
          <Select value={location} onChange={setLocation} options={[
            ['home','Home (+3.6731)'], ['public','Public Places (+3.2321)'],
            ['medical','Medical Institutions (+2.0821)'], ['restaurants','Restaurants (-1.3821)'],
            ['entertainment','Entertainment (-1.9710)'], ['malls','Shopping Malls (-2.2116)'],
            ['hotels','Hotels (-3.2121)'], ['office','Office'],
          ]}/>
        </div>
        <div>
          <div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>Time of day (sin/cos cyclical encoding)</div>
          <Slider min={0} max={23} step={1} value={hour} onChange={setHour} fmt={v=>`${v}:00`}/>
        </div>
      </Card>

      {/* Live preview */}
      <div style={{background:'var(--sf)', borderRadius:14, padding:13, border:'0.5px solid var(--br)'}}>
        <div style={{fontSize:9, fontWeight:600, color:'var(--mu)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8}}>Parameters set — ready to run</div>
        <div style={{display:'flex', flexWrap:'wrap', gap:7}}>
          {[['HR delta', `+${hr} bpm`], ['HRV', hrv.toFixed(2)], ['TSLS', `${tsls}m`],
            ['Location', location], ['Hour', `${hour}:00`]].map(([k,v])=>(
            <div key={k} style={{background:'var(--bg)', borderRadius:7, padding:'5px 10px', fontSize:12, border:'0.5px solid var(--br)'}}>
              <span style={{color:'var(--mu)'}}>{k}: </span><strong>{v}</strong>
            </div>
          ))}
        </div>
      </div>

      <Btn onClick={run} disabled={predicting}>
        {predicting ? <><span className="spin">⟳</span> Running 1,000 posterior samples…</> : '🧠 Run full Bayesian inference'}
      </Btn>

      {result && (
        <>
          <Card>
            <CardTitle icon="📈">Posterior inference output</CardTitle>
            {[
              ['Mean urge probability', `${(result.mean_prob*100).toFixed(1)}%`],
              ['95% credible interval', `[${(result.ci_lower*100).toFixed(1)}%, ${(result.ci_upper*100).toFixed(1)}%]`],
              ['CI width (uncertainty)', `${(result.ci_width*100).toFixed(1)}%`],
              ['Posterior samples', '1,000'],
              ['Inference method', 'NumPyro AutoNormal SVI'],
              ['Weights source', 'LR_Prior_Weights.csv'],
              ['Intervention triggered', result.triggered ? 'YES — intervene now' : 'No — threshold not met'],
            ].map(([k,v])=>(
              <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'7px 0',
                borderBottom:'0.5px solid var(--br)', fontSize:13}}>
                <span style={{color:'var(--mu)'}}>{k}</span>
                <span style={{fontWeight:500, color: k==='Intervention triggered' && result.triggered ? '#6B1C1C' : 'var(--tx)'}}>{v}</span>
              </div>
            ))}
          </Card>
          <Alert color={result.triggered ? 'r' : result.mean_prob > 0.4 ? 'a' : 'g'}
            icon={result.triggered ? '🚨' : result.mean_prob > 0.4 ? '⚠️' : '🛡️'}>
            {result.triggered ? 'High risk! Use breathing exercise or contact your support person immediately.'
              : result.mean_prob > 0.4 ? 'Moderate risk. Consider a distraction activity.'
              : 'Risk is low. Model is confident — keep going!'}
          </Alert>
        </>
      )}

      {histData.length > 0 && (
        <Card>
          <CardTitle icon="📊">Your last {histData.length} predictions (from backend DB)</CardTitle>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={histData}>
              <CartesianGrid {...gchart}/><XAxis dataKey="i" tick={tickStyle}/>
              <YAxis domain={[0,100]} tick={tickStyle} tickFormatter={v=>`${v}%`}/>
              <Tooltip formatter={v=>[`${v}%`,'Urge prob']}/>
              <Bar dataKey="prob" fill={C.a} radius={4}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// SCREEN 2: TOOLS
// ═══════════════════════════════════════════════════════════
