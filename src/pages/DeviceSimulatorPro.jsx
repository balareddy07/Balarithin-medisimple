import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Volume2, VolumeX, Bluetooth, Cpu, Zap } from 'lucide-react'

/* ── constants ─────────────────────────────────────────────────────── */
const PATIENT = { glucoseMin: 88, glucoseMax: 128, hrMax: 100, spo2Min: 92, name: 'Rajesh Kumar', age: 62 }

const SCENARIOS = [
  { key:'normal',  emoji:'🟢', label:'Normal Resting',       g:105, hr:68,  spo2:98, temp:36.5, accent:'#10B981' },
  { key:'spike',   emoji:'🔴', label:'Post-Meal Spike',       g:188, hr:82,  spo2:97, temp:36.7, accent:'#EF4444' },
  { key:'tachy',   emoji:'❤️', label:'Tachycardia',           g:112, hr:118, spo2:95, temp:37.2, accent:'#F43F5E' },
  { key:'hypoxia', emoji:'🔵', label:'Sleep Hypoxia',         g:92,  hr:88,  spo2:86, temp:36.1, accent:'#3B82F6' },
]

const TAG_COLORS = {
  'CGM-BLE':   '#22D3EE', 'BAND-BLE': '#F472B6', 'SUPABASE':  '#34D399',
  'AI-ENGINE': '#F87171', 'NFC-HW':   '#A78BFA', 'ALERT':     '#FBBF24',
  'ECG':       '#60A5FA', 'SYSTEM':   '#6B7280',
}

/* ── keyframe css injected once ───────────────────────────────────── */
const CSS = `
@keyframes float-slow { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
@keyframes nfc-ping   { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(3.2);opacity:0} }
@keyframes shake-alert{ 0%,100%{transform:translateX(0) rotateZ(0)} 20%{transform:translateX(-5px) rotateZ(-1deg)} 40%{transform:translateX(5px) rotateZ(1deg)} 60%{transform:translateX(-4px) rotateZ(-.5deg)} 80%{transform:translateX(4px) rotateZ(.5deg)} }
@keyframes halo-breath{ 0%,100%{opacity:.25;transform:scale(1)} 50%{opacity:.7;transform:scale(1.05)} }
@keyframes ecg-scan   { 0%{stroke-dashoffset:1200} 100%{stroke-dashoffset:0} }
@keyframes led-pulse  { 0%,100%{opacity:.6} 50%{opacity:1} }
@keyframes band-tilt  { 0%,100%{transform:perspective(700px) rotateY(-3deg) rotateX(4deg)} 50%{transform:perspective(700px) rotateY(3deg) rotateX(2deg)} }
@keyframes island-live{ 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)} 60%{box-shadow:0 0 0 6px rgba(16,185,129,0)} }
@keyframes glow-red   { 0%,100%{box-shadow:0 0 8px rgba(239,68,68,.4)} 50%{box-shadow:0 0 22px rgba(239,68,68,.9)} }
@keyframes spin-slow  { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
`

/* ── helpers ──────────────────────────────────────────────────────── */
function ts() { return new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}) }
function gTrend(g, prev) {
  const d = g - prev
  if (d > 10) return { arrow:'↑↑', color:'#EF4444' }
  if (d > 3)  return { arrow:'↗',  color:'#F59E0B' }
  if (d < -10)return { arrow:'↓↓', color:'#3B82F6' }
  if (d < -3) return { arrow:'↘',  color:'#3B82F6' }
  return { arrow:'→', color:'#10B981' }
}
function gColor(g) {
  if (g > 128) return '#F59E0B'
  if (g < 88)  return '#EF4444'
  return '#10B981'
}
function hrColor(hr) { return hr > 100 ? '#EF4444' : '#10B981' }
function spo2Color(s) { return s < 92 ? '#EF4444' : s < 95 ? '#F59E0B' : '#10B981' }

/* ECG path — 4 PQRST cycles across width=320, height=40 */
function makeECG(w=320, h=40, cycles=4) {
  const m = h/2, cw = w/cycles
  let d = `M 0,${m}`
  for (let c=0;c<cycles;c++) {
    const x = c*cw, s = cw/80
    d += ` C${x+s*5},${m} ${x+s*9},${m-3.5} ${x+s*13},${m-4.5} C${x+s*17},${m-3.5} ${x+s*21},${m} ${x+s*25},${m}`
    d += ` L${x+s*27},${m} L${x+s*29},${m+7} L${x+s*33},${m-20} L${x+s*37},${m+5} L${x+s*41},${m}`
    d += ` C${x+s*50},${m} ${x+s*55},${m-7} ${x+s*61},${m-7} C${x+s*67},${m-7} ${x+s*71},${m} ${x+s*77},${m}`
    d += ` L${x+cw},${m}`
  }
  return d
}

