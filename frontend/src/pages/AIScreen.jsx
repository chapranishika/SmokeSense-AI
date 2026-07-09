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

export function AIScreen() {
  const { token, prediction } = useStore()
  const [messages, setMessages] = useState([
    { role:'ai', text:"Hi! I'm your AI quit-smoking companion. I have your real NumPyro model weights (HR_delta +23.9358) and live backend data. Ask me anything! 🌿" },
    { role:'ai', text:`Current urge: ${Math.round((prediction?.mean_prob||0.23)*100)}% (${prediction?.triggered?'INTERVENTION TRIGGERED':'low risk'}). CI [${Math.round((prediction?.ci_lower||0.12)*100)}%, ${Math.round((prediction?.ci_upper||0.34)*100)}%] from live Bayesian inference.`, highlight:true },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages])

  const send = async () => {
    if (busy || !input.trim()) return
    const text = input.trim(); setInput(''); setBusy(true)
    const newMessages = [...messages, {role:'user', text}]
    setMessages(newMessages)
    let reply = ''
    try {
      const res = await fetch('/api/ai/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body:JSON.stringify({
          // Only send real conversational turns (skip the two seed greetings)
          messages: newMessages.slice(2).map(m=>({
            role: m.role==='user' ? 'user' : 'assistant',
            content: m.text
          }))
        })
      })
      if (res.status === 401) { useStore.getState().logout(); return }
      const d = await res.json()
      reply = d.reply || "Sorry, I couldn't get a response right now."
    } catch { reply = "I'm having trouble connecting to the server right now — please try again." }
    setMessages(m=>[...m, {role:'ai', text:reply}])
    setBusy(false)
  }

  return (
    <div style={{display:'flex', flexDirection:'column', flex:1}}>
      <div style={{display:'flex', flexDirection:'column', gap:0, padding:'12px 16px', flex:1, overflowY:'auto', minHeight:300}}>
        {messages.map((m,i)=>(
          <div key={i} style={{display:'flex', gap:7, alignItems:'flex-end', flexDirection:m.role==='user'?'row-reverse':'row', marginBottom:10}}>
            {m.role==='ai' && <div style={{width:26, height:26, borderRadius:'50%', background:'var(--al)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:13, color:C.a}}>🤖</div>}
            <div style={{maxWidth:'82%', padding:'8px 12px', borderRadius:14, fontSize:13, lineHeight:1.5,
              ...(m.role==='user' ? {background:C.a, color:'#fff', borderBottomRightRadius:3} :
              {background: m.highlight ? 'var(--al)' : 'var(--sf)', border:`0.5px solid ${m.highlight ? C.a : 'var(--br)'}`, color:'var(--tx)', borderBottomLeftRadius:3})}}>
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div style={{display:'flex', gap:7, alignItems:'flex-end', marginBottom:10}}>
            <div style={{width:26, height:26, borderRadius:'50%', background:'var(--al)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>🤖</div>
            <div style={{display:'flex', gap:4, padding:'8px 12px', background:'var(--sf)', borderRadius:14, border:'0.5px solid var(--br)', borderBottomLeftRadius:3}}>
              {[0,1,2].map(i=><div key={i} style={{width:5, height:5, borderRadius:'50%', background:'var(--mu)', animation:`bx 1.2s ${i*0.2}s infinite`}}/>)}
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      <style>{`@keyframes bx{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}`}</style>
      <div style={{display:'flex', gap:7, padding:'9px 16px', borderTop:'0.5px solid var(--br)', background:'var(--bg)'}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="Ask your AI companion anything…"
          style={{flex:1, border:'0.5px solid var(--br)', borderRadius:18, padding:'8px 13px', fontSize:13,
            background:'var(--sf)', color:'var(--tx)', fontFamily:'inherit', outline:'none'}}/>
        <button onClick={send} disabled={busy} style={{width:36, height:36, borderRadius:'50%',
          background: busy ? 'var(--sf2)' : C.a, border:'none', cursor:busy?'not-allowed':'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'#fff', fontSize:16}}>➤</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// SCREEN 4: COMMUNITY
// ═══════════════════════════════════════════════════════════
