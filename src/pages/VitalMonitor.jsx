import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Wifi, WifiOff, AlertTriangle, X, Activity, ChevronRight, Check } from 'lucide-react'

// ─── Metric config ──────────────────────────────────────────────────────────
const METRICS = [
  {
    id: 'glucose', label: 'Glucose', unit: 'mg/dL', icon: '🩸',
    normalLow: 70, normalHigh: 140,
    critLow: 54,   critHigh: 180,
    cardiacGoal: '< 140',
    zones: [
      { max: 54,  bg: '#FF3B3018', line: '#FF3B30', label: 'Critical Low'  },
      { max: 70,  bg: '#FF950018', line: '#FF9500', label: 'Low'           },
      { max: 140, bg: '#34C75912', line: '#34C759', label: 'Normal'        },
      { max: 180, bg: '#FF950018', line: '#FF9500', label: 'High'          },
      { max: 9999,bg: '#FF3B3018', line: '#FF3B30', label: 'Very High'     },
    ],
    presets: ['72','92','110','135','155','180','210'],
  },
  {
    id: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: '❤️',
    normalLow: 50, normalHigh: 100,
    critLow: 40,   critHigh: 120,
    cardiacGoal: '50–100',
    zones: [
      { max: 50,  bg: '#007AFF18', line: '#007AFF', label: 'Low'    },
      { max: 100, bg: '#34C75912', line: '#34C759', label: 'Normal' },
      { max: 9999,bg: '#FF3B3018', line: '#FF3B30', label: 'High'   },
    ],
    presets: ['52','62','72','82','92','105','115'],
  },
  {
    id: 'blood_pressure', label: 'BP', unit: 'mmHg', icon: '💉',
    normalLow: 90, normalHigh: 120,
    critLow: 80,   critHigh: 140,
    cardiacGoal: '< 130',
    zones: [
      { max: 90,  bg: '#007AFF18', line: '#007AFF', label: 'Low'    },
      { max: 120, bg: '#34C75912', line: '#34C759', label: 'Normal' },
      { max: 140, bg: '#FF950018', line: '#FF9500', label: 'High'   },
      { max: 9999,bg: '#FF3B3018', line: '#FF3B30', label: 'Crisis' },
    ],
    presets: ['105','112','118','124','132','140','152'],
  },
  {
    id: 'spo2', label: 'SpO₂', unit: '%', icon: '💫',
    normalLow: 95, normalHigh: 100,
    critLow: 88,   critHigh: 100,
    zones: [
      { max: 90,  bg: '#FF3B3018', line: '#FF3B30', label: 'Critical' },
      { max: 95,  bg: '#FF950018', line: '#FF9500', label: 'Low'      },
      { max: 9999,bg: '#34C75912', line: '#34C759', label: 'Normal'   },
    ],
    presets: ['92','94','96','97','98','99','100'],
  },
  {
    id: 'sleep_hours', label: 'Sleep', unit: 'hrs', icon: '💤',
    normalLow: 7, normalHigh: 9,
    critLow: 4,   critHigh: 12,
    zones: [
      { max: 6,   bg: '#FF950018', line: '#FF9500', label: 'Too Short' },
      { max: 9,   bg: '#34C75912', line: '#34C759', label: 'Good'      },
      { max: 9999,bg: '#FF950018', line: '#FF9500', label: 'Too Long'  },
    ],
    presets: ['4.5','5.5','6.5','7','7.5','8','9'],
  },
]

