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

export function ToolsScreen() {
  const { toolTab, setToolTab, diary, fetchDiary, addDiary,
    nrtLog, fetchNRT, addNRT, reasons, fetchReasons, addReason, toggleReason } = useStore()

  useEffect(() => {
    fetchDiary(); fetchNRT(); fetchReasons()
  }, [])

  const tabs = [['tools','Tools'],['breathe','Breathe'],['diary','Diary'],
    ['games','Games'],['whyiquit','Why I quit'],['nrt','NRT'],['savings','Savings']]

  return (
    <>
      <TabBar tabs={tabs} active={toolTab} onSelect={setToolTab}/>
      <div className="fade-in" style={{padding:'14px 16px', display:'flex', flexDirection:'column', gap:12, paddingBottom:80}}>
        {toolTab === 'tools' && <ToolsGrid setToolTab={setToolTab}/>}
        {toolTab === 'breathe' && <BreatheTab/>}
        {toolTab === 'diary' && <DiaryTab diary={diary} addDiary={addDiary}/>}
        {toolTab === 'games' && <GamesTab/>}
        {toolTab === 'whyiquit' && <WhyIQuitTab reasons={reasons} addReason={addReason} toggleReason={toggleReason}/>}
        {toolTab === 'nrt' && <NRTTab nrtLog={nrtLog} addNRT={addNRT}/>}
        {toolTab === 'savings' && <SavingsTab/>}
      </div>
    </>
  )
}

function ToolsGrid({ setToolTab }) {
  const tools = [
    ['🌬️','4-7-8 Breathing','Calm craving in 4 min','breathe','#D2F5E7'],
    ['📓','Craving diary','Log triggers and coping','diary','#E3EFF9'],
    ['🧩','Distraction games','Beat craving with focus','games','#ECEAFD'],
    ['💭','Why I quit','Revisit your reasons','whyiquit','#FCF0D4'],
    ['💊','NRT tracker','Log patches and gum','nrt','#FBEAF0'],
    ['💰','Savings calc','Money saved so far','savings','#E2F1D1'],
  ]
  return (
    <>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
        {tools.map(([emoji, name, desc, tab, bg])=>(
          <div key={tab} onClick={()=>setToolTab(tab)}
            style={{background:'var(--sf)', borderRadius:14, padding:'13px 11px',
              display:'flex', flexDirection:'column', gap:6, cursor:'pointer',
              border:'0.5px solid var(--br)', transition:'border-color .2s'}}>
            <div style={{width:36, height:36, borderRadius:9, background:bg,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20}}>{emoji}</div>
            <div style={{fontSize:12, fontWeight:600, color:'var(--tx)'}}>{name}</div>
            <div style={{fontSize:11, color:'var(--mu)'}}>{desc}</div>
          </div>
        ))}
      </div>
      <Card>
        <CardTitle icon="💚">Health milestones</CardTitle>
        {[['✅','g','CO normalises — Hour 8','Cleared'],['✅','g','Nicotine cleared — Day 3','All nicotine metabolised'],
          ['✅','g','HRV improving +12%','Samsung Health confirmed'],['⏳','a','Circulation improves','In 7 days'],
          ['⏳','b','Lung capacity +30%','In 23 days'],['⏳','p','Heart attack risk halves','In 83 days']
        ].map(([icon,c,label,sub])=>(
          <div key={label} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'0.5px solid var(--br)'}}>
            <Badge color={c} style={{flexShrink:0}}>{icon}</Badge>
            <div>
              <div style={{fontSize:12, fontWeight:600, color:'var(--tx)'}}>{label}</div>
              <div style={{fontSize:11, color:'var(--mu)'}}>{sub}</div>
            </div>
          </div>
        ))}
      </Card>
    </>
  )
}

