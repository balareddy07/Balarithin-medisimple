import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { generateShareToken } from '../lib/encryption'
import { Search, Share2, Copy, Check, ChevronRight, TrendingUp, TrendingDown, Minus, X } from 'lucide-react'

// Cardiac patient management goals
const CARDIAC_GOALS = [
  { metric: 'HbA1c',         target: '< 6.0',  targetVal: 6.0,  unit: '%',    icon: '🩸', label: 'Blood Sugar Control',  higher_is_worse: true  },
  { metric: 'LDL',           target: '< 60',   targetVal: 60,   unit: 'mg/dL',icon: '❤️', label: 'LDL Cholesterol',      higher_is_worse: true  },
  { metric: 'Triglycerides', target: '< 150',  targetVal: 150,  unit: 'mg/dL',icon: '🫀', label: 'Triglycerides',         higher_is_worse: true  },
  { metric: 'Systolic BP',   target: '< 130',  targetVal: 130,  unit: 'mmHg', icon: '💉', label: 'Blood Pressure',        higher_is_worse: true  },
  { metric: 'BMI',           target: '< 25',   targetVal: 25,   unit: 'kg/m²',icon: '⚖️', label: 'Body Weight (BMI)',     higher_is_worse: true  },
]

// Normal ranges for status colours
const METRIC_BOUNDS = {
  'HbA1c':         { low: 4.0,  high: 5.7,  critHigh: 9.0  },
  'LDL':           { low: 0,    high: 100,  critHigh: 160  },
  'HDL':           { low: 40,   high: 999,  critHigh: 999, lower_ok: true },
  'Triglycerides': { low: 0,    high: 150,  critHigh: 500  },
  'Blood Sugar':   { low: 70,   high: 99,   critHigh: 300  },
  'Systolic BP':   { low: 90,   high: 120,  critHigh: 180  },
  'BMI':           { low: 18.5, high: 24.9, critHigh: 40   },
  'Creatinine':    { low: 0.7,  high: 1.2,  critHigh: 5.0  },
  'Hemoglobin':    { low: 12,   high: 17,   critHigh: 999  },
  'TSH':           { low: 0.4,  high: 4.0,  critHigh: 10   },
  'Vitamin D':     { low: 30,   high: 100,  critHigh: 999, lower_ok: true },
}

function statusColor(status) {
  if (status === 'critical') return { text: '#FF3B30', bg: '#FFF1F0', label: 'Critical' }
  if (status === 'high')     return { text: '#FF9500', bg: '#FFF8F0', label: 'High'     }
  if (status === 'low')      return { text: '#007AFF', bg: '#EBF4FF', label: 'Low'      }
  return                            { text: '#34C759', bg: '#E8F8ED', label: 'Normal'   }
}

function Trend({ values }) {
  if (!values || values.length < 2) return <Minus size={14} className="text-sys-label3" />
  const a = parseFloat(values[values.length - 2]) || 0
  const b = parseFloat(values[values.length - 1]) || 0
  if (b > a + 0.5) return <TrendingUp  size={14} className="text-apple-red" />
  if (b < a - 0.5) return <TrendingDown size={14} className="text-green-500" />
  return <Minus size={14} className="text-sys-label3" />
}