// ─── Demo readings (simulates Dexcom + Fitbit data for a cardiac patient) ───
function makeDemoReadings() {
  const now = Date.now()
  const ago  = h => new Date(now - h * 3_600_000).toISOString()

  const glucose = [
    // overnight stable
    { h:23.5,v:98 },{ h:22,v:95 },{ h:20,v:92 },{ h:18,v:96 },{ h:16,v:100 },
    // breakfast 7 AM spike
    { h:14.5,v:108 },{ h:13.5,v:155 },{ h:13,v:192 },{ h:12.5,v:178 },{ h:12,v:152 },
    { h:11.5,v:138 },{ h:11,v:128 },
    // mid-morning stable
    { h:10,v:122 },{ h:9,v:118 },{ h:8.5,v:115 },
    // lunch 12 PM spike
    { h:7.5,v:135 },{ h:7,v:175 },{ h:6.5,v:218 },{ h:6,v:195 },{ h:5.5,v:162 },
    { h:5,v:148 },{ h:4.5,v:138 },
    // dinner 5 PM moderate
    { h:2,v:142 },{ h:1.5,v:162 },{ h:1,v:148 },{ h:0.5,v:135 },{ h:0.1,v:128 },
  ].map(({h,v}) => ({
    id:'dg'+h, metric_type:'glucose', value:v, unit:'mg/dL',
    source:'dexcom', recorded_at: ago(h)
  }))

  const heart_rate = [
    { h:23,v:58 },{ h:20,v:56 },{ h:16,v:60 },
    { h:14,v:78 },{ h:12,v:82 },{ h:10,v:70 },
    { h:7,v:88 },{ h:5,v:75 },{ h:2,v:72 },{ h:0.1,v:68 },
  ].map(({h,v}) => ({
    id:'dhr'+h, metric_type:'heart_rate', value:v, unit:'bpm',
    source:'fitbit', recorded_at: ago(h)
  }))

  const spo2 = [
    { h:22,v:97 },{ h:14,v:98 },{ h:7,v:96 },{ h:0.1,v:98 },
  ].map(({h,v}) => ({
    id:'dsp'+h, metric_type:'spo2', value:v, unit:'%',
    source:'fitbit', recorded_at: ago(h)
  }))

  const sleep = [
    { h:16,v:6.5,unit:'hrs' },
  ].map(({h,v}) => ({
    id:'dsl'+h, metric_type:'sleep_hours', value:v, unit:'hrs',
    source:'fitbit', recorded_at: ago(h)
  }))

  return { glucose, heart_rate, spo2, sleep_hours: sleep, blood_pressure: [] }
}

const DEMO_READINGS = makeDemoReadings()
const DEMO_BASELINE = {
  glucose:      { mean: 108, low: 88,  high: 128, count: 18 },
  heart_rate:   { mean: 68,  low: 54,  high: 82,  count: 14 },
  blood_pressure:{ mean: 124, low: 108, high: 140, count: 8  },
  spo2:         { mean: 97,  low: 95,  high: 99,  count: 10 },
}