function BreatheTab() {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState(0)
  const [count, setCount] = useState(4)
  const [round, setRound] = useState(1)
  const [hint, setHint] = useState('')
  const timerRef = useRef(null)
  const phases = [{l:'Inhale',s:4,h:'Breathe in slowly through your nose…'},
    {l:'Hold',s:7,h:'Hold gently…'},{l:'Exhale',s:8,h:'Exhale fully through your mouth…'}]

  const toggle = () => {
    if (running) {
      clearInterval(timerRef.current); setRunning(false)
      setPhase(0); setCount(4); setRound(1); setHint('')
    } else {
      setRunning(true); let ph=0, cnt=phases[0].s, rnd=1
      timerRef.current = setInterval(() => {
        setPhase(ph); setCount(cnt); setRound(rnd); setHint(phases[ph].h)
        cnt--
        if (cnt < 0) {
          ph = (ph+1)%3
          if (ph===0) { rnd++; if (rnd>4) { clearInterval(timerRef.current); setRunning(false); setPhase(0); setCount(4); setRound(1); setHint(''); return }}
          cnt = phases[ph].s
        }
      }, 1000)
    }
  }

  const phLabel = phases[phase].l
  const expand = phase < 2

  return (
    <div style={{display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:10}}>
      <div style={{fontSize:16, fontWeight:600, color:'var(--tx)'}}>4-7-8 breathing</div>
      <div style={{fontSize:13, color:'var(--mu)', lineHeight:1.6}}>Inhale 4s · Hold 7s · Exhale 8s<br/>Activates parasympathetic NS</div>
      <div style={{width:136, height:136, borderRadius:'50%', border:`6px solid ${C.a}`,
        margin:'12px auto', display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', background:'var(--al)',
        transform: running && expand ? 'scale(1.26)' : 'scale(1)', transition:'transform 4s ease-in-out'}}>
        <div style={{fontSize:14, fontWeight:600, color:'#1F4A07'}}>{phLabel}</div>
        <div style={{fontSize:28, fontWeight:600, color:C.a}}>{count}</div>
      </div>
      <div style={{fontSize:13, color:'var(--mu)'}}>Round {round} / 4</div>
      <div style={{fontSize:11, color:'var(--mu2)', height:18}}>{hint}</div>
      <Btn onClick={toggle} style={{maxWidth:160}}>{running ? 'Stop' : 'Start'}</Btn>
      <Alert color="b" icon="ℹ️" style={{textAlign:'left', maxWidth:300, marginTop:8}}>
        Cravings peak at 5–7 minutes then pass. This exercise bridges that window.
      </Alert>
    </div>
  )
}

function DiaryTab({ diary, addDiary }) {
  const [intensity, setIntensity] = useState(5)
  const [trigger, setTrigger] = useState('Post-meal')
  const [location, setLocation] = useState('Home')
  const [coping, setCoping] = useState('4-7-8 Breathing')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  const save = async () => {
    await addDiary({ intensity, trigger, location, coping, notes, duration_mins:0 })
    setSaved(true); setNotes('')
    setTimeout(()=>setSaved(false), 2500)
  }

  return (
    <>
      <Card style={{display:'flex', flexDirection:'column', gap:11}}>
        <CardTitle icon="✏️">Log a craving episode</CardTitle>
        <div>
          <div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>Urge intensity</div>
          <Slider min={1} max={10} step={1} value={intensity} onChange={setIntensity} fmt={v=>`${v}/10`}/>
        </div>
        <div>
          <div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>Primary trigger</div>
          <Select value={trigger} onChange={setTrigger} options={[
            ['Post-meal','Post-meal'],['Stress/anxiety','Stress/anxiety'],['Social cue','Social cue'],['Boredom','Boredom'],['Morning routine','Morning routine']]}/>
        </div>
        <div>
          <div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>Coping strategy</div>
          <Select value={coping} onChange={setCoping} options={[
            ['4-7-8 Breathing','4-7-8 Breathing'],['Distraction game','Distraction game'],
            ['Waited it out','Waited it out'],['NRT','NRT'],['Called someone','Called someone']]}/>
        </div>
        <div>
          <div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>Notes</div>
          <Textarea value={notes} onChange={setNotes} placeholder="What was happening? What helped?"/>
        </div>
        <Btn onClick={save} style={saved ? {background:'#1F4A07'} : {}}>
          {saved ? '✓ Saved to server!' : '💾 Save entry'}
        </Btn>
      </Card>
      {diary.length > 0 && (
        <Card>
          <CardTitle icon="🕐">Recent episodes (from DB)</CardTitle>
          {diary.slice(0,5).map(d=>(
            <div key={d.id} style={{padding:'9px 0', borderBottom:'0.5px solid var(--br)'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:2}}>
                <span style={{fontSize:12, fontWeight:600, color:'var(--tx)'}}>{d.trigger} · {d.intensity}/10</span>
                <Badge color={d.intensity>=7?'r':d.intensity>=4?'a':'g'}>{d.intensity>=7?'High':d.intensity>=4?'Moderate':'Low'}</Badge>
              </div>
              <div style={{fontSize:11, color:'var(--mu)'}}>{d.coping} · {new Date(d.created_at).toLocaleString()}</div>
            </div>
          ))}
        </Card>
      )}
    </>
  )
}