/* ── CGM Patch ────────────────────────────────────────────────────── */
function CGMPatch({ phase, onTap, glucose }) {
  const ledColor = phase==='idle' ? '#6B7280' : phase==='nfc'||phase==='warmup' ? '#F59E0B' : gColor(glucose)
  const isAlert = glucose > 128 || glucose < 88
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">SimpleMed CGM Patch</p>
      <div style={{ animation: 'float-slow 4s ease-in-out infinite' }}>
        {/* NFC ripple rings */}
        {(phase==='nfc'||phase==='warmup') && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {[0,150,300].map(delay => (
              <div key={delay} className="absolute w-32 h-32 rounded-full border-2 border-cyan-400"
                style={{ animation:`nfc-ping 1.2s ease-out ${delay}ms infinite`, opacity:0 }}/>
            ))}
          </div>
        )}
        {/* Alert glow */}
        {isAlert && phase==='measuring' && (
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ animation:'glow-red 1.2s ease-in-out infinite' }}/>
        )}
        <button
          onClick={onTap} disabled={phase!=='idle'}
          style={{ position:'relative' }}
          className="w-36 h-36 rounded-full select-none focus:outline-none cursor-pointer
                     disabled:cursor-default transition-transform active:scale-95"
        >
          {/* Adhesive backing */}
          <div className="absolute inset-0 rounded-full"
            style={{ background:'linear-gradient(135deg,#f5f5dc,#e8e0c8)', boxShadow:'0 6px 24px rgba(0,0,0,.35)' }}/>
          {/* Main dome */}
          <div className="absolute inset-3 rounded-full flex flex-col items-center justify-center gap-1"
            style={{ background:'linear-gradient(145deg,#1e2a3a,#0f172a)', border:'1.5px solid rgba(99,102,241,.3)' }}>
            {/* LED */}
            <div className="w-3 h-3 rounded-full mb-1"
              style={{ background:ledColor, animation: phase==='measuring' ? 'led-pulse 1.2s ease-in-out infinite' : 'none',
                       boxShadow:`0 0 10px ${ledColor}` }}/>
            <span className="text-white text-[10px] font-mono font-bold leading-none">
              {phase==='idle'    && 'TAP NFC'}
              {phase==='nfc'     && 'COUPLING'}
              {phase==='warmup'  && 'WARMUP'}
              {phase==='measuring' && `${glucose}`}
            </span>
            {phase==='measuring' && (
              <span className="text-[9px] text-gray-400 font-mono">mg/dL</span>
            )}
          </div>
          {/* Tape strips */}
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-6 h-10 rounded-l-md opacity-60"
            style={{ background:'linear-gradient(90deg,#e8e0c8,transparent)' }}/>
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-10 rounded-r-md opacity-60"
            style={{ background:'linear-gradient(-90deg,#e8e0c8,transparent)' }}/>
        </button>
      </div>
      <div className="text-center space-y-1">
        {phase==='idle' && (
          <p className="text-cyan-400 text-xs font-semibold animate-pulse">📱 Simulate NFC Phone Tap</p>
        )}
        {phase==='warmup' && (
          <p className="text-amber-400 text-xs font-semibold">⚡ AFE4900 Warming Up…</p>
        )}
        {phase==='measuring' && (
          <p className="text-emerald-400 text-xs font-semibold">● Live Glucose Streaming</p>
        )}
        <div className="flex gap-2 justify-center flex-wrap mt-1">
          {['nRF52832','TI AFE4900','IP68'].map(t => (
            <span key={t} className="text-[9px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded font-mono">{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Apple Watch Ultra-inspired band ─────────────────────────────── */
function WatchBand3D({ glucose, hr, spo2, temp, isAlert }) {
  const ecgPath = makeECG(200,30,3)
  const ecgPeriod = Math.max(0.4, (60/hr)).toFixed(2)
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">MediSimple Band</p>
      {/* 3D perspective wrapper */}
      <div style={{ perspective:'700px', perspectiveOrigin:'50% 50%' }}>
        <div style={{ animation: isAlert ? 'shake-alert .5s ease-in-out 3' : 'band-tilt 6s ease-in-out infinite',
                      transformStyle:'preserve-3d', display:'inline-block' }}>
          {/* TOP STRAP */}
          <div style={{ width:76, height:80, margin:'0 auto',
                        background:'linear-gradient(90deg,#1a1a2e,#2d2d4e)',
                        borderTopLeftRadius:10, borderTopRightRadius:10,
                        transform:'rotateX(-55deg)', transformOrigin:'bottom center',
                        borderLeft:'2px solid rgba(99,102,241,.3)', borderRight:'2px solid rgba(99,102,241,.3)',
                        borderTop:'2px solid rgba(99,102,241,.3)' }}>
            <div className="flex justify-around mt-3">
              {[0,1,2].map(i=>(
                <div key={i} className="w-1 h-12 rounded-full opacity-30"
                  style={{background:'rgba(99,102,241,.6)'}}/>
              ))}
            </div>
          </div>

          {/* CASE BODY */}
          <div style={{
            width:100, height:118, position:'relative', margin:'-1px auto 0',
            background:'linear-gradient(160deg,#1c1c1e,#0f0f12)',
            borderRadius:26,
            border:'2.5px solid transparent',
            backgroundClip:'padding-box',
            boxShadow:'0 0 0 2.5px #3a3a4a, inset 0 1px 0 rgba(255,255,255,.1), 0 20px 60px rgba(0,0,0,.8)',
          }}>
            {/* Digital crown */}
            <div style={{
              position:'absolute', right:-7, top:28, width:6, height:24,
              background:'linear-gradient(90deg,#4a4a5a,#6a6a7a,#4a4a5a)',
              borderRadius:3, boxShadow:'2px 0 4px rgba(0,0,0,.5)'
            }}/>
            {/* Action button */}
            <div style={{
              position:'absolute', right:-7, top:62, width:6, height:14,
              background:'linear-gradient(90deg,#3a3a4a,#5a5a6a,#3a3a4a)',
              borderRadius:3
            }}/>

            {/* OLED screen */}
            <div className="absolute inset-1.5 rounded-[20px] overflow-hidden"
              style={{ background:'#000', display:'flex', flexDirection:'column', padding:8, gap:4 }}>

              {/* Glucose row */}
              <div className="flex items-baseline gap-1">
                <span className="font-mono font-black text-[22px] leading-none" style={{color:gColor(glucose)}}>
                  {glucose}
                </span>
                <span className="text-[9px] text-gray-500 font-mono">mg/dL</span>
                <span className="text-[11px] ml-auto font-bold" style={{color:gTrend(glucose,105).color}}>
                  {gTrend(glucose,105).arrow}
                </span>
              </div>

              {/* ECG strip */}
              <div style={{ flex:'none', height:30, position:'relative', overflow:'hidden' }}>
                <svg width="200" height="30" viewBox="0 0 200 30" style={{ position:'absolute', left:0, top:0 }}>
                  <path d={ecgPath} fill="none" stroke={hrColor(hr)} strokeWidth="1.5"
                    strokeDasharray="1200" strokeDashoffset="1200"
                    style={{ animation:`ecg-scan ${ecgPeriod*2}s linear infinite` }}/>
                </svg>
              </div>

              {/* HR + SpO2 tiles */}
              <div className="flex gap-1.5">
                <div className="flex-1 rounded-md px-1.5 py-1" style={{background:'rgba(255,255,255,.05)'}}>
                  <div className="text-[8px] text-gray-500">HR</div>
                  <div className="font-mono font-bold text-[11px]" style={{color:hrColor(hr)}}>{hr} bpm</div>
                </div>
                <div className="flex-1 rounded-md px-1.5 py-1" style={{background:'rgba(255,255,255,.05)'}}>
                  <div className="text-[8px] text-gray-500">SpO₂</div>
                  <div className="font-mono font-bold text-[11px]" style={{color:spo2Color(spo2)}}>{spo2}%</div>
                </div>
              </div>

              {/* Temp + BT row */}
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[9px] text-gray-400 font-mono">{temp}°C</span>
                <Bluetooth size={9} className="text-blue-400"/>
                <span className="text-[9px] text-gray-500 font-mono">92%🔋</span>
              </div>
            </div>
          </div>

          {/* BOTTOM STRAP */}
          <div style={{ width:76, height:96, margin:'-1px auto 0',
                        background:'linear-gradient(90deg,#1a1a2e,#2d2d4e)',
                        borderBottomLeftRadius:12, borderBottomRightRadius:12,
                        transform:'rotateX(55deg)', transformOrigin:'top center',
                        borderLeft:'2px solid rgba(99,102,241,.3)', borderRight:'2px solid rgba(99,102,241,.3)',
                        borderBottom:'2px solid rgba(99,102,241,.3)' }}>
            <div className="flex justify-around mt-2">
              {[0,1,2].map(i=>(
                <div key={i} className="w-1 h-14 rounded-full opacity-30"
                  style={{background:'rgba(99,102,241,.6)'}}/>
              ))}
            </div>
            {/* Charging pins */}
            <div className="flex gap-2 justify-center mt-2">
              {[0,1,2,3].map(i=>(
                <div key={i} className="w-1 h-1 rounded-full bg-gray-600"/>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {['nRF52840','MAX30102','BMI270','DRV2605L'].map(t => (
          <span key={t} className="text-[9px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded font-mono">{t}</span>
        ))}
      </div>
    </div>
  )
}

/* ── iPhone Dexcom mockup ─────────────────────────────────────────── */
function PhoneMockup({ glucose, history, hr, spo2, temp, isAlert }) {
  const W=180, H=60
  const MIN_G=60, MAX_G=280
  const toX = (i, len) => Math.round((i/(len-1))*W)
  const toY = g => Math.round(H - ((g-MIN_G)/(MAX_G-MIN_G))*H)
  const pts = history.map((g,i) => `${toX(i,history.length)},${toY(g)}`).join(' ')
  const currX = toX(history.length-1, history.length)
  const currY = toY(glucose)

  const rangeH = toY(PATIENT.glucoseMin)
  const rangeY = toY(PATIENT.glucoseMax)
  const rangeH2 = rangeH - rangeY

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">MediSimple iOS</p>
      {/* Phone shell */}
      <div style={{
        width:200, minHeight:380, borderRadius:42,
        background:'linear-gradient(160deg,#f0f0f2,#e0e0e4)',
        boxShadow:'0 0 0 1.5px #c0c0c8, 0 25px 60px rgba(0,0,0,.4), inset 0 0 0 1px rgba(255,255,255,.8)',
        padding:10, position:'relative', overflow:'hidden'
      }}>
        {/* Dynamic Island */}
        <div style={{
          width:60, height:16, background:'#000', borderRadius:12,
          margin:'0 auto 8px', position:'relative',
          animation: isAlert ? 'island-live 1s ease-in-out infinite' : 'none'
        }}>
          {isAlert && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center">
              <span className="text-[7px] text-red-400 font-bold">⚠ SPIKE</span>
            </div>
          )}
        </div>

        {/* Screen content */}
        <div style={{ background:'#fff', borderRadius:32, padding:12, minHeight:330 }}>
          {/* Patient bar */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-bold text-gray-800">{PATIENT.name}</p>
              <p className="text-[8px] text-gray-400">Age {PATIENT.age} · Diabetic T2</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-[9px]">👴</span>
            </div>
          </div>

          {/* Big glucose number */}
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-black font-mono" style={{color:gColor(glucose)}}>{glucose}</span>
            <span className="text-[9px] text-gray-400">mg/dL</span>
            <span className="text-sm ml-auto font-bold" style={{color:gTrend(glucose,105).color}}>
              {gTrend(glucose,105).arrow}
            </span>
          </div>

          {/* Dexcom-style chart */}
          <div style={{background:'#f9f9f9', borderRadius:12, padding:'8px 6px', marginBottom:8}}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
              {/* High zone */}
              <rect x="0" y="0" width={W} height={rangeY} fill="rgba(245,158,11,.08)"/>
              {/* Personal normal zone */}
              <rect x="0" y={rangeY} width={W} height={rangeH2} fill="rgba(16,185,129,.1)"/>
              {/* Low zone */}
              <rect x="0" y={rangeH} width={W} height={H-rangeH} fill="rgba(239,68,68,.08)"/>
              {/* Zone labels */}
              <text x="2" y="8" fontSize="7" fill="rgba(245,158,11,.7)">HIGH</text>
              <text x="2" y={rangeY+rangeH2/2+3} fontSize="7" fill="rgba(16,185,129,.7)">YOUR RANGE</text>
              <text x="2" y={H-2} fontSize="7" fill="rgba(239,68,68,.7)">LOW</text>
              {/* Range boundary lines */}
              <line x1="0" y1={rangeY} x2={W} y2={rangeY} stroke="rgba(16,185,129,.4)" strokeWidth="1" strokeDasharray="3,2"/>
              <line x1="0" y1={rangeH} x2={W} y2={rangeH} stroke="rgba(239,68,68,.4)" strokeWidth="1" strokeDasharray="3,2"/>
              {/* Glucose line */}
              {history.length > 1 && (
                <polyline points={pts} fill="none" stroke={gColor(glucose)} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              )}
              {/* Current dot */}
              <circle cx={currX} cy={currY} r="4" fill={gColor(glucose)}/>
              <circle cx={currX} cy={currY} r="7" fill={gColor(glucose)} opacity=".25"
                style={{animation:'island-live 1.5s ease-in-out infinite'}}/>
            </svg>
            <p className="text-[8px] text-gray-400 text-right mt-0.5">Last 3 hrs · Personal baseline</p>
          </div>

          {/* Vitals grid */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {[
              { label:'Heart Rate', val:`${hr} bpm`, color:hrColor(hr), icon:'❤️' },
              { label:'SpO₂',       val:`${spo2}%`,  color:spo2Color(spo2), icon:'🫁' },
              { label:'Skin Temp',  val:`${temp}°C`, color:'#8B5CF6', icon:'🌡️' },
              { label:'Baseline',   val:'88–128',    color:'#10B981', icon:'📊' },
            ].map(v => (
              <div key={v.label} className="rounded-lg p-2"
                style={{background:'#f5f5f7'}}>
                <p className="text-[7px] text-gray-400">{v.icon} {v.label}</p>
                <p className="text-[11px] font-bold font-mono" style={{color:v.color}}>{v.val}</p>
              </div>
            ))}
          </div>

          {/* Alert card or stable card */}
          {isAlert ? (
            <div className="rounded-xl p-2.5" style={{background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)'}}>
              <p className="text-[9px] font-bold text-red-600">⚠ Spike Detected</p>
              <p className="text-[8px] text-red-500 mt-0.5">
                {glucose > 128 ? `${glucose} mg/dL — above your usual ${PATIENT.glucoseMax}` : `${glucose} mg/dL — below your usual ${PATIENT.glucoseMin}`}
              </p>
              <button className="mt-1.5 w-full text-[8px] font-bold text-white bg-red-500 rounded-lg py-1">
                Alert Family →
              </button>
            </div>
          ) : (
            <div className="rounded-xl p-2.5" style={{background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)'}}>
              <p className="text-[9px] font-bold text-emerald-600">✓ All Vitals Normal</p>
              <p className="text-[8px] text-emerald-500 mt-0.5">Within your personal range · No alerts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── BLE Console ──────────────────────────────────────────────────── */
function BLEConsole({ logs, soundEnabled, onToggleSound }) {
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [logs])
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bluetooth size={12} className="text-cyan-400"/>
          <span className="text-xs font-bold text-gray-300">BLE GATT Console</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
        </div>
        <button onClick={onToggleSound}
          className="text-gray-500 hover:text-gray-300 transition-colors">
          {soundEnabled ? <Volume2 size={14}/> : <VolumeX size={14}/>}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto rounded-xl font-mono text-[10px] leading-relaxed p-2 space-y-0.5 min-h-[180px] max-h-[260px]"
        style={{ background:'#0a0a0f', border:'1px solid rgba(255,255,255,.06)' }}>
        {logs.length === 0 && (
          <p className="text-gray-600 italic">Waiting for device…</p>
        )}
        {logs.map(l => (
          <div key={l.id} className="flex gap-2 leading-5">
            <span className="text-gray-600 flex-shrink-0 w-16">{l.time}</span>
            <span className="font-bold flex-shrink-0 w-20" style={{ color: TAG_COLORS[l.tag]||'#9CA3AF' }}>
              [{l.tag}]
            </span>
            <span className="text-gray-300 break-all">{l.msg}</span>
          </div>
        ))}
        <div ref={endRef}/>
      </div>
    </div>
  )
}

/* ── Audio engine ─────────────────────────────────────────────────── */
function beep(freq=880, dur=120, vol=0.3) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = freq; osc.type = 'sine'
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur/1000)
    osc.start(); osc.stop(ctx.currentTime + dur/1000)
    setTimeout(() => ctx.close(), dur+100)
  } catch {}
}

/* ── Main page ────────────────────────────────────────────────────── */
export default function DeviceSimulatorPro() {
  const [glucose,   setGlucose]   = useState(105)
  const [hr,        setHr]        = useState(68)
  const [spo2,      setSpo2]      = useState(98)
  const [temp,      setTemp]      = useState(36.5)
  const [cgmPhase,  setCgmPhase]  = useState('idle')    // idle | nfc | warmup | measuring
  const [scenario,  setScenario]  = useState(null)
  const [soundOn,   setSoundOn]   = useState(true)
  const [logs,      setLogs]      = useState([])
  const [history,   setHistory]   = useState([105,108,102,99,105])
  const logId   = useRef(0)
  const tickRef = useRef(null)

  const isAlert = glucose > PATIENT.glucoseMax || glucose < PATIENT.glucoseMin
                || hr > PATIENT.hrMax || spo2 < PATIENT.spo2Min

  // Inject CSS once
  useEffect(() => {
    const el = document.getElementById('sim-pro-css')
    if (el) return
    const s = document.createElement('style')
    s.id = 'sim-pro-css'; s.textContent = CSS
    document.head.appendChild(s)
    return () => s.remove()
  }, [])

  const addLog = useCallback((tag, msg) => {
    setLogs(prev => [...prev.slice(-80), { id: ++logId.current, time:ts(), tag, msg }])
  }, [])

  // NFC tap sequence
  const handleNfcTap = useCallback(() => {
    if (cgmPhase !== 'idle') return
    setCgmPhase('nfc')
    if (soundOn) beep(1200, 80)
    addLog('NFC-HW', 'NFC 13.56MHz coil — magnetic coupling detected. iOS NFC reader active.')
    addLog('CGM-BLE', 'UUID 0D4E0001 READ — device: SimpleMed CGM v2.1, FW: 1.4.2')
    setTimeout(() => {
      setCgmPhase('warmup')
      addLog('NFC-HW', 'Power transferred. AFE4900 initializing electrochemical cell…')
    }, 1200)
    setTimeout(() => {
      setCgmPhase('measuring')
      if (soundOn) beep(660, 200)
      addLog('CGM-BLE', `NOTIFY UUID 0D4E0002 — Glucose: ${glucose} mg/dL, signal: 98.2%`)
      addLog('AI-ENGINE', `Baseline check: ${glucose} mg/dL in range [${PATIENT.glucoseMin}–${PATIENT.glucoseMax}] ✓`)
      addLog('SUPABASE', `INSERT vital_readings (glucose=${glucose}, source='cgm', ts=now())`)
    }, 3200)
  }, [cgmPhase, glucose, soundOn, addLog])

  // Tick interval while measuring
  useEffect(() => {
    if (cgmPhase !== 'measuring') { clearInterval(tickRef.current); return }
    tickRef.current = setInterval(() => {
      const drift = Math.round((Math.random()-0.5) * 6)
      setGlucose(prev => {
        const next = Math.max(60, Math.min(280, prev+drift))
        setHistory(h => [...h.slice(-18), next])
        addLog('CGM-BLE', `NOTIFY UUID 0D4E0002 — Glucose: ${next} mg/dL ↑`)
        addLog('BAND-BLE', `HR: ${hr} bpm | SpO2: ${spo2}% | Temp: ${temp}°C → BLE 5.0 PHY`)
        addLog('SUPABASE', `INSERT vital_readings (g=${next}, hr=${hr}, spo2=${spo2})`)
        if (next > PATIENT.glucoseMax || next < PATIENT.glucoseMin) {
          addLog('AI-ENGINE', `⚠ SPIKE: ${next} outside personal range [${PATIENT.glucoseMin}–${PATIENT.glucoseMax}]`)
          addLog('ALERT', `WhatsApp → Priya Kumar: "Dad's glucose ${next} mg/dL — above normal"`)
          if (soundOn) { beep(440,150); setTimeout(()=>beep(330,150),200) }
        }
        return next
      })
      addLog('ECG', `nRF52840 BMI270 steps=+3 | DRV2605L haptic ON (30ms)`)
    }, 7000)
    return () => clearInterval(tickRef.current)
  }, [cgmPhase, hr, spo2, temp, soundOn, addLog])

  // Apply scenario
  const applyScenario = useCallback(sc => {
    setScenario(sc.key)
    setGlucose(sc.g); setHr(sc.hr); setSpo2(sc.spo2); setTemp(sc.temp)
    setHistory(prev => [...prev.slice(-15), sc.g])
    addLog('SYSTEM', `Scenario → "${sc.label}" (G:${sc.g} HR:${sc.hr} SpO2:${sc.spo2}%)`)
    if (sc.key === 'spike' || sc.key === 'hypoxia') {
      addLog('AI-ENGINE', `🚨 Spike detected: ${sc.g} mg/dL exceeds baseline max ${PATIENT.glucoseMax}`)
      addLog('ALERT', `Family alert dispatched → Priya Kumar (daughter, UK)`)
      if (soundOn) { beep(440,200); setTimeout(()=>beep(330,200),250); setTimeout(()=>beep(440,200),500) }
    } else if (sc.key === 'tachy') {
      addLog('AI-ENGINE', `🚨 HR ${sc.hr} bpm exceeds personal max (${PATIENT.hrMax} bpm)`)
      addLog('ALERT', `Emergency contact notified — Dr. Sharma via WhatsApp`)
      if (soundOn) beep(880, 300)
    } else {
      if (soundOn) beep(660, 100)
    }
  }, [soundOn, addLog])

  const resetCGM = () => {
    setCgmPhase('idle'); clearInterval(tickRef.current)
    addLog('SYSTEM', 'CGM reset — tape NFC again to restart session')
  }

  return (
    <div className="min-h-screen pb-24 pt-nav"
      style={{ background:'linear-gradient(135deg,#0a0a0f 0%,#0d0d1a 40%,#0f0a1a 100%)' }}>

      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none" style={{zIndex:0}}>
        <div style={{ position:'absolute', width:600, height:600, top:-200, left:-200,
          background:'radial-gradient(circle,rgba(99,102,241,.08),transparent 70%)', borderRadius:'50%' }}/>
        <div style={{ position:'absolute', width:500, height:500, bottom:-150, right:-150,
          background:'radial-gradient(circle,rgba(16,185,129,.06),transparent 70%)', borderRadius:'50%' }}/>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/device-simulator"
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              style={{background:'rgba(255,255,255,.06)'}}>
              <ArrowLeft size={18}/>
            </Link>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">
                MediSimple <span className="text-indigo-400">Pro Simulator</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                <span className="text-xs text-gray-400">BLE 5.0 · GATT · Supabase Realtime</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-300"
              style={{background:'rgba(99,102,241,.15)', border:'1px solid rgba(99,102,241,.25)'}}>
              <Cpu size={10} className="inline mr-1"/>Patient: {PATIENT.name}
            </div>
          </div>
        </div>

        {/* 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT: Devices ───────────────────────────────────── */}
          <div className="space-y-6 flex flex-col items-center lg:items-stretch">
            <div className="rounded-2xl p-5 flex flex-col items-center"
              style={{background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)'}}>
              <CGMPatch phase={cgmPhase} onTap={handleNfcTap} glucose={glucose}/>
              {cgmPhase === 'measuring' && (
                <button onClick={resetCGM}
                  className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors underline">
                  Reset CGM
                </button>
              )}
            </div>

            <div className="rounded-2xl p-5 flex flex-col items-center"
              style={{background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)'}}>
              <WatchBand3D glucose={glucose} hr={hr} spo2={spo2} temp={temp} isAlert={isAlert}/>
            </div>
          </div>

          {/* ── CENTER: Controls ─────────────────────────────────── */}
          <div className="space-y-4">
            {/* Patient card */}
            <div className="rounded-2xl p-4"
              style={{background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)'}}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-lg">👴</div>
                <div>
                  <p className="text-white font-bold text-sm">{PATIENT.name}, {PATIENT.age}</p>
                  <p className="text-gray-400 text-xs">Type 2 Diabetes · Hypertension</p>
                </div>
                {isAlert && (
                  <div className="ml-auto px-2 py-1 rounded-lg text-[10px] font-bold text-red-400"
                    style={{background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)',
                            animation:'glow-red 1.5s ease-in-out infinite'}}>
                    ⚠ ALERT
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label:'Glucose', val:`${glucose} mg/dL`, color:gColor(glucose) },
                  { label:'Heart Rate', val:`${hr} bpm`, color:hrColor(hr) },
                  { label:'SpO₂', val:`${spo2}%`, color:spo2Color(spo2) },
                  { label:'Skin Temp', val:`${temp}°C`, color:'#A78BFA' },
                ].map(v => (
                  <div key={v.label} className="rounded-xl p-2.5"
                    style={{background:'rgba(255,255,255,.04)'}}>
                    <p className="text-gray-500 text-[9px] uppercase tracking-wide">{v.label}</p>
                    <p className="font-mono font-bold text-sm mt-0.5" style={{color:v.color}}>{v.val}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2.5 rounded-xl"
                style={{background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)'}}>
                <p className="text-emerald-400 text-[9px] font-bold uppercase tracking-wide mb-1">Personal AI Baseline</p>
                <p className="text-emerald-300 text-xs">Glucose: {PATIENT.glucoseMin}–{PATIENT.glucoseMax} mg/dL
                  · HR max: {PATIENT.hrMax} bpm · SpO₂ min: {PATIENT.spo2Min}%</p>
                <p className="text-gray-500 text-[9px] mt-0.5">Derived from 18 uploaded lab reports</p>
              </div>
            </div>

            {/* Scenario presets */}
            <div className="rounded-2xl p-4"
              style={{background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)'}}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Zap size={11}/> Clinical Scenarios
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SCENARIOS.map(sc => (
                  <button key={sc.key} onClick={() => applyScenario(sc)}
                    className="rounded-xl p-2.5 text-left transition-all active:scale-95"
                    style={{
                      background: scenario===sc.key ? `${sc.accent}1a` : 'rgba(255,255,255,.04)',
                      border: `1px solid ${scenario===sc.key ? sc.accent+'60' : 'rgba(255,255,255,.06)'}`,
                    }}>
                    <div className="text-base mb-1">{sc.emoji}</div>
                    <p className="text-white text-[10px] font-bold leading-tight">{sc.label}</p>
                    <p className="text-gray-500 text-[9px] mt-0.5 font-mono">
                      G:{sc.g} HR:{sc.hr} O₂:{sc.spo2}%
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="rounded-2xl p-4"
              style={{background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)'}}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Manual Override</p>
              {[
                { label:'Glucose', unit:'mg/dL', val:glucose, set:setGlucose, min:60, max:280, color:gColor(glucose) },
                { label:'Heart Rate', unit:'bpm', val:hr, set:setHr, min:40, max:160, color:hrColor(hr) },
                { label:'SpO₂', unit:'%', val:spo2, set:setSpo2, min:80, max:100, color:spo2Color(spo2) },
                { label:'Skin Temp', unit:'°C', val:temp, set:setTemp, min:35, max:39, color:'#A78BFA', step:0.1 },
              ].map(sl => (
                <div key={sl.label} className="mb-3 last:mb-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400 text-xs">{sl.label}</span>
                    <span className="font-mono text-xs font-bold" style={{color:sl.color}}>
                      {sl.val}{sl.unit}
                    </span>
                  </div>
                  <input type="range" min={sl.min} max={sl.max} step={sl.step||1}
                    value={sl.val}
                    onChange={e => {
                      const v = sl.step ? parseFloat(e.target.value) : parseInt(e.target.value)
                      sl.set(v)
                      if (sl.label==='Glucose') setHistory(h=>[...h.slice(-18),v])
                    }}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor:sl.color,
                             background:`linear-gradient(90deg,${sl.color} ${((sl.val-sl.min)/(sl.max-sl.min))*100}%,rgba(255,255,255,.1) 0)` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: iPhone + Console ──────────────────────────── */}
          <div className="space-y-4">
            <div className="rounded-2xl p-4 flex flex-col items-center"
              style={{background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)'}}>
              <PhoneMockup glucose={glucose} history={history} hr={hr} spo2={spo2} temp={temp} isAlert={isAlert}/>
            </div>
            <div className="rounded-2xl p-4"
              style={{background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)'}}>
              <BLEConsole logs={logs} soundEnabled={soundOn} onToggleSound={()=>setSoundOn(p=>!p)}/>
            </div>
          </div>
        </div>

        {/* Chip legend */}
        <div className="mt-5 rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-center"
          style={{background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)'}}>
          <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mr-2">Chips:</span>
          {Object.entries(TAG_COLORS).map(([tag,col]) => (
            <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{color:col, background:`${col}15`, border:`1px solid ${col}30`}}>
              {tag}
            </span>
          ))}
        </div>
        <div className="h-8"/>
      </div>
    </div>
  )
}