// ─── 24-hour SVG chart ───────────────────────────────────────────────────────
function Timeline({ readings, metric, baseline }) {
  const W=340, H=110, pL=36, pR=8, pT=8, pB=22
  const chartW = W-pL-pR, chartH = H-pT-pB
  const now = Date.now(), start = now - 24*3_600_000

  const inWindow = readings.filter(r => new Date(r.recorded_at).getTime() >= start)
  const sorted   = [...inWindow].sort((a,b)=>new Date(a.recorded_at)-new Date(b.recorded_at))

  const spikeLow  = baseline?.low  ?? metric.normalLow
  const spikeHigh = baseline?.high ?? metric.normalHigh

  if (sorted.length === 0) return (
    <div className="flex items-center justify-center h-28">
      <p className="text-callout text-sys-label3 text-center">No readings yet — tap + to add</p>
    </div>
  )

  const vals  = sorted.map(r=>r.value)
  const minV  = Math.max(0, Math.min(...vals, metric.normalLow-10))
  const maxV  = Math.max(...vals, metric.normalHigh+10)
  const rangeV= maxV - minV || 1

  const toX = ts => pL + ((ts-start)/(24*3_600_000))*chartW
  const toY = v  => pT + ((1-(v-minV)/rangeV))*chartH

  const pts = sorted.map(r=>`${toX(new Date(r.recorded_at).getTime()).toFixed(1)},${toY(r.value).toFixed(1)}`).join(' ')
  const hours = [0,6,12,18,24].map(h=>({ h, x: toX(start+h*3_600_000), label:['12am','6am','12pm','6pm','Now'][h/6] }))

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {/* Normal green zone */}
      <rect x={pL} y={toY(spikeHigh).toFixed(1)}
        width={chartW} height={(toY(spikeLow)-toY(spikeHigh)).toFixed(1)}
        fill="#34C75912" rx="2"/>

      {/* Target lines */}
      {[spikeHigh, spikeLow].map(v=>(
        <line key={v} x1={pL} y1={toY(v).toFixed(1)} x2={W-pR} y2={toY(v).toFixed(1)}
          stroke="#34C759" strokeWidth="0.75" strokeDasharray="4 3" opacity="0.6"/>
      ))}

      {/* Hour grid */}
      {hours.map(m=>(
        <g key={m.h}>
          <line x1={m.x} y1={pT} x2={m.x} y2={H-pB} stroke="#E5E5EA" strokeWidth="1"/>
          <text x={m.x} y={H-6} textAnchor="middle" fontSize="9" fill="#8E8E93">{m.label}</text>
        </g>
      ))}

      {/* Y-axis labels */}
      <text x={pL-4} y={toY(spikeHigh)+3} textAnchor="end" fontSize="9" fill="#34C759">{spikeHigh}</text>
      <text x={pL-4} y={toY(spikeLow)+3}  textAnchor="end" fontSize="9" fill="#34C759">{spikeLow}</text>
      {maxV > spikeHigh+15 && (
        <text x={pL-4} y={pT+10} textAnchor="end" fontSize="9" fill="#FF3B30">{Math.round(maxV)}</text>
      )}

      {/* Data line */}
      {sorted.length>=2 && (
        <polyline points={pts} fill="none" stroke="#007AFF" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"/>
      )}

      {/* Data points — spikes in red */}
      {sorted.map((r,i)=>{
        const x = toX(new Date(r.recorded_at).getTime())
        const y = toY(r.value)
        const spike = r.value > spikeHigh || r.value < spikeLow
        const latest= i===sorted.length-1
        return (
          <g key={r.id||i}>
            {spike && <circle cx={x} cy={y} r="7" fill="#FF3B3020"/>}
            <circle cx={x} cy={y} r={latest?4:2.5}
              fill={spike?'#FF3B30':'#007AFF'} opacity={latest?1:0.75}/>
          </g>
        )
      })}

      {/* "NOW" marker */}
      <line x1={toX(now)} y1={pT} x2={toX(now)} y2={H-pB}
        stroke="#007AFF" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
    </svg>
  )
}

