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

export function ProfileScreen() {
  const { user, logout, fetchMe } = useStore()
  const [notifs, setNotifs] = useState({alerts:true, preemptive:true, milestones:true, community:false})
  const [model, setModel] = useState({maml:true, samsung:true, onDevice:true, research:false})

  useEffect(()=>{ fetchMe() }, [])

  const exportProgress = () => {
    const lines = [
      '=== SmokeSense AI — Progress Report ===',
      `Generated: ${new Date().toLocaleDateString()}`,
      '',`USER: ${user?.name}`,
      `Days smoke-free: ${user?.days_quit}`,
      `Cigarettes avoided: ${user?.cigs_avoided}`,
      `Money saved: ₹${user?.money_saved?.toLocaleString()}`,
      '',`=== MODEL (NumPyro Bayesian LR) ===`,
      'Accuracy: 94.07% | ROC-AUC: 0.9869 | F1: 0.9265 | Brier: 0.0433',
      '',`=== REAL WEIGHTS (LR_Prior_Weights.csv) ===`,
      'HR_delta: +23.9358 (dominant) | HRV_relative: -8.5616 | Location_Home: +3.6731',
    ]
    const blob = new Blob([lines.join('\n')], {type:'text/plain'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `smokesense_${new Date().toISOString().slice(0,10)}.txt`
    a.click()
  }

  return (
    <div className="fade-in" style={{padding:'14px 16px', display:'flex', flexDirection:'column', gap:13, paddingBottom:80}}>
      <Card style={{textAlign:'center', padding:18}}>
        <div style={{width:64, height:64, borderRadius:'50%', background:`linear-gradient(135deg,${C.a},#07643F)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:600, color:'#fff', margin:'0 auto 10px'}}>P</div>
        <div style={{fontSize:17, fontWeight:600, color:'var(--tx)', letterSpacing:'-.03em'}}>{user?.name || 'Priya Sharma'}</div>
        <div style={{fontSize:12, color:'var(--mu)', marginTop:3}}>Day {user?.days_quit || 7} smoke-free · FastAPI backend connected</div>
        <div style={{display:'flex', justifyContent:'center', gap:7, marginTop:10}}>
          <Badge color="g">Week 1</Badge><Badge color="b">HRV +12%</Badge><Badge color="p">MAML on</Badge>
        </div>
      </Card>

      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8}}>
        <Metric label="Days" value={user?.days_quit || 7}/>
        <Metric label="Saved" value={`₹${(user?.money_saved || 2380).toLocaleString()}`}/>
        <Metric label="Cigs" value={user?.cigs_avoided || 119}/>
      </div>

      <Card>
        <CardTitle icon="🔔">Notifications</CardTitle>
        {[['alerts','High-risk alerts','mean > 0.5 AND CI < 0.2'],['preemptive','Pre-emptive warnings','20 min before historical peaks'],['milestones','Milestone celebrations','Day 1, 7, 14, 30, 90'],['community','Community replies','Reactions to your posts']].map(([k,label,sub])=>(
          <div key={k} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'0.5px solid var(--br)'}}>
            <div><div style={{fontSize:13, color:'var(--tx)'}}>{label}</div><div style={{fontSize:11, color:'var(--mu)'}}>{sub}</div></div>
            <Toggle on={notifs[k]} onChange={v=>setNotifs(n=>({...n,[k]:v}))}/>
          </div>
        ))}
      </Card>

      <Card>
        <CardTitle icon="🧠">Model &amp; wearable</CardTitle>
        {[['maml','MAML personalisation','Adapts to your pattern over time'],['samsung','Samsung Health sync','Live HR/HRV via IBI streaming'],['onDevice','On-device inference','No cloud required'],['research','Research data sharing','Anonymous opt-in']].map(([k,label,sub])=>(
          <div key={k} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'0.5px solid var(--br)'}}>
            <div><div style={{fontSize:13, color:'var(--tx)'}}>{label}</div><div style={{fontSize:11, color:'var(--mu)'}}>{sub}</div></div>
            <Toggle on={model[k]} onChange={v=>setModel(m=>({...m,[k]:v}))}/>
          </div>
        ))}
      </Card>

      <Card style={{display:'flex', flexDirection:'column', gap:9}}>
        <CardTitle icon="📤">Export progress</CardTitle>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <Btn secondary onClick={exportProgress}>📄 Export .txt</Btn>
          <Btn secondary onClick={()=>navigator.clipboard?.writeText(`SmokeSense AI · Day ${user?.days_quit||7} smoke-free · ₹${user?.money_saved?.toLocaleString()||2380} saved · ROC-AUC 0.9869`)}>📋 Copy stats</Btn>
        </div>
      </Card>

      <Card>
        <CardTitle icon="ℹ️">About SmokeSense</CardTitle>
        {[['Project','BTech IT Final Year 2023-27'],['University','Somaiya Vidyavihar'],['Backend','FastAPI + SQLite + NumPyro'],['Frontend','React + Vite + Zustand + Recharts'],['HR_delta weight','LR_Prior_Weights.csv +23.9358'],['ROC-AUC','0.9869 · Brier 0.0433']].map(([k,v])=>(
          <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid var(--br)', fontSize:12}}>
            <span style={{color:'var(--mu)'}}>{k}</span>
            <span style={{fontWeight:500, color:'var(--tx)', textAlign:'right', fontSize:11}}>{v}</span>
          </div>
        ))}
      </Card>

      <Btn secondary onClick={logout} style={{color:'#6B1C1C', borderColor:'var(--dl)'}}>🚪 Log out</Btn>
    </div>
  )
}
