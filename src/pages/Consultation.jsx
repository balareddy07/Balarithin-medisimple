import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Mic, MicOff, ChevronRight, ChevronLeft, Check, Copy, Share2, Stethoscope, Pill, FileText, Activity } from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Before Visit',    icon: '📋', desc: 'Log your symptoms'       },
  { id: 2, label: 'Show Doctor',     icon: '🩺', desc: 'Your health summary'     },
  { id: 3, label: 'Explain This',    icon: '💬', desc: 'Understand what was said' },
  { id: 4, label: 'After Visit',     icon: '💊', desc: 'Understand your Rx'      },
]

const SYMPTOM_CHIPS = [
  'Chest pain', 'Dizziness', 'Shortness of breath', 'Headache',
  'Fatigue', 'Nausea', 'Swollen feet', 'Blurred vision',
  'Palpitations', 'Back pain', 'Fever', 'Weakness',
]

const EXPLAIN_CHIPS = [
  'Angioplasty', 'Hypertension', 'HbA1c', 'Stenosis',
  'Stent', 'Echocardiogram', 'Ejection fraction', 'Arrhythmia',
  'Statins', 'ACE inhibitor', 'Beta blocker', 'Diuretic',
]

// Demo data for unauthenticated preview
const DEMO_MEDS = [
  { name: 'Aspirin',       dose: '75mg',  frequency: 'Once daily' },
  { name: 'Atorvastatin',  dose: '40mg',  frequency: 'Bedtime'    },
  { name: 'Metformin',     dose: '500mg', frequency: 'Twice daily'},
  { name: 'Ramipril',      dose: '5mg',   frequency: 'Once daily' },
  { name: 'Clopidogrel',   dose: '75mg',  frequency: 'Once daily' },
]
const DEMO_METRICS = [
  { name: 'HbA1c',       value: '7.2', unit: '%',    status: 'high'   },
  { name: 'LDL',         value: '89',  unit: 'mg/dL',status: 'high'   },
  { name: 'Systolic BP', value: '136', unit: 'mmHg', status: 'high'   },
  { name: 'Triglycerides',value:'148', unit: 'mg/dL',status: 'normal' },
]
const DEMO_PROFILE = { name: 'Rajesh Kumar', age: 58 }
const DEMO_CARDIAC = [{ artery: 'LAD', finding_text: '70% stenosis. Drug-eluting stent placed.', has_stent: true }]