// ─── Status badge ────────────────────────────────────────────────────────────
function statusOf(value, metric) {
  if (value === null || value === undefined) return { label:'—', color:'#8E8E93', bg:'#F2F2F7' }
  if (value > metric.critHigh)  return { label:'Critical High', color:'#FF3B30', bg:'#FFF1F0' }
  if (value > metric.normalHigh)return { label:'High',          color:'#FF9500', bg:'#FFF8F0' }
  if (value < metric.critLow)   return { label:'Critical Low',  color:'#FF3B30', bg:'#FFF1F0' }
  if (value < metric.normalLow) return { label:'Low',           color:'#007AFF', bg:'#EBF4FF' }
  return                               { label:'Normal',        color:'#34C759', bg:'#E8F8ED' }
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function VitalMonitor() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [demo, setDemo]           = useState(false)
  const [readings, setReadings]   = useState({})  // {glucose:[...], heart_rate:[...], ...}
  const [baselines, setBaselines] = useState({})
  const [alerts, setAlerts]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeMetric, setActive] = useState('glucose')
  const [showAdd, setShowAdd]     = useState(false)
  const [addValue, setAddValue]   = useState('')
  const [addValue2, setAddValue2] = useState('')  // BP diastolic
  const [saving, setSaving]       = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const metric = METRICS.find(m=>m.id===activeMetric) || METRICS[0]
  const activeReadings = readings[activeMetric] || []
  const sortedDesc = [...activeReadings].sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at))
  const latest = sortedDesc[0]
  const latestVal = latest ? latest.value : null
  const st = statusOf(latestVal, metric)
  const baseline = baselines[activeMetric]

  // Spikes today (readings above personal baseline)
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const allReadings = Object.values(readings).flat()
  const todaySpikes = allReadings.filter(r=>{
    if (new Date(r.recorded_at) < todayStart) return false
    const m = METRICS.find(x=>x.id===r.metric_type)
    if (!m) return false
    const b = baselines[r.metric_type]
    const hi = b?.high ?? m.normalHigh
    const lo = b?.low  ?? m.normalLow
    return r.value > hi || r.value < lo
  }).sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at))

  useEffect(() => {
    if (!user) {
      setReadings(DEMO_READINGS)
      setBaselines(DEMO_BASELINE)
      setDemo(true)
      setLoading(false)
      setLastUpdate(new Date())
      return
    }
    loadAll()
    // Supabase Realtime — new readings appear instantly on family monitor
    const channel = supabase.channel('vitals-'+user.id)
      .on('postgres_changes',{ event:'INSERT', schema:'public', table:'vital_readings',
        filter:`user_id=eq.${user.id}` }, payload => {
        const r = payload.new
        setReadings(prev=>({ ...prev, [r.metric_type]: [r, ...(prev[r.metric_type]||[])] }))
        setLastUpdate(new Date())
      }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  async function loadAll() {
    setLoading(true)
    const since = new Date(Date.now()-7*24*3_600_000).toISOString() // 7 days
    const [vitalsRes, metricsRes] = await Promise.all([
      supabase.from('vital_readings').select('*').eq('user_id',user.id)
        .gte('recorded_at', since).order('recorded_at', { ascending:false }),
      supabase.from('health_metrics').select('name,value').eq('user_id',user.id)
    ])

    // Group vitals by type
    const grouped = {}
    for (const r of (vitalsRes.data||[])) {
      if (!grouped[r.metric_type]) grouped[r.metric_type]=[]
      grouped[r.metric_type].push(r)
    }
    setReadings(grouped)

    // Calculate personal baselines from historical health_metrics
    const blines = {}
    const hm = metricsRes.data || []
    const metricMap = { 'Blood Sugar':'glucose', 'HbA1c':'glucose', 'Systolic BP':'blood_pressure',
      'Heart Rate':'heart_rate', 'SpO2':'spo2' }
    for (const [hmName, vType] of Object.entries(metricMap)) {
      const vals = hm.filter(h=>h.name===hmName).map(h=>parseFloat(h.value)).filter(v=>!isNaN(v))
      if (vals.length >= 2) {
        const mean = vals.reduce((a,b)=>a+b)/vals.length
        const std  = Math.sqrt(vals.reduce((a,b)=>a+Math.pow(b-mean,2),0)/vals.length)
        blines[vType] = { mean:Math.round(mean), low:Math.round(mean-1.5*std), high:Math.round(mean+1.5*std), count:vals.length }
      }
    }
    setBaselines(blines)
    setLastUpdate(new Date())
    setLoading(false)
  }

  async function addReading() {
    const val = parseFloat(addValue)
    if (isNaN(val)) return
    setSaving(true)
    if (demo) {
      const newR = { id:'u'+Date.now(), metric_type:activeMetric, value:val, unit:metric.unit,
        source:'manual', recorded_at:new Date().toISOString() }
      setReadings(p=>({ ...p, [activeMetric]:[newR,...(p[activeMetric]||[])] }))
      setAddValue(''); setAddValue2(''); setShowAdd(false); setSaving(false)
      setLastUpdate(new Date())
      return
    }
    await supabase.from('vital_readings').insert({
      user_id:user.id, metric_type:activeMetric, value:val,
      value_extra: activeMetric==='blood_pressure' ? parseFloat(addValue2)||null : null,
      unit:metric.unit, source:'manual', recorded_at:new Date().toISOString()
    })
    // Check for spike
    const b = baselines[activeMetric]
    const hi = b?.high ?? metric.normalHigh
    const lo = b?.low  ?? metric.normalLow
    if (val>hi||val<lo) {
      const severity = val>metric.critHigh||val<metric.critLow ? 'critical' : 'warning'
      const dir = val>hi ? 'high' : 'low'
      await supabase.from('health_alerts').insert({
        user_id:user.id, metric_type:activeMetric, value:val, unit:metric.unit,
        severity, message:`${metric.label} ${dir}: ${val} ${metric.unit} (your usual: ${lo}–${hi})`,
        baseline_low:lo, baseline_high:hi,
      })
    }
    await loadAll()
    setAddValue(''); setAddValue2(''); setShowAdd(false); setSaving(false)
  }

  const relTime = lastUpdate
    ? (Date.now()-lastUpdate<60000 ? 'just now' : `${Math.round((Date.now()-lastUpdate)/60000)}m ago`)
    : null

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-sys-bg">
      <div className="loader-dots text-primary"><span/><span/><span/></div>
    </div>
  )

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-title-1 font-bold text-black">Live Monitor</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${demo?'bg-orange-400':'bg-primary'} animate-pulse`}/>
                <p className="text-caption-1 text-sys-label3">
                  {demo ? 'Demo · SimpleMed CGM + SimpleMed Band simulation' : `Live · Updated ${relTime}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/connect-device"
                className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center active:scale-90 transition-transform">
                <Wifi size={17} className="text-primary" />
              </Link>
              <button onClick={()=>setShowAdd(true)}
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-btn active:scale-90 transition-transform">
                <Plus size={20} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Demo banner */}
        {demo && (
          <div className="bg-orange-50 border border-orange-200 rounded-ios-xl px-4 py-3 mb-4">
            <p className="text-subhead text-orange-800 leading-relaxed">
              👁️ <strong>Demo Mode</strong> — Showing Rajesh Kumar's cardiac monitoring data (SimpleMed CGM + SimpleMed Band).{' '}
              <Link to="/auth" className="underline font-semibold">Sign in</Link> to see your real readings.
            </p>
          </div>
        )}

        {/* Today's spike alert banner */}
        {todaySpikes.length > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-ios-xl px-4 py-3.5 mb-4">
            <AlertTriangle size={18} className="text-apple-red flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-callout font-bold text-apple-red">
                {todaySpikes.length} reading{todaySpikes.length>1?'s':''} outside your usual range today
              </p>
              <p className="text-footnote text-apple-red/80 mt-0.5">
                Compared against {profile?.name || 'your'} own personal baseline — worth mentioning to your doctor
              </p>
            </div>
            <Link to="/family-monitor"
              className="text-caption-1 font-semibold text-apple-red bg-red-100 px-2 py-1 rounded-ios flex-shrink-0">
              Alert family
            </Link>
          </div>
        )}

        {/* Quick current values strip */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
          {METRICS.filter(m=>m.id!=='sleep_hours').map(m=>{
            const latest = (readings[m.id]||[]).sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at))[0]
            const val = latest?.value ?? null
            const s = statusOf(val, m)
            return (
              <button key={m.id} onClick={()=>setActive(m.id)}
                className={`flex-shrink-0 rounded-ios-xl px-3.5 py-3 text-center transition-all border-2
                  ${activeMetric===m.id
                    ? 'border-primary bg-primary-light shadow-btn'
                    : 'border-transparent bg-white shadow-card'}`}>
                <p className="text-xl leading-none mb-1">{m.icon}</p>
                <p className="text-[18px] font-bold leading-none" style={{color: val?s.color:'#C7C7CC'}}>
                  {val ?? '—'}
                </p>
                <p className="text-[10px] text-sys-label3 mt-0.5">{m.unit}</p>
              </button>
            )
          })}
        </div>

        {/* Metric tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
          {METRICS.map(m=>(
            <button key={m.id} onClick={()=>setActive(m.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-subhead font-semibold transition-all
                ${activeMetric===m.id
                  ? 'bg-primary text-white shadow-btn'
                  : 'bg-white text-sys-label2 shadow-card'}`}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Current value card */}
        <div className="bg-white rounded-ios-2xl shadow-card-md px-5 py-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-caption-1 font-bold text-sys-label2 uppercase tracking-wide">{metric.label} · Now</p>
              <div className="flex items-end gap-2 mt-1">
                <p className="text-[44px] font-bold leading-none" style={{color:latestVal?st.color:'#C7C7CC'}}>
                  {latestVal ?? '—'}
                </p>
                <p className="text-callout text-sys-label3 mb-2">{metric.unit}</p>
              </div>
              {latestVal && (
                <span className="text-caption-1 font-bold px-2.5 py-1 rounded-full"
                  style={{color:st.color, background:st.bg}}>{st.label}</span>
              )}
            </div>
            <div className="text-right">
              {baseline ? (
                <div className="bg-sys-fill rounded-ios px-3 py-2 text-right">
                  <p className="text-caption-2 text-sys-label3 uppercase tracking-wide">Your baseline</p>
                  <p className="text-subhead font-bold text-black">{baseline.low}–{baseline.high}</p>
                  <p className="text-caption-2 text-sys-label3">{metric.unit} · {baseline.count} readings</p>
                </div>
              ) : (
                <div className="bg-sys-fill rounded-ios px-3 py-2 text-right">
                  <p className="text-caption-2 text-sys-label3">Clinical normal</p>
                  <p className="text-subhead font-bold text-black">{metric.normalLow}–{metric.normalHigh}</p>
                  <p className="text-caption-2 text-sys-label3">{metric.unit}</p>
                </div>
              )}
              {latest && (
                <p className="text-caption-2 text-sys-label3 mt-1">
                  {latest.source === 'dexcom' ? '📡 SimpleMed CGM'
                   : latest.source === 'fitbit' ? '⌚ SimpleMed Band'
                   : latest.source === 'apple_health' ? '🍎 Apple Health'
                   : '✏️ Manual'} ·{' '}
                  {new Date(latest.recorded_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 24-hour chart */}
        <div className="bg-white rounded-ios-xl shadow-card px-4 pt-4 pb-3 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-callout font-bold text-black">24-Hour Trend</p>
            {activeReadings.length > 0 && (
              <p className="text-caption-1 text-sys-label3">{activeReadings.length} readings</p>
            )}
          </div>
          <Timeline readings={activeReadings} metric={metric} baseline={baseline} />
          {baseline && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-sys-sep">
              <div className="w-3 h-3 rounded-full bg-primary-light border border-primary flex-shrink-0"/>
              <p className="text-footnote text-sys-label3 leading-relaxed">
                Green zone = your personal normal ({baseline.low}–{baseline.high} {metric.unit}),
                calculated from {baseline.count} past readings
              </p>
            </div>
          )}
        </div>

        {/* Spike Events Today */}
        {todaySpikes.length > 0 && (
          <>
            <p className="section-header px-0 pt-0 pb-2">Readings Outside Your Usual Range</p>
            <div className="bg-white rounded-ios-xl shadow-card mb-4 overflow-hidden">
              {todaySpikes.slice(0,6).map((r,i)=>{
                const m2 = METRICS.find(x=>x.id===r.metric_type)
                if (!m2) return null
                const b2 = baselines[r.metric_type]
                const hi2 = b2?.high ?? m2.normalHigh
                const lo2 = b2?.low  ?? m2.normalLow
                const isHigh = r.value > hi2
                const time = new Date(r.recorded_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
                return (
                  <div key={r.id||i} className="flex items-center gap-3 px-4 py-3 border-b border-sys-sep last:border-0">
                    <div className="w-9 h-9 rounded-ios bg-red-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-base">{m2.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-callout font-semibold text-black">
                        {m2.label} {isHigh?'High':'Low'}: <span className="text-apple-red">{r.value} {m2.unit}</span>
                      </p>
                      <p className="text-footnote text-sys-label3 mt-0.5">
                        {time} · Your normal: {lo2}–{hi2} {m2.unit} ·{' '}
                        {r.source==='dexcom'?'📡 SimpleMed CGM':r.source==='fitbit'?'⌚ SimpleMed Band':'✏️ Manual'}
                      </p>
                    </div>
                    <AlertTriangle size={15} className="text-apple-red flex-shrink-0" />
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Sleep last night */}
        {(readings['sleep_hours']||[]).length > 0 && (() => {
          const s = readings['sleep_hours'][0]
          const hrs = s.value
          const qual = hrs < 6 ? {label:'Too Short',color:'#FF9500'} : hrs > 9 ? {label:'Too Long',color:'#FF9500'} : {label:'Good',color:'#34C759'}
          return (
            <div className="bg-white rounded-ios-xl shadow-card px-4 py-4 mb-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-ios bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💤</span>
              </div>
              <div className="flex-1">
                <p className="text-callout font-bold text-black">Last night's sleep</p>
                <p className="text-footnote text-sys-label3 mt-0.5">⌚ SimpleMed Band · Sleep quality</p>
              </div>
              <div className="text-right">
                <p className="text-title-3 font-bold" style={{color:qual.color}}>{hrs} hrs</p>
                <p className="text-caption-1 font-semibold" style={{color:qual.color}}>{qual.label}</p>
              </div>
            </div>
          )
        })()}

        {/* Family Monitor CTA */}
        <Link to="/family-monitor"
          className="flex items-center gap-3 bg-primary-light border border-primary/20
                     rounded-ios-xl px-4 py-4 mb-4 active:bg-primary/10 transition-colors">
          <div className="w-10 h-10 rounded-ios bg-primary flex items-center justify-center flex-shrink-0 shadow-btn">
            <span className="text-xl">👨‍👩‍👧</span>
          </div>
          <div className="flex-1">
            <p className="text-callout font-bold text-primary-dark">Family Monitor</p>
            <p className="text-footnote text-primary/70">Let your family watch your vitals remotely</p>
          </div>
          <ChevronRight size={16} className="text-primary" />
        </Link>

        {/* Connect Device CTA */}
        <Link to="/connect-device"
          className="flex items-center gap-3 bg-white rounded-ios-xl shadow-card px-4 py-4 mb-5
                     active:bg-sys-fill transition-colors">
          <div className="w-10 h-10 rounded-ios bg-sys-fill flex items-center justify-center flex-shrink-0">
            <Wifi size={20} className="text-sys-label2" />
          </div>
          <div className="flex-1">
            <p className="text-callout font-bold text-black">Connect a Device</p>
            <p className="text-footnote text-sys-label3">SimpleMed CGM, SimpleMed Band, Apple Health, Garmin</p>
          </div>
          <ChevronRight size={16} className="text-sys-label4" />
        </Link>

        <p className="text-caption-2 text-sys-label3 text-center leading-relaxed px-4 mb-4">
          Readings and baseline notifications are for general wellness awareness only — not for medical
          decisions, medication changes, or emergency detection. Always consult your doctor. In an
          emergency, call 911.
        </p>

        <div className="h-4"/>
      </div>

      {/* Add Reading Sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={()=>setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in"/>
          <div className="relative bg-sys-bg rounded-t-ios-3xl shadow-float max-w-lg mx-auto w-full animate-slide-up"
            onClick={e=>e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-sys-sep rounded-full"/>
            </div>

            {/* Metric selector in sheet */}
            <div className="px-5 pt-3 pb-2 flex items-center justify-between">
              <h2 className="text-title-3 font-bold text-black">Add Reading</h2>
              <button onClick={()=>setShowAdd(false)}
                className="w-8 h-8 rounded-full bg-sys-fill flex items-center justify-center">
                <X size={16} className="text-sys-label2"/>
              </button>
            </div>

            <div className="flex gap-2 px-5 pb-4 overflow-x-auto">
              {METRICS.map(m=>(
                <button key={m.id} onClick={()=>{ setActive(m.id); setAddValue('') }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-subhead font-semibold transition-all
                    ${activeMetric===m.id ? 'bg-primary text-white' : 'bg-white text-sys-label2 shadow-card'}`}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            <div className="px-5 pb-4">
              {/* Quick presets */}
              <p className="text-caption-1 font-semibold text-sys-label2 uppercase tracking-wide mb-2">
                Quick select ({metric.unit})
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {metric.presets.map(p=>(
                  <button key={p} onClick={()=>setAddValue(p)}
                    className={`px-3 py-1.5 rounded-full text-callout font-semibold transition-all
                      ${addValue===p ? 'bg-primary text-white shadow-btn' : 'bg-white text-black shadow-card'}`}>
                    {p}
                  </button>
                ))}
              </div>

              {/* Manual input */}
              <div className="input-group mb-4">
                <div className="input-row">
                  <span className="text-lg">{metric.icon}</span>
                  <input
                    className="flex-1 bg-transparent text-callout text-black placeholder-sys-label3 outline-none"
                    type="number" step="0.1" inputMode="decimal"
                    placeholder={`Enter ${metric.label} in ${metric.unit}`}
                    value={addValue}
                    onChange={e=>setAddValue(e.target.value)}
                    autoFocus
                  />
                  <span className="text-subhead text-sys-label3">{metric.unit}</span>
                </div>
                {activeMetric==='blood_pressure' && (
                  <div className="input-row">
                    <span className="text-lg">💉</span>
                    <input
                      className="flex-1 bg-transparent text-callout text-black placeholder-sys-label3 outline-none"
                      type="number" inputMode="decimal"
                      placeholder="Diastolic (lower number)"
                      value={addValue2}
                      onChange={e=>setAddValue2(e.target.value)}
                    />
                    <span className="text-subhead text-sys-label3">mmHg</span>
                  </div>
                )}
              </div>

              {/* Preview spike check */}
              {addValue && !isNaN(parseFloat(addValue)) && (() => {
                const v = parseFloat(addValue)
                const b = baselines[activeMetric]
                const hi = b?.high ?? metric.normalHigh
                const lo = b?.low  ?? metric.normalLow
                const spike = v>hi||v<lo
                if (!spike) return (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-ios-xl px-3 py-2.5 mb-4">
                    <Check size={15} className="text-green-600 flex-shrink-0"/>
                    <p className="text-subhead text-green-700">Within your personal range ({lo}–{hi} {metric.unit})</p>
                  </div>
                )
                return (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-ios-xl px-3 py-2.5 mb-4">
                    <AlertTriangle size={15} className="text-apple-red flex-shrink-0"/>
                    <p className="text-subhead text-apple-red">
                      Spike alert will be sent · Your usual: {lo}–{hi} {metric.unit}
                    </p>
                  </div>
                )
              })()}

              <button onClick={addReading} disabled={saving||!addValue}
                className="btn-primary w-full py-4 text-headline">
                {saving
                  ? <><div className="loader-dots text-white"><span/><span/><span/></div> Saving…</>
                  : `Save ${metric.label} Reading`}
              </button>
            </div>
            <div className="pb-8"/>
          </div>
        </div>
      )}
    </div>
  )
}