function GamesTab() {
  const [cbVal, setCbVal] = useState(300)
  const [cbRunning, setCbRunning] = useState(false)
  const cbRef = useRef(null)
  const [crvSecs, setCrvSecs] = useState(420)
  const [crvRunning, setCrvRunning] = useState(false)
  const crvRef = useRef(null)

  const startCB = () => {
    if (cbRunning) { clearInterval(cbRef.current); setCbRunning(false); return }
    setCbRunning(true)
    cbRef.current = setInterval(()=>{
      setCbVal(v=>{ if(v<=3){clearInterval(cbRef.current);setCbRunning(false);return 0;} return v-3 })
    }, 1000)
  }
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const startCrv = () => {
    if (crvRunning) { clearInterval(crvRef.current); setCrvRunning(false); return }
    setCrvRunning(true)
    crvRef.current = setInterval(()=>{
      setCrvSecs(s=>{ if(s<=1){clearInterval(crvRef.current);setCrvRunning(false);return 0;} return s-1 })
    }, 1000)
  }

  return (
    <>
      <div style={{fontSize:13, color:'var(--mu)', lineHeight:1.6}}>Distraction games redirect attention through the craving's 5–7 minute peak.</div>
      <Card>
        <CardTitle icon="🔢">Count backwards by 3</CardTitle>
        <div style={{fontSize:48, fontWeight:600, color:C.a, textAlign:'center', padding:'11px 0',
          fontVariantNumeric:'tabular-nums', letterSpacing:'-.03em'}}>{cbVal}</div>
        <div style={{display:'flex', gap:9}}>
          <Btn onClick={startCB}>{cbRunning?'Stop':cbVal===0?'Done! 🎉':'Start (every 3s)'}</Btn>
          <Btn secondary onClick={()=>{clearInterval(cbRef.current);setCbRunning(false);setCbVal(300)}} style={{maxWidth:80}}>Reset</Btn>
        </div>
      </Card>
      <Card>
        <CardTitle icon="⏱️">Craving countdown</CardTitle>
        <div style={{fontSize:44, fontWeight:300, color:C.a, textAlign:'center', padding:'11px 0', fontFamily:'monospace'}}>{fmt(crvSecs)}</div>
        <div style={{fontSize:12, color:'var(--mu)', textAlign:'center', marginBottom:9}}>Average craving: 5–7 min. Outlast it.</div>
        <div style={{display:'flex', gap:9}}>
          <Btn onClick={startCrv}>{crvRunning?'Stop':crvSecs===0?'You made it! 🎉':'Start timer'}</Btn>
          <Btn secondary onClick={()=>{clearInterval(crvRef.current);setCrvRunning(false);setCrvSecs(420)}} style={{maxWidth:80}}>Reset</Btn>
        </div>
      </Card>
      <Card>
        <CardTitle icon="🌈">5-4-3-2-1 grounding</CardTitle>
        {[['b','👁️','5 things you can see'],['g','🤚','4 things you can touch'],
          ['a','👂','3 things you can hear'],['p','👃','2 things you can smell'],
          ['r','👅','1 thing you can taste']].map(([c,icon,text])=>(
          <Alert key={text} color={c} icon={icon} style={{marginBottom:6}}>{text}</Alert>
        ))}
      </Card>
    </>
  )
}