function Sparkline({ values, status }) {
  if (!values || values.length < 2) return null
  const w = 80, h = 28, pad = 4
  const nums = values.map(v => parseFloat(v) || 0)
  const min = Math.min(...nums), max = Math.max(...nums)
  const range = max - min || 1
  const pts = nums.map((n, i) => {
    const x = pad + (i / (nums.length - 1)) * (w - pad * 2)
    const y = pad + ((1 - (n - min) / range) * (h - pad * 2))
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const clr = status === 'normal' ? '#34C759' : status === 'critical' ? '#FF3B30' : '#FF9500'
  const last = nums[nums.length - 1]
  const lx = (pad + ((nums.length - 1) / (nums.length - 1)) * (w - pad * 2)).toFixed(1)
  const ly = (pad + ((1 - (last - min) / range) * (h - pad * 2))).toFixed(1)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={clr} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={lx} cy={ly} r="3" fill={clr} />
    </svg>
  )
}

function GoalRow({ goal, latestValue }) {
  if (!latestValue) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-sys-sep last:border-0">
        <span className="text-xl w-7 text-center">{goal.icon}</span>
        <div className="flex-1">
          <p className="text-callout font-semibold text-black">{goal.label}</p>
          <p className="text-footnote text-sys-label3">Target: {goal.target} {goal.unit}</p>
        </div>
        <span className="text-caption-1 text-sys-label3 font-medium px-2 py-0.5 bg-sys-fill rounded-full">No data</span>
      </div>
    )
  }
  const val = parseFloat(latestValue) || 0
  const onTarget = val < goal.targetVal
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-sys-sep last:border-0">
      <span className="text-xl w-7 text-center">{goal.icon}</span>
      <div className="flex-1">
        <p className="text-callout font-semibold text-black">{goal.label}</p>
        <p className="text-footnote text-sys-label3">Target: {goal.target} {goal.unit}</p>
      </div>
      <div className="text-right">
        <p className="text-callout font-bold" style={{ color: onTarget ? '#34C759' : '#FF3B30' }}>
          {latestValue} {goal.unit}
        </p>
        <p className="text-caption-2 font-semibold" style={{ color: onTarget ? '#34C759' : '#FF3B30' }}>
          {onTarget ? '✅ On target' : '🔴 Off target'}
        </p>
      </div>
    </div>
  )
}

const SEARCH_HINTS = [
  'HbA1c', 'LDL cholesterol', 'medications', 'blood pressure', 'stent', 'last blood test', 'triglycerides'
]

// Demo cardiac patient data — shown when not logged in
const DEMO_METRICS = [
  { id:'d1', name:'HbA1c',         value:'7.2', unit:'%',     status:'high',   normal_range:'4.0–5.6%',   recorded_date:'2026-05-10' },
  { id:'d2', name:'LDL',           value:'89',  unit:'mg/dL', status:'high',   normal_range:'<100 mg/dL', recorded_date:'2026-05-10' },
  { id:'d3', name:'HDL',           value:'44',  unit:'mg/dL', status:'normal', normal_range:'>40 mg/dL',  recorded_date:'2026-05-10' },
  { id:'d4', name:'Triglycerides', value:'148', unit:'mg/dL', status:'normal', normal_range:'<150 mg/dL', recorded_date:'2026-05-10' },
  { id:'d5', name:'Systolic BP',   value:'136', unit:'mmHg',  status:'high',   normal_range:'<120 mmHg',  recorded_date:'2026-05-10' },
  { id:'d6', name:'Creatinine',    value:'1.1', unit:'mg/dL', status:'normal', normal_range:'0.7–1.2',    recorded_date:'2026-05-10' },
  { id:'d7', name:'Hemoglobin',    value:'13.8',unit:'g/dL',  status:'normal', normal_range:'13.5–17.5',  recorded_date:'2026-05-10' },
  // older readings for sparklines
  { id:'d8', name:'HbA1c',         value:'7.6', unit:'%',     status:'high',   normal_range:'4.0–5.6%',   recorded_date:'2026-02-01' },
  { id:'d9', name:'HbA1c',         value:'7.4', unit:'%',     status:'high',   normal_range:'4.0–5.6%',   recorded_date:'2026-03-15' },
  { id:'d10',name:'LDL',           value:'102', unit:'mg/dL', status:'high',   normal_range:'<100 mg/dL', recorded_date:'2026-02-01' },
  { id:'d11',name:'LDL',           value:'95',  unit:'mg/dL', status:'normal', normal_range:'<100 mg/dL', recorded_date:'2026-03-15' },
]
const DEMO_MEDS = [
  { id:'m1', name:'Aspirin 75mg',         dose:'75mg',   frequency:'Once daily',    status:'active', doctor_name:'Sharma' },
  { id:'m2', name:'Atorvastatin 40mg',    dose:'40mg',   frequency:'Bedtime',       status:'active', doctor_name:'Sharma' },
  { id:'m3', name:'Metformin 500mg',      dose:'500mg',  frequency:'Twice daily',   status:'active', doctor_name:'Sharma' },
  { id:'m4', name:'Ramipril 5mg',         dose:'5mg',    frequency:'Once daily',    status:'active', doctor_name:'Sharma' },
  { id:'m5', name:'Clopidogrel 75mg',     dose:'75mg',   frequency:'Once daily',    status:'active', doctor_name:'Sharma' },
]
const DEMO_CARDIAC = [
  { id:'c1', artery:'LAD',  finding_text:'70% stenosis at proximal LAD. Drug-eluting stent placed.',              has_stent: true,  recorded_date:'2025-11-20' },
  { id:'c2', artery:'RCA',  finding_text:'40% stenosis at mid-RCA. Medically managed, no intervention required.', has_stent: false, recorded_date:'2025-11-20' },
  { id:'c3', artery:'LCX',  finding_text:'Minimal disease, <30% stenosis.',                                        has_stent: false, recorded_date:'2025-11-20' },
]

