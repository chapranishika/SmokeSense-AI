// Shared UI components for SmokeSense AI
import { useState } from 'react'

export const C = {
  a:'#0FA870', al:'#D2F5E7', ad:'#07643F',
  w:'#C27A10', wl:'#FCF0D4',
  d:'#B83232', dl:'#FDEAEA',
  p:'#5B50C8', pl:'#ECEAFD',
  b:'#1B6AB5', bl:'#E3EFF9',
  g:'#3E7414', gl:'#E2F1D1',
}

export const Badge = ({ color = 'g', children, style }) => {
  const map = {
    g:[C.gl,'#1F4A07'], a:[C.wl,'#5E3806'], r:[C.dl,'#6B1C1C'],
    b:[C.bl,'#0A3870'], p:[C.pl,'#30257A'], mu:['var(--sf2)','var(--mu)']
  }
  const [bg, col] = map[color] || map.g
  return <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 8px',
    borderRadius:20, fontSize:11, fontWeight:600, background:bg, color:col, ...style }}>{children}</span>
}

export const Alert = ({ color = 'g', icon = 'ℹ️', children, style }) => {
  const map = {
    g:[C.gl,'#1F4A07'], a:[C.wl,'#5E3806'], r:[C.dl,'#6B1C1C'],
    b:[C.bl,'#0A3870'], p:[C.pl,'#30257A']
  }
  const [bg, col] = map[color] || map.g
  return <div style={{ background:bg, color:col, borderRadius:9, padding:'10px 12px',
    fontSize:13, display:'flex', gap:8, alignItems:'flex-start', lineHeight:1.55, ...style }}>
    <span style={{ flexShrink:0, fontSize:16, marginTop:1 }}>{icon}</span>
    <div>{children}</div>
  </div>
}

export const Card = ({ children, style }) => (
  <div style={{ background:'var(--bg)', border:'0.5px solid var(--br)',
    borderRadius:14, padding:15, ...style }}>{children}</div>
)

export const CardTitle = ({ icon, children }) => (
  <div style={{ fontSize:11, fontWeight:600, color:'var(--mu)', marginBottom:11,
    display:'flex', alignItems:'center', gap:5, textTransform:'uppercase', letterSpacing:'.07em' }}>
    <span style={{ fontSize:14 }}>{icon}</span>{children}
  </div>
)

export const Metric = ({ label, value, unit }) => (
  <div style={{ background:'var(--sf)', borderRadius:9, padding:11, border:'0.5px solid var(--br)' }}>
    <div style={{ fontSize:10, color:'var(--mu2)', marginBottom:2, fontWeight:500 }}>{label}</div>
    <div style={{ fontSize:18, fontWeight:600, color:'var(--tx)', lineHeight:1.1, fontVariantNumeric:'tabular-nums' }}>
      {value}{unit && <span style={{ fontSize:10, color:'var(--mu)', fontWeight:400 }}> {unit}</span>}
    </div>
  </div>
)

export const Btn = ({ onClick, disabled, secondary, children, style }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: disabled ? 'var(--sf2)' : secondary ? 'var(--sf)' : C.a,
    color: disabled ? 'var(--mu)' : secondary ? 'var(--tx)' : '#fff',
    border: secondary ? '0.5px solid var(--br)' : 'none',
    borderRadius:9, padding:'11px 16px', fontSize:14, fontWeight:600,
    cursor: disabled ? 'not-allowed' : 'pointer', width:'100%',
    display:'flex', alignItems:'center', justifyContent:'center', gap:7,
    fontFamily:'inherit', transition:'all .18s', ...style
  }}>{children}</button>
)

export const Toggle = ({ on, onChange }) => (
  <div onClick={() => onChange(!on)} style={{
    width:42, height:24, borderRadius:12,
    background: on ? C.a : 'var(--sf2)',
    border: `0.5px solid ${on ? C.a : 'var(--br)'}`,
    cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0
  }}>
    <div style={{
      position:'absolute', width:18, height:18, borderRadius:'50%', background:'#fff',
      top:2, left:2, transition:'transform .2s',
      transform: on ? 'translateX(18px)' : 'none',
      boxShadow:'0 1px 4px rgba(0,0,0,.2)'
    }}/>
  </div>
)

export const Slider = ({ min, max, step=1, value, onChange, fmt }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ flex:1, accentColor:C.a }}/>
    <div style={{ fontSize:13, fontWeight:600, color:'var(--tx)', minWidth:56,
      textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
      {fmt ? fmt(value) : value}
    </div>
  </div>
)

export const Select = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{ border:'0.5px solid var(--br)', borderRadius:9, padding:'9px 11px',
      fontSize:13, background:'var(--sf)', color:'var(--tx)',
      width:'100%', fontFamily:'inherit', outline:'none' }}>
    {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
  </select>
)

export const Input = ({ value, onChange, placeholder, type='text' }) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{ border:'0.5px solid var(--br)', borderRadius:9, padding:'9px 11px',
      fontSize:13, background:'var(--sf)', color:'var(--tx)',
      width:'100%', fontFamily:'inherit', outline:'none' }}/>
)

