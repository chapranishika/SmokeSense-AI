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

export function CommunityScreen() {
  const { commTab, setCommTab, progress, fetchProgress } = useStore()
  const [posts, setPosts] = useState([
    {id:1,init:'AR',bg:'var(--al)',tc:'#1F4A07',name:'Arjun R.',time:'12 min ago · 21 days',badge:'Day 21',bc:'g',text:'3 weeks! The CI suppression policy only fires when the model is genuinely confident — that makes it trustworthy. 4-7-8 got me through Tuesday.',likes:42,liked:true},
    {id:2,init:'PM',bg:'var(--bl)',tc:'#0A3870',name:'Preethi M.',time:'1h ago · 7 days',badge:'Day 7',bc:'a',text:'Week 1! MAML already knows my post-lunch pattern. HRV improving on the backend dashboard makes it feel real.',likes:27,liked:false},
    {id:3,init:'SK',bg:'var(--wl)',tc:'#5E3806',name:'Siddharth K.',time:'3h ago · 45 days',badge:'Day 45',bc:'g',text:"45 days. Trust the uncertainty quantification. Model saying 'wide CI, no alert' is information too — give MAML time.",likes:91,liked:false},
  ])
  const [newPost, setNewPost] = useState('')

  useEffect(()=>{ fetchProgress() }, [])

  const trigData = (progress?.trigger_distribution || [
    {trigger:'Post-meal',count:8},{trigger:'Stress',count:6},
    {trigger:'Social',count:4},{trigger:'Boredom',count:2},{trigger:'Other',count:1}
  ]).map((t,i)=>({name:t.trigger||t.name, value:t.count||t.value, color:COLORS[i%COLORS.length]}))

  const trendData = progress?.daily_avg_probs?.map((d,i)=>({day:d.day?.slice(-5)||`Day ${i+1}`, urge:Math.round(d.avg_prob*100)})) ||
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>({day:d, urge:[38,34,29,27,25,22,19][i]}))

  return (
    <>
      <TabBar tabs={[['feed','Feed'],['progress','Progress'],['board','Board']]} active={commTab} onSelect={setCommTab}/>
      <div className="fade-in" style={{padding:'14px 16px', display:'flex', flexDirection:'column', gap:12, paddingBottom:80}}>
        {commTab === 'feed' && (
          <>
            {posts.map(p=>(
              <div key={p.id} style={{background:'var(--bg)', border:'0.5px solid var(--br)', borderRadius:14, padding:13}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
                  <div style={{width:33, height:33, borderRadius:'50%', background:p.bg, color:p.tc, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600}}>{p.init}</div>
                  <div><div style={{fontSize:13, fontWeight:600, color:'var(--tx)'}}>{p.name}</div><div style={{fontSize:10, color:'var(--mu2)'}}>{p.time}</div></div>
                  <Badge color={p.bc} style={{marginLeft:'auto'}}>{p.badge}</Badge>
                </div>
                <div style={{fontSize:12, color:'var(--tx)', lineHeight:1.55, marginBottom:8}}>{p.text}</div>
                <div onClick={()=>setPosts(ps=>ps.map(pp=>pp.id===p.id?{...pp,liked:!pp.liked,likes:pp.liked?pp.likes-1:pp.likes+1}:pp))}
                  style={{fontSize:11, color:p.liked?'#E24B4A':'var(--mu)', cursor:'pointer', display:'flex', alignItems:'center', gap:3}}>
                  ❤️ {p.likes}
                </div>
              </div>
            ))}
            <Card style={{display:'flex', flexDirection:'column', gap:8}}>
              <CardTitle icon="✏️">Share your story</CardTitle>
              <Textarea value={newPost} onChange={setNewPost} placeholder="What's helped you today?" rows={2}/>
              <Btn onClick={()=>{
                if(!newPost.trim())return
                setPosts(ps=>[{id:Date.now(),init:'PR',bg:'var(--al)',tc:'#1F4A07',name:'Priya (you)',time:'Just now · 7 days',badge:'Day 7',bc:'g',text:newPost.trim(),likes:0,liked:false},...ps])
                setNewPost('')
              }}>📤 Post</Btn>
            </Card>
          </>
        )}
        {commTab === 'progress' && (
          <>
            <Card>
              <CardTitle icon="🔥">Streak</CardTitle>
              <div style={{fontSize:22, fontWeight:600, color:C.a, marginBottom:9}}>{progress?.days_quit||7} <span style={{fontSize:12, color:'var(--mu)', fontWeight:400}}>days smoke-free</span></div>
              <div style={{display:'flex', gap:4}}>
                {'MTWTFSS'.split('').map((d,i)=>(
                  <div key={i} style={{width:28, height:28, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, background:i<6?C.a:'var(--al)', color:i<6?'#fff':'#1F4A07', border:i===6?`2px solid ${C.a}`:'none'}}>{d}</div>
                ))}
              </div>
            </Card>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
              <Metric label="Cigs avoided" value={progress?.cigs_avoided||119}/>
              <Metric label="Money saved" value={`₹${(progress?.money_saved||2380).toLocaleString()}`}/>
              <Metric label="Diary entries" value={progress?.diary_entries||23}/>
              <Metric label="HRV gain" value={`+${progress?.hrv_gain_pct||12.3}%`}/>
            </div>
            <Card><CardTitle icon="📉">Urge trend (from backend DB)</CardTitle>
              <ResponsiveContainer width="100%" height={110}>
                <LineChart data={trendData}><CartesianGrid {...gchart}/>
                  <XAxis dataKey="day" tick={tickStyle}/><YAxis domain={[0,50]} tick={tickStyle} tickFormatter={v=>`${v}%`}/>
                  <Line type="monotone" dataKey="urge" stroke={C.a} strokeWidth={2} dot={{r:3,fill:C.a}}/>
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card><CardTitle icon="🍩">Trigger distribution (DB)</CardTitle>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart><Pie data={trigData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" nameKey="name">
                  {trigData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Pie><Tooltip/><Legend iconSize={10} wrapperStyle={{fontSize:11}}/></PieChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}
        {commTab === 'board' && (
          <>
            <Alert color="b" icon="🏆">Weekly smoke-free leaderboard — Sober Group cohort.</Alert>
            <Card style={{padding:0, overflow:'hidden'}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                <thead><tr>{['#','Member','Days','Avg urge'].map(h=><th key={h} style={{background:'var(--sf2)', color:'var(--mu)', fontWeight:600, padding:'7px 8px', textAlign:'left', borderBottom:'0.5px solid var(--br)', fontSize:10, letterSpacing:'.04em', textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
                <tbody>{[['🥇','Siddharth K.',45,'14%',false],['🥈','Arjun R.',21,'21%',false],['🥉','Meera S.',14,'25%',false],
                  ['4','Priya (you)',7,'23%',true],['5','Preethi M.',7,'28%',false]].map(([pos,name,days,urge,me])=>(
                  <tr key={name} style={{background:me?'rgba(15,168,112,.07)':'transparent'}}>
                    {[pos,me?<strong>{name}</strong>:name,days,urge].map((v,i)=>(
                      <td key={i} style={{padding:'7px 8px', borderBottom:'0.5px solid var(--br)', color:'var(--tx)', fontVariantNumeric:'tabular-nums', ...(me&&i===0?{borderLeft:`2px solid ${C.a}`}:{})}}>{v}</td>
                    ))}
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          </>
        )}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// SCREEN 5: RESEARCH
// ═══════════════════════════════════════════════════════════