export default function HealthPassport() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [demo, setDemo]             = useState(false)
  const [metrics, setMetrics]       = useState([])
  const [meds, setMeds]             = useState([])
  const [cardiac, setCardiac]       = useState([])
  const [reportCount, setReportCount] = useState(0)
  const [loading, setLoading]       = useState(true)

  const [search, setSearch]         = useState('')
  const [searchResults, setSearchResults] = useState(null)

  const [sharing, setSharing]       = useState(false)
  const [shareLink, setShareLink]   = useState('')
  const [copied, setCopied]         = useState(false)

  // Live demo: animated health score counter
  const [displayScore, setDisplayScore] = useState(0)
  // Live demo: typewriter search simulation
  const [demoTyping, setDemoTyping] = useState(false)

  // Refs so the demo loop always sees current data (avoids stale closure)
  const metricSummaryRef = useRef([])
  const medsRef = useRef([])
  const cardiacRef2 = useRef([])

  // --- Derived values (must come before useEffects that reference them) ---

  // Group metrics by name → latest value + history
  const metricsByName = {}
  for (const m of metrics) {
    if (!metricsByName[m.name]) metricsByName[m.name] = []
    metricsByName[m.name].push(m)
  }
  const metricSummary = Object.entries(metricsByName).map(([name, rows]) => {
    const sorted = [...rows].sort((a, b) => new Date(a.recorded_date) - new Date(b.recorded_date)).slice(-5)
    const latest = rows[0]
    return { name, latest, history: sorted.map(r => r.value), status: latest.status, unit: latest.unit }
  })
  const normalCount = metricSummary.filter(m => m.status === 'normal').length
  const healthScore = metricSummary.length > 0
    ? Math.round((normalCount / metricSummary.length) * 100)
    : null

  // Keep refs current so demo loop always reads latest data
  metricSummaryRef.current = metricSummary
  medsRef.current = meds
  cardiacRef2.current = cardiac

  // --- Effects ---

  useEffect(() => {
    if (!user) {
      setMetrics(DEMO_METRICS)
      setMeds(DEMO_MEDS)
      setCardiac(DEMO_CARDIAC)
      setReportCount(3)
      setDemo(true)
      setLoading(false)
      return
    }
    loadAll()
  }, [user])

  // Count-up animation for health score
  useEffect(() => {
    if (!healthScore) return
    setDisplayScore(0)
    let current = 0
    const target = healthScore
    const step = Math.ceil(target / 40)
    const t = setInterval(() => {
      current = Math.min(current + step, target)
      setDisplayScore(current)
      if (current >= target) clearInterval(t)
    }, 30)
    return () => clearInterval(t)
  }, [healthScore])

  // Live demo: auto-type doctor questions in search bar
  const DEMO_QUESTIONS = [
    { q: 'HbA1c', pause: 2800 },
    { q: 'stent', pause: 2800 },
    { q: 'medications', pause: 2800 },
    { q: 'blood pressure', pause: 2800 },
  ]
  useEffect(() => {
    if (!demo) return
    let cancelled = false
    async function runDemo() {
      await new Promise(r => setTimeout(r, 3500))
      while (!cancelled) {
        for (const { q, pause } of DEMO_QUESTIONS) {
          if (cancelled) break
          setDemoTyping(true)
          for (let i = 1; i <= q.length; i++) {
            if (cancelled) break
            const partial = q.slice(0, i)
            setSearch(partial)
            doSearchImmediate(partial)
            await new Promise(r => setTimeout(r, 80))
          }
          setDemoTyping(false)
          await new Promise(r => setTimeout(r, pause))
          for (let i = q.length; i >= 0; i--) {
            if (cancelled) break
            const partial = q.slice(0, i)
            setSearch(partial)
            if (partial.length === 0) setSearchResults(null)
            else doSearchImmediate(partial)
            await new Promise(r => setTimeout(r, 40))
          }
          await new Promise(r => setTimeout(r, 600))
        }
      }
    }
    runDemo()
    return () => { cancelled = true }
  }, [demo])

  async function loadAll() {
    setLoading(true)
    const [metricsRes, medsRes, cardiacRes, countRes] = await Promise.all([
      supabase.from('health_metrics').select('*').eq('user_id', user.id).order('recorded_date', { ascending: false }),
      supabase.from('medications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('cardiac_records').select('*').eq('user_id', user.id).order('recorded_date', { ascending: false }),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    setMetrics(metricsRes.data || [])
    setMeds(medsRes.data || [])
    setCardiac(cardiacRes.data || [])
    setReportCount(countRes.count || 0)
    setLoading(false)
  }

  // Latest value per cardiac goal
  const goalValues = {}
  for (const goal of CARDIAC_GOALS) {
    const rows = metricsByName[goal.metric]
    if (rows && rows.length > 0) goalValues[goal.metric] = rows[0].value
  }

  const activeMeds = meds.filter(m => m.status === 'active')

  // Doctor search — reads from refs so demo loop always sees current data
  function doSearchImmediate(q) {
    if (!q.trim()) { setSearchResults(null); return }
    const lq = q.toLowerCase()
    const foundMetrics = metricSummaryRef.current.filter(m =>
      m.name.toLowerCase().includes(lq) ||
      m.latest.value.includes(lq)
    )
    const foundMeds = medsRef.current.filter(m =>
      m.name.toLowerCase().includes(lq) ||
      (m.dose || '').toLowerCase().includes(lq)
    )
    const foundCardiac = cardiacRef2.current.filter(c =>
      (c.finding_text || '').toLowerCase().includes(lq) ||
      (c.artery || '').toLowerCase().includes(lq)
    )
    setSearchResults({ metrics: foundMetrics, meds: foundMeds, cardiac: foundCardiac })
  }

  function doSearch(q) {
    setSearch(q)
    doSearchImmediate(q)
  }

  async function generateFullShare() {
    setSharing(true)
    const token = generateShareToken()
    const expiresAt = new Date(Date.now() + 48 * 3_600_000).toISOString()
    const { error } = await supabase.from('full_record_shares').insert({
      user_id: user.id, encrypted_token: token, expires_at: expiresAt,
    })
    if (!error) setShareLink(`${window.location.origin}/share/full/${token}`)
    setSharing(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const scoreColor = healthScore === null ? '#8E8E93'
    : healthScore >= 80 ? '#34C759'
    : healthScore >= 60 ? '#FF9500'
    : '#FF3B30'

  const shownScore = demo ? displayScore : healthScore

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-sys-bg">
      <div className="loader-dots text-primary"><span/><span/><span/></div>
    </div>
  )

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Demo banner */}
        {demo && (
          <div className="mt-5 mb-0 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-ios-xl px-4 py-3 animate-fade-in">
            <span className="text-2xl flex-shrink-0">👁️</span>
            <div className="flex-1">
              <p className="text-subhead font-bold text-orange-800">Demo Mode — Cardiac Patient</p>
              <p className="text-caption-1 text-orange-700 mt-0.5">Viewing sample data. <Link to="/auth" className="underline font-semibold">Sign in</Link> to see your real health record.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-title-1 font-bold text-black">Health Passport</h1>
              <p className="text-callout text-sys-label3 mt-0.5">{demo ? 'Rajesh Kumar (Demo)' : (profile?.name || 'Your')} complete health record</p>
            </div>
            {!shareLink ? (
              <button
                onClick={demo ? () => navigate('/auth') : generateFullShare}
                disabled={sharing}
                className="flex items-center gap-1.5 bg-primary text-white text-subhead font-semibold
                           px-3.5 py-2 rounded-ios shadow-btn active:scale-95 transition-transform"
              >
                <Share2 size={15} />
                {sharing ? 'Sharing…' : 'Share'}
              </button>
            ) : (
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 bg-primary-light border border-primary/20 text-primary
                           text-subhead font-semibold px-3.5 py-2 rounded-ios active:scale-95 transition-transform"
              >
                {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Link</>}
              </button>
            )}
          </div>

          {shareLink && (
            <div className="mt-3 bg-primary-light border border-primary/20 rounded-ios-xl px-4 py-3 animate-slide-up">
              <p className="text-caption-1 font-semibold text-primary mb-1">Doctor Link (expires 48 hours)</p>
              <p className="text-caption-1 text-sys-label3 font-mono break-all leading-relaxed">{shareLink}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={copyLink} className="text-caption-1 font-semibold text-primary">
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <span className="text-sys-sep">·</span>
                <button
                  onClick={() => {
                    const text = encodeURIComponent(`Hello Doctor,\n\nHere is my complete health record:\n\n${shareLink}\n\nValid for 48 hours.\n— ${profile?.name || 'Patient'}`)
                    window.open(`https://wa.me/?text=${text}`, '_blank')
                  }}
                  className="text-caption-1 font-semibold text-[#25D366]"
                >
                  WhatsApp
                </button>
                <span className="text-sys-sep">·</span>
                <button onClick={() => setShareLink('')} className="text-caption-1 text-sys-label3">Dismiss</button>
              </div>
            </div>
          )}
        </div>

        {/* Health Score */}
        <div className="bg-white rounded-ios-2xl shadow-card-md px-5 py-5 mb-5">
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#F2F2F7" strokeWidth="8" />
                <circle cx="40" cy="40" r="34" fill="none" stroke={scoreColor} strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - (shownScore || 0) / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.06s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[20px] font-bold leading-none" style={{ color: scoreColor }}>
                  {shownScore ?? '—'}
                </span>
                {healthScore !== null && <span className="text-[9px] text-sys-label3 font-medium">/ 100</span>}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-headline font-bold text-black">
                {healthScore === null ? 'Upload a report to start'
                  : healthScore >= 80 ? 'Great health profile'
                  : healthScore >= 60 ? 'Some areas need attention'
                  : 'Action needed'}
              </p>
              <p className="text-footnote text-sys-label3 mt-1 leading-relaxed">
                {metricSummary.length} metrics tracked · {reportCount} reports · {activeMeds.length} medications
              </p>
              {reportCount === 0 && (
                <Link to="/upload" className="inline-flex items-center gap-1 text-primary text-subhead font-semibold mt-2">
                  Upload first report →
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Doctor Search */}
        {demo && (
          <p className="text-caption-1 text-sys-label3 mb-1.5 text-center animate-pulse">
            🤖 Live demo — watch the doctor ask questions in real time
          </p>
        )}
        <div className={`relative mb-5 ${demo && search ? 'ring-2 ring-primary/30 rounded-ios-xl' : ''}`}>
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sys-label3 pointer-events-none" />
          <input
            className="w-full bg-white rounded-ios-xl shadow-card pl-10 pr-10 py-3.5
                       text-callout text-black placeholder-sys-label3 outline-none
                       focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Doctor asks: 'What is your HbA1c?' — search here"
            value={search}
            readOnly={demo}
            onChange={e => !demo && doSearch(e.target.value)}
          />
          {demoTyping && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary animate-pulse rounded-full" />
          )}
          {search && !demo && (
            <button onClick={() => { setSearch(''); setSearchResults(null) }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X size={15} className="text-sys-label3" />
            </button>
          )}
        </div>

        {/* Search hint chips */}
        {!search && (
          <div className="flex flex-wrap gap-2 mb-5">
            {SEARCH_HINTS.map(h => (
              <button key={h} onClick={() => doSearch(h)}
                className="px-3 py-1.5 bg-white rounded-full shadow-card text-caption-1 font-medium text-sys-label2
                           active:bg-primary-light active:text-primary transition-colors">
                {h}
              </button>
            ))}
          </div>
        )}

        {/* Search Results */}
        {searchResults && (
          <div className="mb-5 space-y-3 animate-fade-in">
            {searchResults.metrics.length === 0 && searchResults.meds.length === 0 && searchResults.cardiac.length === 0 ? (
              <div className="bg-white rounded-ios-xl shadow-card px-4 py-5 text-center">
                <p className="text-callout text-sys-label3">No results for "{search}"</p>
              </div>
            ) : (
              <>
                {searchResults.metrics.map(m => {
                  const sc = statusColor(m.status)
                  return (
                    <div key={m.name} className="bg-white rounded-ios-xl shadow-card px-4 py-4">
                      <div className="flex items-center justify-between">
                        <p className="text-headline font-bold text-black">{m.name}</p>
                        <span className="text-caption-1 font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: sc.text, background: sc.bg }}>{sc.label}</span>
                      </div>
                      <p className="text-title-2 font-bold mt-1" style={{ color: sc.text }}>
                        {m.latest.value} <span className="text-subhead text-sys-label3 font-normal">{m.unit}</span>
                      </p>
                      {m.latest.normal_range && (
                        <p className="text-footnote text-sys-label3 mt-0.5">Normal: {m.latest.normal_range}</p>
                      )}
                    </div>
                  )
                })}
                {searchResults.meds.map(m => (
                  <div key={m.id} className="bg-white rounded-ios-xl shadow-card px-4 py-4">
                    <p className="text-headline font-bold text-black">💊 {m.name}</p>
                    <p className="text-callout text-sys-label3 mt-0.5">{m.dose} · {m.frequency}</p>
                    <span className={`text-caption-1 font-semibold px-2 py-0.5 rounded-full mt-2 inline-block
                      ${m.status === 'active' ? 'text-green-700 bg-green-50' : 'text-sys-label3 bg-sys-fill'}`}>
                      {m.status === 'active' ? 'Current' : 'Stopped'}
                    </span>
                  </div>
                ))}
                {searchResults.cardiac.map(c => (
                  <div key={c.id} className="bg-white rounded-ios-xl shadow-card px-4 py-4">
                    <p className="text-headline font-bold text-black">
                      ❤️ {c.artery ? `${c.artery}:` : 'Cardiac:'} {c.finding_text}
                    </p>
                    {c.has_stent && <span className="text-caption-1 font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full mt-2 inline-block">Stent placed</span>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Cardiac Goals */}
        {(Object.keys(goalValues).length > 0 || metrics.length > 0) && (
          <>
            <p className="section-header px-0 pt-0 pb-2">Cardiac Management Goals</p>
            <div className="bg-white rounded-ios-xl shadow-card mb-5 overflow-hidden">
              {CARDIAC_GOALS.map(goal => (
                <GoalRow key={goal.metric} goal={goal} latestValue={goalValues[goal.metric]} />
              ))}
            </div>
          </>
        )}

        {/* Trending Metrics */}
        {metricSummary.length > 0 && (
          <>
            <p className="section-header px-0 pt-0 pb-2">Tracked Metrics</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {metricSummary.map(({ name, latest, history, status, unit }) => {
                const sc = statusColor(status)
                return (
                  <div key={name} className="bg-white rounded-ios-xl shadow-card px-3.5 py-3.5">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-caption-1 font-semibold text-sys-label2 leading-tight flex-1 pr-1">{name}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: sc.text, background: sc.bg }}>{sc.label}</span>
                    </div>
                    <div className="flex items-end justify-between mt-1">
                      <div>
                        <p className="text-[22px] font-bold leading-none" style={{ color: sc.text }}>
                          {latest.value}
                        </p>
                        <p className="text-[11px] text-sys-label3 mt-0.5">{unit}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Sparkline values={history} status={status} />
                        <Trend values={history} />
                      </div>
                    </div>
                    {latest.normal_range && (
                      <p className="text-[10px] text-sys-label3 mt-1.5 border-t border-sys-sep pt-1.5">
                        Normal: {latest.normal_range}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Cardiac Findings */}
        {cardiac.length > 0 && (
          <>
            <p className="section-header px-0 pt-0 pb-2">Cardiac Record</p>
            <div className="bg-white rounded-ios-xl shadow-card mb-5 overflow-hidden">
              {cardiac.slice(0, 5).map(c => (
                <div key={c.id} className="px-4 py-3 border-b border-sys-sep last:border-0">
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0 mt-0.5">❤️</span>
                    <div>
                      {c.artery && <p className="text-caption-1 font-bold text-sys-label2 uppercase tracking-wide">{c.artery}</p>}
                      <p className="text-callout text-black">{c.finding_text}</p>
                      {c.has_stent && (
                        <span className="text-caption-2 font-semibold text-orange-600 bg-orange-50
                                         px-2 py-0.5 rounded-full mt-1 inline-block">Stent Placed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Current Medications */}
        <div className="flex items-center justify-between mb-2">
          <p className="section-header px-0 pt-0 pb-0">Current Medications</p>
          {meds.length > 0 && (
            <Link to="/medications" className="text-apple-blue text-subhead font-semibold">See all</Link>
          )}
        </div>
        {activeMeds.length === 0 ? (
          <div className="bg-white rounded-ios-xl shadow-card px-4 py-5 mb-5 text-center">
            <p className="text-callout text-sys-label3">No medications found yet.</p>
            <p className="text-footnote text-sys-label3 mt-1">Upload a prescription to auto-extract medications.</p>
          </div>
        ) : (
          <div className="bg-white rounded-ios-xl shadow-card mb-5 overflow-hidden">
            {activeMeds.slice(0, 4).map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-sys-sep last:border-0">
                <div className="w-9 h-9 rounded-ios bg-primary-light flex items-center justify-center flex-shrink-0">
                  <span className="text-base">💊</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-callout font-semibold text-black truncate">{m.name}</p>
                  <p className="text-footnote text-sys-label3">{m.dose} · {m.frequency}</p>
                </div>
                <span className="text-caption-1 font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
                  Current
                </span>
              </div>
            ))}
            {activeMeds.length > 4 && (
              <Link to="/medications" className="flex items-center justify-center gap-1 py-3
                text-apple-blue text-subhead font-semibold border-t border-sys-sep">
                +{activeMeds.length - 4} more medications <ChevronRight size={14} />
              </Link>
            )}
          </div>
        )}

        {/* Send to Pharmacy button */}
        {activeMeds.length > 0 && (
          <Link to="/pharmacy"
            className="flex items-center justify-between bg-white rounded-ios-xl shadow-card
                       px-4 py-4 mb-5 active:bg-sys-fill transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-ios bg-orange-50 flex items-center justify-center">
                <span className="text-xl">🏪</span>
              </div>
              <div>
                <p className="text-callout font-semibold text-black">Send to Pharmacy</p>
                <p className="text-footnote text-sys-label3">Order medications before you arrive</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-sys-label4" />
          </Link>
        )}

        {/* Empty state */}
        {reportCount === 0 && (
          <div className="flex flex-col items-center text-center py-10 mb-5">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-title-3 font-bold text-black mb-2">Your Health Passport is empty</h2>
            <p className="text-callout text-sys-label3 mb-6 max-w-xs leading-relaxed">
              Upload your first medical report — blood test, prescription, or cardiac report — and your health data will appear here automatically.
            </p>
            <Link to="/upload" className="btn-primary px-8">Upload First Report</Link>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
