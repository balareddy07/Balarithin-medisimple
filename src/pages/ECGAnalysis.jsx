import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  Activity, Share2, Download, CheckCircle2,
  AlertTriangle, Users, X, Send, Eye, Heart
} from 'lucide-react'

// ── ECG rhythm classifications ───────────────────────────────────────────────

const RHYTHM_TYPES = [
  { id:'nsr',   label:'Normal Sinus Rhythm',  color:'#22C55E', severity:'normal'  },
  { id:'sr',    label:'Sinus Rhythm',          color:'#22C55E', severity:'normal'  },
  { id:'afib',  label:'Atrial Fibrillation',   color:'#EF4444', severity:'high'    },
  { id:'aflut', label:'Atrial Flutter',        color:'#EF4444', severity:'high'    },
  { id:'paced', label:'Paced Rhythm',          color:'#6366F1', severity:'info'    },
  { id:'junc',  label:'Junctional Rhythm',     color:'#F59E0B', severity:'medium'  },
]

// ── Demo recordings for Rajesh's family ─────────────────────────────────────

const DEMO_RECORDINGS = [
  {
    id:'r1', member:'Rajesh Kumar', relation:'You', date:'2026-07-07 09:14',
    duration:'30s', hr:72, rhythm:'Normal Sinus Rhythm', rhythmId:'nsr', findings:[],
    status:'normal',
    summary:'Heart rhythm is normal. No concerns detected.',
    tip: 'Great reading! Keep taking your medications regularly.',
  },
  {
    id:'r2', member:'Rajesh Kumar', relation:'You', date:'2026-07-06 22:41',
    duration:'30s', hr:89, rhythm:'Atrial Fibrillation', rhythmId:'afib',
    findings:['Irregular heartbeat','Fast rate'],
    status:'abnormal',
    summary:'Irregular heartbeat detected. Your heart was beating fast and out of rhythm.',
    tip: 'Show this recording to your doctor at your next visit. Do not panic — this can be managed.',
  },
  {
    id:'r3', member:'Meena Kumar', relation:'Wife', date:'2026-07-06 08:03',
    duration:'30s', hr:64, rhythm:'Sinus Rhythm', rhythmId:'sr',
    findings:['Slight delay in signal'],
    status:'borderline',
    summary:'Heart rhythm is mostly normal with a small delay in the signal pathway.',
    tip: 'Worth mentioning to her doctor. Not an emergency.',
  },
  {
    id:'r4', member:'Rajesh Kumar', relation:'You', date:'2026-07-05 20:17',
    duration:'30s', hr:48, rhythm:'Slow Heart Rate', rhythmId:'nsr',
    findings:['Very slow heartbeat'],
    status:'abnormal',
    summary:'Heart rate was unusually slow at 48 beats per minute.',
    tip: 'If you felt dizzy or faint during this reading, contact your doctor.',
  },
]

// ── Animated ECG strip ───────────────────────────────────────────────────────

function ECGStrip({ rhythm = 'nsr', hr = 72 }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const mid = H / 2

    const configs = {
      afib:  { p:0,  q:-2, r:18, s:-6, t:5, rr:55, noise:true    },
      aflut: { p:3,  q:-2, r:18, s:-6, t:5, rr:48, sawtooth:true },
      default:{ p:5, q:-3, r:20, s:-8, t:6, rr:Math.round(6000/hr) },
    }
    const wave = configs[rhythm] || configs.default

    const buildBeat = () => {
      const seg = new Array(wave.rr).fill(0)
      for (let i=0;i<6;i++) seg[5+i] = wave.p * Math.sin((i/6)*Math.PI)
      seg[15]=wave.q; seg[16]=wave.r; seg[17]=wave.s
      for (let i=0;i<10;i++) seg[22+i] = wave.t * Math.sin((i/10)*Math.PI)
      return seg
    }

    const beat = buildBeat()
    let offset = 0
    const trace = new Array(W).fill(0)

    const draw = () => {
      ctx.clearRect(0,0,W,H)
      ctx.strokeStyle = 'rgba(34,197,94,0.12)'
      ctx.lineWidth = 0.5
      for (let x=0;x<W;x+=20){ ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke() }
      for (let y=0;y<H;y+=20){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke() }

      let val = beat[offset % beat.length]
      if (wave.noise) val += (Math.random()-0.5)*3
      if (wave.sawtooth) val += (offset%30)/30*5-2.5
      trace.push(val)
      if (trace.length>W) trace.shift()

      ctx.strokeStyle='#22C55E'
      ctx.lineWidth=1.5
      ctx.shadowColor='#22C55E'
      ctx.shadowBlur=4
      ctx.beginPath()
      trace.forEach((v,i)=>{ const y=mid-v*2.5; i===0?ctx.moveTo(i,y):ctx.lineTo(i,y) })
      ctx.stroke()
      ctx.shadowBlur=0
      offset++
      animRef.current=requestAnimationFrame(draw)
    }
    draw()
    return ()=>cancelAnimationFrame(animRef.current)
  }, [rhythm, hr])

  return (
    <canvas ref={canvasRef} width={560} height={100}
      className="w-full rounded-xl bg-gray-950" />
  )
}