export const Textarea = ({ value, onChange, placeholder, rows=3 }) => (
  <textarea value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder} rows={rows}
    style={{ border:'0.5px solid var(--br)', borderRadius:9, padding:'9px 11px',
      fontSize:13, background:'var(--sf)', color:'var(--tx)',
      width:'100%', fontFamily:'inherit', outline:'none', resize:'none' }}/>
)

export const RiskGauge = ({ prob, ciLo, ciHi, size=112 }) => {
  const col = prob > 0.6 ? C.d : prob > 0.4 ? C.w : C.a
  const label = prob > 0.6 ? 'High risk' : prob > 0.4 ? 'Moderate risk' : 'Low risk'
  const labelCol = prob > 0.6 ? '#6B1C1C' : prob > 0.4 ? '#5E3806' : '#1F4A07'
  const bgCol = prob > 0.6 ? C.dl : prob > 0.4 ? C.wl : C.gl
  return (
    <div style={{ background:`linear-gradient(135deg,${bgCol},${bgCol}88)`,
      borderRadius:14, padding:'18px 16px 14px', textAlign:'center' }}>
      <div style={{ fontSize:9, fontWeight:600, color:'var(--mu)', textTransform:'uppercase',
        letterSpacing:'.09em', marginBottom:9 }}>Live urge probability · Bayesian LR</div>
      <div style={{ width:size, height:size, borderRadius:'50%', border:`6px solid ${col}`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        background:'var(--bg)', margin:'0 auto 8px', transition:'border-color .4s' }}>
        <span style={{ fontSize:28, fontWeight:600, color:'var(--tx)', lineHeight:1,
          fontVariantNumeric:'tabular-nums' }}>{Math.round(prob*100)}</span>
        <span style={{ fontSize:11, color:'var(--mu)' }}>%</span>
      </div>
      <div style={{ fontSize:15, fontWeight:600, color:labelCol }}>{label}</div>
      <div style={{ fontSize:10, color:'var(--mu)', marginTop:8, marginBottom:3 }}>95% credible interval</div>
      <div style={{ height:4, background:'rgba(0,0,0,.1)', borderRadius:2, margin:'0 20px', position:'relative' }}>
        <div style={{ position:'absolute', height:'100%', background:col, borderRadius:2,
          left:`${Math.round(ciLo*100)}%`, width:`${Math.round((ciHi-ciLo)*100)}%`, transition:'all .4s' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10,
        color:'var(--mu)', margin:'3px 20px 0' }}>
        <span>{Math.round(ciLo*100)}%</span><span>{Math.round(ciHi*100)}%</span>
      </div>
    </div>
  )
}

export const FeatureBar = ({ label, value, positive, maxAbs=24 }) => (
  <div>
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12,
      color:'var(--tx)', marginBottom:2 }}>
      <span>{label}</span>
      <span style={{ fontWeight:600, color: positive ? '#1F4A07' : '#6B1C1C' }}>
        {positive ? '+' : ''}{value.toFixed(4)}
      </span>
    </div>
    <div style={{ height:3, background:'var(--sf2)', borderRadius:2, overflow:'hidden' }}>
      <div style={{ height:'100%', borderRadius:2,
        background: positive ? C.a : '#E24B4A',
        width:`${Math.min(100, Math.abs(value)/maxAbs*100)}%` }}/>
    </div>
  </div>
)

export const NavBar = ({ screen, onNav }) => {
  const items = [
    ['🏠','Home'], ['🧠','Predict'], ['🛠️','Tools'],
    ['🤖','AI'], ['👥','Community'], ['🔬','Research'], ['👤','Profile']
  ]
  return (
    <nav style={{ display:'flex', background:'var(--bg)', borderTop:'0.5px solid var(--br)',
      position:'sticky', bottom:0, zIndex:60 }}>
      {items.map(([icon, label], i) => (
        <div key={i} onClick={() => onNav(i)} style={{
          flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2,
          cursor:'pointer', padding:'8px 0', color: screen===i ? C.a : 'var(--mu)',
          transition:'color .15s', fontSize:8.5, fontWeight:600,
          letterSpacing:'.04em', textTransform:'uppercase'
        }}>
          <span style={{ fontSize:20 }}>{icon}</span>{label}
        </div>
      ))}
    </nav>
  )
}

export const TabBar = ({ tabs, active, onSelect, top=50 }) => (
  <div style={{ display:'flex', borderBottom:'0.5px solid var(--br)', background:'var(--bg)',
    position:'sticky', top, zIndex:50, overflowX:'auto' }}>
    {tabs.map(([key, label]) => (
      <div key={key} onClick={() => onSelect(key)} style={{
        flex:1, minWidth:50, padding:'8px 5px', textAlign:'center', fontSize:11,
        fontWeight:500, color: active===key ? C.a : 'var(--mu)', cursor:'pointer',
        borderBottom:`2px solid ${active===key ? C.a : 'transparent'}`,
        whiteSpace:'nowrap', transition:'all .15s'
      }}>{label}</div>
    ))}
  </div>
)

export function useSpinner(label='Loading…') {
  const [busy, setBusy] = useState(false)
  const run = async (fn) => { setBusy(true); try { await fn() } finally { setBusy(false) } }
  return { busy, run, label }
}