function StepBar({ current, onGo }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onGo(s.id)}
          className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-ios transition-all duration-200
            ${current === s.id ? 'bg-primary text-white shadow-btn' : 'bg-white text-sys-label3 shadow-card'}`}
        >
          <span className="text-base leading-none">{s.icon}</span>
          <span className="text-[9px] font-semibold leading-tight text-center">{s.label}</span>
        </button>
      ))}
    </div>
  )
}

function ScoreSlider({ value, onChange }) {
  const color = value <= 3 ? '#34C759' : value <= 6 ? '#FF9500' : '#FF3B30'
  const label = value <= 3 ? 'Mild' : value <= 6 ? 'Moderate' : 'Severe'
  return (
    <div className="bg-white rounded-ios-xl shadow-card px-4 py-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-callout font-bold text-black">How are you feeling overall?</p>
        <div className="flex items-center gap-1.5">
          <span className="text-[22px] font-black" style={{ color }}>{value}</span>
          <span className="text-caption-1 font-semibold" style={{ color }}>{label}</span>
        </div>
      </div>
      <input
        type="range" min={1} max={10} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary h-2 rounded-full"
      />
      <div className="flex justify-between mt-1">
        <span className="text-caption-2 text-sys-label3">Feeling good</span>
        <span className="text-caption-2 text-sys-label3">Very unwell</span>
      </div>
    </div>
  )
}

// Phase 1 — Symptom Logger
function BeforeVisit({ symptoms, setSymptoms, score, setScore, vitals, setVitals, notes, setNotes, onNext }) {
  function toggleSymptom(s) {
    setSymptoms(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  }
  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h2 className="text-title-2 font-bold text-black">Before Your Visit</h2>
        <p className="text-callout text-sys-label3 mt-0.5">Record how you're feeling so your doctor gets a clear picture</p>
      </div>

      <ScoreSlider value={score} onChange={setScore} />

      {/* Symptom chips */}
      <p className="section-header px-0 pt-0 pb-2">What are you experiencing?</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {SYMPTOM_CHIPS.map(s => (
          <button
            key={s}
            onClick={() => toggleSymptom(s)}
            className={`px-3 py-1.5 rounded-full text-subhead font-semibold border-2 transition-all duration-150 active:scale-95
              ${symptoms.includes(s)
                ? 'bg-primary border-primary text-white shadow-btn'
                : 'bg-white border-sys-sep text-black shadow-card'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Today's vitals */}
      <p className="section-header px-0 pt-0 pb-2">Today's readings (if you have them)</p>
      <div className="bg-white rounded-ios-xl shadow-card overflow-hidden mb-4">
        {[
          { key: 'bp',      label: 'Blood Pressure', placeholder: 'e.g. 130/85 mmHg' },
          { key: 'glucose', label: 'Glucose',         placeholder: 'e.g. 140 mg/dL'  },
          { key: 'weight',  label: 'Weight',          placeholder: 'e.g. 72 kg'       },
        ].map((f, i) => (
          <div key={f.key} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-sys-sep' : ''}`}>
            <span className="text-subhead text-sys-label3 w-28 flex-shrink-0">{f.label}</span>
            <input
              className="flex-1 text-callout text-black bg-transparent outline-none placeholder-sys-label3"
              placeholder={f.placeholder}
              value={vitals[f.key] || ''}
              onChange={e => setVitals(p => ({ ...p, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {/* Free notes */}
      <p className="section-header px-0 pt-0 pb-2">Anything else to tell the doctor?</p>
      <div className="bg-white rounded-ios-xl shadow-card overflow-hidden mb-5">
        <textarea
          className="w-full px-4 py-3.5 text-callout text-black placeholder-sys-label3 outline-none resize-none h-20 bg-transparent"
          placeholder="e.g. The chest pain started 3 days ago, worse in the morning…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {symptoms.length > 0 && (
        <div className="bg-primary-light border border-primary/20 rounded-ios-xl px-4 py-3 mb-4 animate-scale-in">
          <p className="text-subhead font-bold text-primary-dark mb-1">Your reported symptoms:</p>
          <p className="text-callout text-primary">{symptoms.join(' · ')}</p>
        </div>
      )}

      <button onClick={onNext} className="btn-primary w-full py-4 text-headline">
        Ready — Show Doctor My Summary →
      </button>
    </div>
  )
}

// Phase 2 — Visit Card (show to doctor)
function ShowDoctor({ profile, meds, metrics, cardiac, symptoms, score, vitals, notes, onNext }) {
  const [copied, setCopied] = useState(false)

  const scoreColor = score <= 3 ? '#34C759' : score <= 6 ? '#FF9500' : '#FF3B30'
  const keyMetrics = metrics.slice(0, 4)

  function copyForDoctor() {
    const lines = [
      `Patient: ${profile?.name || 'Unknown'}, Age ${profile?.age || '—'}`,
      '',
      `Feeling: ${score}/10 today`,
      symptoms.length ? `Symptoms: ${symptoms.join(', ')}` : '',
      vitals.bp ? `BP today: ${vitals.bp}` : '',
      vitals.glucose ? `Glucose today: ${vitals.glucose}` : '',
      notes ? `Notes: ${notes}` : '',
      '',
      'CURRENT MEDICATIONS:',
      ...meds.map(m => `• ${m.name} ${m.dose} — ${m.frequency}`),
      '',
      'RECENT LAB VALUES:',
      ...metrics.map(m => `• ${m.name}: ${m.value} ${m.unit} (${m.status})`),
      '',
      cardiac.length ? 'CARDIAC HISTORY:\n' + cardiac.map(c => `• ${c.artery || ''}: ${c.finding_text}${c.has_stent ? ' [STENT]' : ''}`).join('\n') : '',
      '',
      '— Shared via MediSimple',
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(lines)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h2 className="text-title-2 font-bold text-black">Show Your Doctor</h2>
        <p className="text-callout text-sys-label3 mt-0.5">Hand your phone to the doctor — everything they need is here</p>
      </div>

      {/* Doctor-facing card */}
      <div className="bg-white rounded-ios-2xl shadow-card-lg overflow-hidden mb-4 border-2 border-primary/20">

        {/* Patient header */}
        <div className="bg-primary px-4 py-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-black text-white">{(profile?.name || 'P')[0]}</span>
          </div>
          <div className="flex-1">
            <p className="text-headline font-black text-white">{profile?.name || 'Patient'}</p>
            <p className="text-subhead text-white/80">Age {profile?.age || '—'} · MediSimple Health Record</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-white/70">Feeling</p>
            <p className="text-[22px] font-black text-white leading-none">{score}<span className="text-sm font-medium">/10</span></p>
          </div>
        </div>

        {/* Symptoms today */}
        {(symptoms.length > 0 || notes || vitals.bp || vitals.glucose) && (
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
            <p className="text-caption-1 font-bold text-orange-700 uppercase tracking-wide mb-1.5">Today's Complaints</p>
            {symptoms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {symptoms.map(s => (
                  <span key={s} className="text-caption-1 font-semibold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            )}
            {(vitals.bp || vitals.glucose) && (
              <p className="text-subhead text-orange-800 mt-1">
                {vitals.bp ? `BP: ${vitals.bp}` : ''}{vitals.bp && vitals.glucose ? '  ·  ' : ''}{vitals.glucose ? `Glucose: ${vitals.glucose}` : ''}
              </p>
            )}
            {notes && <p className="text-subhead text-orange-700 mt-1 italic">"{notes}"</p>}
          </div>
        )}

        {/* Current medications */}
        {meds.length > 0 && (
          <div className="px-4 py-3 border-b border-sys-sep">
            <p className="text-caption-1 font-bold text-sys-label2 uppercase tracking-wide mb-2">Current Medications</p>
            <div className="space-y-1.5">
              {meds.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-base">💊</span>
                  <p className="text-subhead text-black font-semibold">{m.name} {m.dose}</p>
                  <span className="text-caption-1 text-sys-label3">· {m.frequency}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key metrics */}
        {keyMetrics.length > 0 && (
          <div className="px-4 py-3 border-b border-sys-sep">
            <p className="text-caption-1 font-bold text-sys-label2 uppercase tracking-wide mb-2">Recent Lab Values</p>
            <div className="grid grid-cols-2 gap-2">
              {keyMetrics.map((m, i) => {
                const c = m.status === 'normal' ? { text: '#34C759', bg: '#E8F8ED' }
                  : m.status === 'critical' ? { text: '#FF3B30', bg: '#FFF1F0' }
                  : m.status === 'high' ? { text: '#FF9500', bg: '#FFF8F0' }
                  : { text: '#007AFF', bg: '#EBF4FF' }
                return (
                  <div key={i} className="rounded-ios px-3 py-2" style={{ background: c.bg }}>
                    <p className="text-caption-1 text-sys-label2 font-medium">{m.name}</p>
                    <p className="text-callout font-black" style={{ color: c.text }}>{m.value} <span className="text-footnote font-medium">{m.unit}</span></p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Cardiac history */}
        {cardiac.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-caption-1 font-bold text-sys-label2 uppercase tracking-wide mb-2">Cardiac History</p>
            {cardiac.map((c, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5">
                <span className="text-base flex-shrink-0">❤️</span>
                <div>
                  {c.artery && <span className="text-caption-1 font-bold text-sys-label2">{c.artery}: </span>}
                  <span className="text-subhead text-black">{c.finding_text}</span>
                  {c.has_stent && <span className="ml-1 text-caption-2 font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">STENT</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 mb-5">
        <button onClick={copyForDoctor} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white rounded-ios-xl shadow-card text-callout font-semibold text-black active:bg-sys-fill">
          {copied ? <><Check size={16} className="text-primary" /> Copied!</> : <><Copy size={16} /> Copy for Doctor</>}
        </button>
        <button onClick={onNext} className="flex-1 btn-primary py-3 text-callout">
          During Consult →
        </button>
      </div>
    </div>
  )
}

// Phase 3 — Explain This
function ExplainThis({ meds, metrics, language, onNext }) {
  const [input, setInput]     = useState('')
  const [result, setResult]   = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice not supported on this browser. Please type instead.'); return }
    const r = new SR()
    r.lang = language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-US'
    r.onresult = e => setInput(e.results[0][0].transcript)
    r.onend = () => setListening(false)
    recognitionRef.current = r
    r.start()
    setListening(true)
  }

  async function explain(text) {
    if (!text.trim()) return
    setInput(text)
    setLoading(true)
    setResult('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const SUPA_URL = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${SUPA_URL}/functions/v1/consult`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: 'explain',
          text,
          language,
          patientContext: { medications: meds, metrics },
        }),
      })
      const data = await res.json()
      setResult(data.result || data.error || 'Could not explain. Please try again.')
    } catch {
      setResult('Network error. Please check your connection.')
    }
    setLoading(false)
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h2 className="text-title-2 font-bold text-black">Explain What Doctor Said</h2>
        <p className="text-callout text-sys-label3 mt-0.5">Type or say what the doctor told you — get a plain explanation</p>
      </div>

      {/* Common terms */}
      <p className="section-header px-0 pt-0 pb-2">Tap a common term</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {EXPLAIN_CHIPS.map(c => (
          <button
            key={c}
            onClick={() => explain(c)}
            className="px-3 py-1.5 bg-white rounded-full shadow-card text-subhead font-semibold text-apple-blue border border-apple-blue/20 active:bg-apple-blue-light transition-colors"
          >
            {c}
          </button>
        ))}
      </div>

      {/* Input area */}
      <p className="section-header px-0 pt-0 pb-2">Or type / speak what the doctor said</p>
      <div className="bg-white rounded-ios-xl shadow-card overflow-hidden mb-3">
        <textarea
          className="w-full px-4 py-3.5 text-callout text-black placeholder-sys-label3 outline-none resize-none h-24 bg-transparent"
          placeholder="e.g. 'You have left ventricular hypertrophy and we need to adjust your antihypertensives'"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <div className="flex items-center gap-2 px-4 pb-3">
          <button
            onClick={startVoice}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption-1 font-semibold transition-all
              ${listening ? 'bg-red-50 text-red-500 border border-red-200 animate-pulse' : 'bg-sys-fill text-sys-label2'}`}
          >
            {listening ? <><MicOff size={13} /> Listening…</> : <><Mic size={13} /> Speak</>}
          </button>
          <button
            onClick={() => explain(input)}
            disabled={!input.trim() || loading}
            className="ml-auto btn-primary px-5 py-1.5 text-subhead"
          >
            {loading ? 'Explaining…' : 'Explain →'}
          </button>
        </div>
      </div>

      {/* Result */}
      {loading && (
        <div className="bg-white rounded-ios-xl shadow-card px-4 py-6 flex items-center gap-3 mb-4">
          <div className="loader-dots text-primary"><span/><span/><span/></div>
          <p className="text-callout text-sys-label3">AI is explaining in simple language…</p>
        </div>
      )}

      {result && !loading && (
        <div className="bg-primary-light border border-primary/20 rounded-ios-xl px-4 py-4 mb-4 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💬</span>
            <p className="text-subhead font-bold text-primary-dark">Plain Language Explanation</p>
          </div>
          <p className="text-callout text-black leading-relaxed whitespace-pre-wrap">{result}</p>
        </div>
      )}

      <button onClick={onNext} className="btn-primary w-full py-4 text-headline mt-2">
        After Visit — Understand My Prescription →
      </button>
    </div>
  )
}

// Phase 4 — Prescription Explainer
function AfterVisit({ meds, metrics, language }) {
  const [rx, setRx]         = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]   = useState(false)

  async function explainRx() {
    if (!rx.trim()) return
    setLoading(true)
    setResult('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const SUPA_URL = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${SUPA_URL}/functions/v1/consult`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: 'drugs',
          text: rx,
          language,
          patientContext: { medications: meds, metrics },
        }),
      })
      const data = await res.json()
      setResult(data.result || data.error || 'Could not explain. Please try again.')
    } catch {
      setResult('Network error. Please check your connection.')
    }
    setLoading(false)
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h2 className="text-title-2 font-bold text-black">Understand Your Prescription</h2>
        <p className="text-callout text-sys-label3 mt-0.5">Type or paste what the doctor prescribed — get a plain breakdown</p>
      </div>

      <div className="bg-apple-blue-light border border-apple-blue/20 rounded-ios-xl px-4 py-3 mb-4">
        <p className="text-subhead text-apple-blue leading-relaxed">
          💡 Type the medicine names from your prescription slip. We'll explain what each one does and check for interactions with your current medications.
        </p>
      </div>

      <p className="section-header px-0 pt-0 pb-2">Paste or type your new prescription</p>
      <div className="bg-white rounded-ios-xl shadow-card overflow-hidden mb-3">
        <textarea
          className="w-full px-4 py-3.5 text-callout text-black placeholder-sys-label3 outline-none resize-none h-28 bg-transparent"
          placeholder={`e.g.\nRosuvastatin 10mg — once at night\nAmlodipine 5mg — morning\nGlimepiride 1mg — before breakfast`}
          value={rx}
          onChange={e => setRx(e.target.value)}
        />
      </div>

      <button
        onClick={explainRx}
        disabled={!rx.trim() || loading}
        className="btn-primary w-full py-4 text-headline mb-4"
      >
        {loading ? 'Checking medications…' : '💊 Explain My Prescription →'}
      </button>

      {loading && (
        <div className="bg-white rounded-ios-xl shadow-card px-4 py-6 flex items-center gap-3 mb-4">
          <div className="loader-dots text-primary"><span/><span/><span/></div>
          <p className="text-callout text-sys-label3">Checking drugs and interactions…</p>
        </div>
      )}

      {result && !loading && (
        <div className="animate-slide-up space-y-3 mb-5">
          <div className="bg-white rounded-ios-xl shadow-card px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">💊</span>
              <p className="text-headline font-bold text-black">Prescription Breakdown</p>
            </div>
            <p className="text-callout text-black leading-relaxed whitespace-pre-wrap">{result}</p>
          </div>

          <div className="flex gap-3">
            <Link to="/upload" className="flex-1 btn-outline py-3 text-callout text-center rounded-ios-xl">
              📷 Upload Prescription
            </Link>
            <Link to="/pharmacy" className="flex-1 btn-primary py-3 text-callout text-center rounded-ios-xl">
              🏪 Send to Pharmacy
            </Link>
          </div>
        </div>
      )}

      {/* Completion card */}
      {result && !loading && (
        <div className="bg-primary rounded-ios-xl px-4 py-5 text-center animate-scale-in">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-headline font-bold text-white mb-1">Consultation Complete</p>
          <p className="text-subhead text-white/80 leading-relaxed">
            Your symptoms, visit summary, and prescription are all saved. Next appointment, start here again.
          </p>
          <Link to="/" className="mt-3 inline-block text-white/90 underline text-subhead font-semibold">
            Back to Home
          </Link>
        </div>
      )}
    </div>
  )
}

export default function Consultation() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]       = useState(1)
  const [meds, setMeds]       = useState([])
  const [metrics, setMetrics] = useState([])
  const [cardiac, setCardiac] = useState([])
  const [patProfile, setPatProfile] = useState(null)
  const [demo, setDemo]       = useState(false)

  // Phase 1 state
  const [symptoms, setSymptoms] = useState([])
  const [score, setScore]       = useState(5)
  const [vitals, setVitals]     = useState({})
  const [notes, setNotes]       = useState('')

  const language = typeof window !== 'undefined'
    ? localStorage.getItem('medisimple_lang') || 'en'
    : 'en'

  useEffect(() => {
    if (!user) {
      // Demo mode
      setMeds(DEMO_MEDS)
      setMetrics(DEMO_METRICS)
      setCardiac(DEMO_CARDIAC)
      setPatProfile(DEMO_PROFILE)
      setDemo(true)
      return
    }
    loadData()
  }, [user])

  async function loadData() {
    const [medsRes, metricsRes, cardiacRes] = await Promise.all([
      supabase.from('medications').select('*').eq('user_id', user.id).eq('status', 'active').order('name'),
      supabase.from('health_metrics').select('*').eq('user_id', user.id).order('recorded_date', { ascending: false }),
      supabase.from('cardiac_records').select('*').eq('user_id', user.id),
    ])
    setMeds(medsRes.data || [])
    setCardiac(cardiacRes.data || [])
    // Dedupe metrics — latest per name
    const seen = new Set()
    const latest = []
    for (const m of (metricsRes.data || [])) {
      if (!seen.has(m.name)) { seen.add(m.name); latest.push(m) }
    }
    setMetrics(latest)
    setPatProfile(profile)
  }

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-ios bg-primary flex items-center justify-center shadow-btn flex-shrink-0">
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-title-2 font-bold text-black">Consultation Mode</h1>
              <p className="text-footnote text-sys-label3">Doctor visit — before, during & after</p>
            </div>
          </div>
        </div>

        {demo && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-ios-xl px-3 py-2.5 mb-4">
            <span className="text-lg flex-shrink-0">👁️</span>
            <p className="text-caption-1 text-orange-800">
              Demo mode — <Link to="/auth" className="underline font-semibold">Sign in</Link> to use with your real health data
            </p>
          </div>
        )}

        <StepBar current={step} onGo={setStep} />

        {step === 1 && (
          <BeforeVisit
            symptoms={symptoms} setSymptoms={setSymptoms}
            score={score} setScore={setScore}
            vitals={vitals} setVitals={setVitals}
            notes={notes} setNotes={setNotes}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <ShowDoctor
            profile={patProfile} meds={meds} metrics={metrics} cardiac={cardiac}
            symptoms={symptoms} score={score} vitals={vitals} notes={notes}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <ExplainThis meds={meds} metrics={metrics} language={language} onNext={() => setStep(4)} />
        )}
        {step === 4 && (
          <AfterVisit meds={meds} metrics={metrics} language={language} />
        )}

        <div className="h-8" />
      </div>
    </div>
  )
}