// ── Share with family modal ──────────────────────────────────────────────────

function ShareFamilyModal({ recording, onClose }) {
  const [method, setMethod] = useState('whatsapp')
  const [sent, setSent]     = useState(false)

  function handleShare(e) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Share with Family</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
            <X size={14}/>
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600"/>
            </div>
            <p className="font-bold text-gray-900 mb-1">Shared!</p>
            <p className="text-sm text-gray-500 mb-4">Your family can see this ECG reading and the plain-English summary.</p>
            <button onClick={onClose} className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm">Done</button>
          </div>
        ) : (
          <form onSubmit={handleShare} className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Recording</p>
              <p className="text-sm font-medium text-gray-900">{recording.rhythm}</p>
              <p className="text-xs text-gray-500">{recording.date} · {recording.hr} bpm</p>
              <p className="text-xs text-gray-600 mt-1 italic">{recording.summary}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Share via</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id:'whatsapp', label:'WhatsApp', icon:'💬' },
                  { id:'family',   label:'Family App', icon:'👨‍👩‍👧' },
                  { id:'pdf',      label:'PDF',       icon:'📄' },
                ].map(m => (
                  <button key={m.id} type="button" onClick={()=>setMethod(m.id)}
                    className={`py-3 rounded-xl text-sm font-semibold flex flex-col items-center gap-1 border transition-all
                      ${method===m.id ? 'border-primary bg-primary/8 text-primary' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                    <span className="text-lg">{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Your family will see a plain-English explanation — no medical jargon. They can also bring the PDF to your next doctor visit.
            </p>

            <button type="submit"
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              <Send size={15}/> Share Now
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Recording card ────────────────────────────────────────────────────────────

function RecordingCard({ rec, onShare, onView }) {
  const statusStyle = rec.status === 'normal'
    ? { bg:'bg-green-50', text:'text-green-700', border:'border-green-200', label:'Normal' }
    : rec.status === 'abnormal'
    ? { bg:'bg-red-50',   text:'text-red-700',   border:'border-red-200',   label:'Needs attention' }
    : { bg:'bg-yellow-50',text:'text-yellow-700',border:'border-yellow-200',label:'Watch' }

  return (
    <div className={`bg-white rounded-xl border p-4 ${rec.status === 'abnormal' ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-gray-900 text-sm">{rec.rhythm}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
          </div>
          <p className="text-xs text-gray-500">{rec.member} ({rec.relation}) · {rec.date} · {rec.hr} bpm</p>
        </div>
      </div>

      {/* Plain-English summary */}
      <p className="text-sm text-gray-700 mb-1 leading-relaxed">{rec.summary}</p>

      {/* Actionable tip */}
      {rec.status !== 'normal' && (
        <div className={`flex items-start gap-2 rounded-lg px-3 py-2 mb-3 ${statusStyle.bg} border ${statusStyle.border}`}>
          <AlertTriangle size={12} className={`${statusStyle.text} flex-shrink-0 mt-0.5`}/>
          <p className={`text-xs font-medium ${statusStyle.text}`}>{rec.tip}</p>
        </div>
      )}

      {/* Findings in plain English */}
      {rec.findings.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {rec.findings.map(f => (
            <span key={f} className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600">{f}</span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => onView(rec)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          <Eye size={12}/> View ECG
        </button>
        <button onClick={() => onShare(rec)}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/8 hover:bg-primary/15 transition-colors">
          <Users size={12}/> Share with Family
        </button>
        <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors ml-auto">
          <Download size={12}/> PDF
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ECGAnalysis() {
  const [activeTab,  setActiveTab]  = useState('live')
  const [liveRhythm, setLiveRhythm]= useState('nsr')
  const [liveHR,     setLiveHR]    = useState(72)
  const [recording,  setRecording] = useState(false)
  const [recSecs,    setRecSecs]   = useState(0)
  const [shareRec,   setShareRec]  = useState(null)
  const [viewRec,    setViewRec]   = useState(null)
  const recTimer = useRef(null)

  useEffect(() => {
    const iv = setInterval(() => {
      setLiveHR(h => Math.min(120, Math.max(48, h + Math.round((Math.random()-0.48)*2))))
    }, 2000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (recording) {
      recTimer.current = setInterval(() => setRecSecs(s => s+1), 1000)
    } else {
      clearInterval(recTimer.current)
      if (!recording) setRecSecs(0)
    }
    return () => clearInterval(recTimer.current)
  }, [recording])

  const currentRhythm = RHYTHM_TYPES.find(r => r.id === liveRhythm) || RHYTHM_TYPES[0]

  const tabs = [
    { id:'live',    label:'Live ECG'   },
    { id:'history', label:'My History' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
            <Activity size={24} className="text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ECG Analysis</h1>
            <p className="text-sm text-gray-500">SimpleMed Band · Heart rhythm tracking for you and your family</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
            <span className="text-xs font-bold text-green-700">Band Live</span>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
          <Heart size={16} className="text-blue-600 flex-shrink-0 mt-0.5"/>
          <p className="text-sm text-blue-800">
            Your SimpleMed Band checks your heart rhythm automatically. All readings are saved and explained in plain English — no medical knowledge needed.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all
                ${activeTab===t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Live ECG ── */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Try different rhythms (Demo)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {RHYTHM_TYPES.map(r => (
                  <button key={r.id} onClick={() => setLiveRhythm(r.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left
                      ${liveRhythm===r.id
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'}`}>
                    {r.label}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <ECGStrip rhythm={liveRhythm} hr={liveHR}/>
              </div>

              <div className="flex gap-3 mb-4">
                <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{liveHR}</p>
                  <p className="text-xs text-gray-500">bpm</p>
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-sm font-bold leading-tight" style={{color:currentRhythm.color}}>{currentRhythm.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Rhythm</p>
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{recSecs}</p>
                  <p className="text-xs text-gray-500">seconds</p>
                </div>
              </div>

              <button onClick={() => setRecording(r => !r)}
                className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                  ${recording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-primary hover:bg-primary-dark text-white'}`}>
                {recording
                  ? <><div className="w-3 h-3 bg-white rounded-sm"/> Stop Recording ({recSecs}s)</>
                  : <><div className="w-3 h-3 bg-white rounded-full"/> Start 30s Recording</>
                }
              </button>

              {liveRhythm !== 'nsr' && liveRhythm !== 'sr' && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-600 flex-shrink-0 mt-0.5"/>
                  <p className="text-xs text-red-700">
                    <strong>{currentRhythm.label}</strong> detected. Your band has saved this reading. Share it with your family or bring it to your doctor.
                  </p>
                </div>
              )}
            </div>

            {/* What the band detects — patient friendly */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What SimpleMed Band monitors</p>
              <div className="space-y-2.5">
                {[
                  { icon:'💓', label:'Normal heartbeat', desc:'Green — nothing to worry about' },
                  { icon:'⚡', label:'Irregular heartbeat (AFib)', desc:'Can increase stroke risk — worth checking with your doctor' },
                  { icon:'🐢', label:'Slow heart rate', desc:'Below 50 bpm may cause dizziness — noted and saved' },
                  { icon:'🏃', label:'Fast heart rate', desc:'Above 100 bpm at rest is flagged automatically' },
                  { icon:'📉', label:'Signal delays & blocks', desc:'Electrical pathway issues — saved for your doctor to review' },
                  { icon:'🔴', label:'Unusual patterns', desc:'Anything outside your personal baseline is saved so you can discuss it with your doctor' },
                ].map(({icon,label,desc}) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── My History ── */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 px-1">{DEMO_RECORDINGS.length} recordings · Saved automatically from your band</p>
            {DEMO_RECORDINGS.map(rec => (
              <RecordingCard key={rec.id} rec={rec}
                onShare={r => setShareRec(r)}
                onView={r => setViewRec(r)}
              />
            ))}
          </div>
        )}

        {/* Pro Intelligence card */}
        <div className="mt-6 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={18} className="text-indigo-200"/>
            <p className="font-bold text-sm">Pro Intelligence — always watching</p>
            <span className="ml-auto text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">24/7</span>
          </div>
          <p className="text-white/80 text-sm mb-3">Your SimpleMed Band tracks your heart rhythm in the background — day and night — and compares every reading against your own personal baseline.</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              'Irregular rhythm notification','Low heart rate alert','High heart rate alert','Personal baseline',
              'Rhythm history','Sleep heart rate','Recording library','7-day trend',
            ].map(f => (
              <div key={f} className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-indigo-300 flex-shrink-0"/>
                <span className="text-xs text-white/90">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-gray-400 text-center leading-relaxed mt-6 px-4">
          ECG features are for general wellness and informational purposes only. They do not diagnose any
          condition and are not a substitute for professional medical care. If you feel unwell, contact
          your doctor — or call 911 in an emergency.
        </p>

        <div className="h-8"/>
      </div>

      {/* Share with Family modal */}
      {shareRec && <ShareFamilyModal recording={shareRec} onClose={() => setShareRec(null)}/>}

      {/* View ECG detail modal */}
      {viewRec && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4" onClick={() => setViewRec(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">{viewRec.rhythm}</h3>
                <p className="text-xs text-gray-500">{viewRec.member} · {viewRec.date}</p>
              </div>
              <button onClick={() => setViewRec(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X size={14}/>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <ECGStrip rhythm={viewRec.rhythmId} hr={viewRec.hr}/>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {label:'Heart Rate', value:`${viewRec.hr} bpm`},
                  {label:'Duration',   value:viewRec.duration},
                  {label:'Date',       value:viewRec.date.split(' ')[0]},
                ].map(({label,value}) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">What this means</p>
                <p className="text-sm text-gray-800">{viewRec.summary}</p>
              </div>
              {viewRec.status !== 'normal' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-800">{viewRec.tip}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setShareRec(viewRec); setViewRec(null) }}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                  <Users size={14}/> Share with Family
                </button>
                <button className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                  <Download size={14}/> Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