function WhyIQuitTab({ reasons, addReason, toggleReason }) {
  const [newText, setNewText] = useState('')
  const add = async () => {
    if (!newText.trim()) return
    await addReason(newText.trim()); setNewText('')
  }
  return (
    <>
      <div style={{fontSize:15, fontWeight:600, color:'var(--tx)'}}>Why I quit</div>
      <div style={{fontSize:13, color:'var(--mu)', lineHeight:1.6}}>Read these during a craving. Activating the prefrontal cortex helps override the limbic urge response.</div>
      <Card>
        <CardTitle icon="💚">My reasons (synced from server)</CardTitle>
        {reasons.map(r=>(
          <div key={r.id} style={{display:'flex', alignItems:'flex-start', gap:10, padding:'9px 0', borderBottom:'0.5px solid var(--br)'}}>
            <div onClick={()=>toggleReason(r.id, !r.checked)} style={{
              width:20, height:20, borderRadius:5, flexShrink:0, marginTop:1, cursor:'pointer',
              background: r.checked ? C.a : 'transparent',
              border: `2px solid ${r.checked ? C.a : 'var(--br)'}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontSize:12, fontWeight:600, transition:'all .15s'
            }}>{r.checked ? '✓' : ''}</div>
            <div style={{fontSize:13, color:'var(--tx)', lineHeight:1.5}}>{r.text}</div>
          </div>
        ))}
      </Card>
      <Card style={{display:'flex', flexDirection:'column', gap:9}}>
        <CardTitle icon="➕">Add a reason</CardTitle>
        <Input value={newText} onChange={setNewText} placeholder="Enter your reason…"/>
        <Btn onClick={add}>➕ Add reason</Btn>
      </Card>
    </>
  )
}

function NRTTab({ nrtLog, addNRT }) {
  const [type, setType] = useState('Patch (21mg)')
  const [dose, setDose] = useState(21)
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  const log = async () => {
    await addNRT({ type, dose_mg:dose, notes })
    setSaved(true); setNotes('')
    setTimeout(()=>setSaved(false), 2500)
  }

  return (
    <>
      <Alert color="b" icon="💊">Track NRT doses to maintain therapeutic levels and avoid double-dosing.</Alert>
      <Card style={{display:'flex', flexDirection:'column', gap:10}}>
        <CardTitle icon="➕">Log NRT dose</CardTitle>
        <div>
          <div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>Type</div>
          <Select value={type} onChange={t=>{setType(t);setDose(parseInt(t.match(/\d+/)?.[0]||21))}} options={[
            ['Patch (21mg)','Patch (21mg)'],['Patch (14mg)','Patch (14mg)'],['Patch (7mg)','Patch (7mg)'],
            ['Gum (4mg)','Gum (4mg)'],['Gum (2mg)','Gum (2mg)'],['Lozenge (4mg)','Lozenge (4mg)'],['Inhaler','Inhaler']]}/>
        </div>
        <div>
          <div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>Notes</div>
          <Input value={notes} onChange={setNotes} placeholder="e.g. Left arm, post-meal craving"/>
        </div>
        <Btn onClick={log} style={saved ? {background:'#1F4A07'} : {}}>{saved ? '✓ Logged to server!' : 'Log dose'}</Btn>
      </Card>
      {nrtLog.length > 0 && (
        <Card>
          <CardTitle icon="🕐">Today's NRT log (from DB)</CardTitle>
          {nrtLog.map(n=>(
            <div key={n.id} style={{display:'flex', alignItems:'center', gap:9, padding:'8px 0', borderBottom:'0.5px solid var(--br)'}}>
              <Badge color="b">{new Date(n.logged_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</Badge>
              <div>
                <div style={{fontSize:12, fontWeight:600, color:'var(--tx)'}}>{n.type}</div>
                <div style={{fontSize:11, color:'var(--mu)'}}>{n.notes}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  )
}

function SavingsTab() {
  const { user } = useStore()
  const [cpd, setCpd] = useState(user?.cigs_per_day || 17)
  const [ppc, setPpc] = useState(user?.price_per_cig || 10)
  const [days, setDays] = useState(user?.days_quit || 7)
  const total = Math.round(cpd * ppc * days)

  return (
    <>
      <Card>
        <CardTitle icon="💰">Savings calculator</CardTitle>
        <div style={{fontSize:26, fontWeight:600, color:'#1F4A07', marginBottom:3, fontVariantNumeric:'tabular-nums'}}>₹ {total.toLocaleString()}</div>
        <div style={{fontSize:12, color:'var(--mu)', marginBottom:14}}>saved since quitting</div>
        <div style={{display:'flex', flexDirection:'column', gap:11}}>
          <div><div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>Cigarettes per day</div><Slider min={1} max={40} step={1} value={cpd} onChange={setCpd} fmt={v=>`${v} cigs`}/></div>
          <div><div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>Price per cigarette (₹)</div><Slider min={1} max={30} step={1} value={ppc} onChange={setPpc} fmt={v=>`₹${v}`}/></div>
          <div><div style={{fontSize:11, color:'var(--mu)', marginBottom:4}}>Days smoke-free</div><Slider min={1} max={365} step={1} value={days} onChange={setDays} fmt={v=>`${v} days`}/></div>
        </div>
      </Card>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
        <Metric label="Per week" value={`₹${Math.round(total/days*7).toLocaleString()}`}/>
        <Metric label="Per month" value={`₹${Math.round(total/days*30).toLocaleString()}`}/>
        <Metric label="Per year" value={`₹${Math.round(total/days*365).toLocaleString()}`}/>
        <Metric label="Cigs avoided" value={(cpd*days).toLocaleString()}/>
      </div>
      <Alert color="g" icon="🎯">
        At this rate you'll save <strong>₹{Math.round(total/days*365).toLocaleString()}</strong> in a year — a real return on quitting.
      </Alert>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// SCREEN 3: AI CHAT
// ═══════════════════════════════════════════════════════════
