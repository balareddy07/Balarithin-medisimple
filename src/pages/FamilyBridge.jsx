import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart, Globe, Phone, MessageCircle, Bell, CheckCircle2,
  AlertTriangle, Moon, Activity, Droplet, Wind, Clock, Calendar,
  ChevronRight, Pill, MapPin
} from 'lucide-react'

// ── Demo data: father in Chennai, son in New Jersey ──────────────────────────

const PARENT = {
  name: 'Rajesh Kumar',
  relation: 'Father',
  age: 58,
  city: 'Chennai, India',
  conditions: ['Type 2 Diabetes', 'Hypertension'],
  language: 'Tamil',
  lastSync: '4 min ago',
}

const WATCHER = {
  name: 'Arun Kumar',
  city: 'Edison, New Jersey',
  language: 'English',
}

const LIVE_VITALS = [
  { id:'glucose', label:'Glucose',    value:118, unit:'mg/dL', icon:Droplet,  status:'normal',
    note:'Within his personal range (88–128)' },
  { id:'hr',      label:'Heart Rate', value:71,  unit:'bpm',   icon:Heart,    status:'normal',
    note:'Steady all morning' },
  { id:'bp',      label:'BP Estimate',value:'128/82', unit:'', icon:Activity, status:'normal',
    note:'Similar to his 7-day average' },
  { id:'spo2',    label:'SpO₂',       value:97,  unit:'%',     icon:Wind,     status:'normal',
    note:'Normal oxygen level' },
]

const ALERTS_FEED = [
  {
    id:'a1', time:'Today, 6:12 AM ET', type:'ok',
    title:'Morning check complete',
    body:'Appa woke at 6:40 AM IST, slept 7h 10m. All vitals in his usual range.',
  },
  {
    id:'a2', time:'Yesterday, 11:05 PM ET', type:'warn',
    title:'Glucose above his usual range',
    body:'Reading of 162 mg/dL after dinner — higher than his usual post-meal pattern. It returned to normal within 2 hours. No action needed, but worth mentioning if it repeats.',
  },
  {
    id:'a3', time:'Yesterday, 8:30 AM ET', type:'ok',
    title:'All medications taken',
    body:'Metformin (morning + night) and Telmisartan confirmed taken on time.',
  },
  {
    id:'a4', time:'Mon, 7:15 AM ET', type:'info',
    title:'Weekly summary ready',
    body:'Glucose stable 6 of 7 days. 1 mild spike (Sunday dinner). Average sleep 6h 55m. Activity up 12% from last week.',
  },
]

const MED_SCHEDULE = [
  { name:'Metformin 500mg', time:'8:00 AM IST',  taken:true  },
  { name:'Telmisartan 40mg',time:'9:00 AM IST',  taken:true  },
  { name:'Metformin 500mg', time:'9:00 PM IST',  taken:false },
]

// ── Clock helper ──────────────────────────────────────────────────────────────

function useDualClocks() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(iv)
  }, [])
  const fmt = tz => now.toLocaleTimeString('en-US', {
    hour:'numeric', minute:'2-digit', timeZone:tz,
  })
  return {
    india: fmt('Asia/Kolkata'),
    us:    fmt('America/New_York'),
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FamilyBridge() {
  const clocks = useDualClocks()
  const [langView, setLangView] = useState('en')   // what Appa's side looks like
  const [callModal, setCallModal] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
            <Globe size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Family Bridge</h1>
            <p className="text-sm text-gray-500">Watch over your parents in India — from anywhere in the world</p>
          </div>
        </div>

        {/* Two-city strip */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin size={12} className="text-gray-400" />
              <p className="text-xs font-semibold text-gray-500">{WATCHER.city}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{clocks.us}</p>
            <p className="text-xs text-gray-500 mt-0.5">{WATCHER.name} · You</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin size={12} className="text-gray-400" />
              <p className="text-xs font-semibold text-gray-500">{PARENT.city}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{clocks.india}</p>
            <p className="text-xs text-gray-500 mt-0.5">{PARENT.name} · {PARENT.relation}</p>
          </div>
        </div>

        {/* Parent status card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">👨🏽</div>
              <div>
                <p className="font-bold text-gray-900">{PARENT.name}</p>
                <p className="text-xs text-gray-500">{PARENT.age} yrs · {PARENT.conditions.join(' · ')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-green-700">All Good</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            SimpleMed Band synced <strong>{PARENT.lastSync}</strong>. Everything looks normal today — he slept well and took his morning medications on time.
          </p>

          {/* Live vitals grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {LIVE_VITALS.map(v => (
              <div key={v.id} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <v.icon size={12} className="text-gray-400" />
                  <p className="text-[11px] font-semibold text-gray-500">{v.label}</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{v.value}<span className="text-xs font-normal text-gray-400 ml-1">{v.unit}</span></p>
                <p className="text-[10px] text-green-600 font-medium mt-0.5">{v.note}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex gap-2">
            <button onClick={() => setCallModal(true)}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              <Phone size={14} /> Call Appa
            </button>
            <button className="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              <MessageCircle size={14} /> WhatsApp
            </button>
            <Link to="/family-monitor"
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              <Activity size={14} /> Full Vitals
            </Link>
          </div>
        </div>

        {/* Language bridge demo */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">One app, two languages</p>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {[
                { id:'en', label:'Your view (English)' },
                { id:'ta', label:"Appa's view (தமிழ்)" },
              ].map(l => (
                <button key={l.id} onClick={() => setLangView(l.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors
                    ${langView===l.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            {langView === 'en' ? (
              <>
                <p className="text-sm font-semibold text-gray-900 mb-1">Today's summary</p>
                <p className="text-sm text-gray-700">Your father's glucose stayed in his normal range all day. He walked 4,200 steps and took both morning medications on time. Sleep was slightly short (6h 20m) — the third night this week.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-900 mb-1">இன்றைய சுருக்கம்</p>
                <p className="text-sm text-gray-700">உங்கள் சர்க்கரை அளவு இன்று முழுவதும் இயல்பான வரம்பில் இருந்தது. 4,200 அடிகள் நடந்தீர்கள், காலை மருந்துகளை சரியான நேரத்தில் எடுத்துக்கொண்டீர்கள். தூக்கம் சற்று குறைவு (6 மணி 20 நிமிடம்).</p>
              </>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            You read everything in English in New Jersey. Appa's app speaks Tamil in Chennai. Same data, no translation needed by anyone.
          </p>
        </div>

        {/* Medication watch */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Pill size={14} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Today's medications (his time)</p>
          </div>
          <div className="space-y-2">
            {MED_SCHEDULE.map(m => (
              <div key={m.name+m.time} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.time}</p>
                </div>
                {m.taken ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                    <CheckCircle2 size={14} /> Taken
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-gray-400">
                    <Clock size={14} /> Upcoming
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            If a dose is missed by more than 1 hour, you get a gentle notification — and can nudge him on WhatsApp with one tap.
          </p>
        </div>

        {/* Smart alerts feed */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={14} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Alerts that matter — nothing else</p>
          </div>
          <div className="space-y-3">
            {ALERTS_FEED.map(a => (
              <div key={a.id} className={`rounded-xl px-4 py-3 border
                ${a.type==='warn' ? 'bg-amber-50 border-amber-200'
                : a.type==='info' ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {a.type==='warn'
                    ? <AlertTriangle size={13} className="text-amber-600" />
                    : a.type==='info'
                    ? <Calendar size={13} className="text-blue-600" />
                    : <CheckCircle2 size={13} className="text-green-600" />}
                  <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                  <span className="ml-auto text-[10px] text-gray-400 flex-shrink-0">{a.time}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{a.body}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            No noise. You're only notified when something is outside his personal baseline — built from his own reports and history.
          </p>
        </div>

        {/* Weekly digest promo */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Moon size={16} className="text-indigo-200" />
            <p className="font-bold text-sm">Sunday Family Digest</p>
          </div>
          <p className="text-white/85 text-sm mb-3">
            Every Sunday morning (your time), a WhatsApp summary of Appa's whole week — glucose stability, sleep, activity, medications, and anything worth mentioning on your next call.
          </p>
          <div className="bg-white/10 rounded-xl p-3 text-xs text-white/90 leading-relaxed">
            💬 <em>"Appa had a stable week. Glucose in range 6 of 7 days — one mild spike after Sunday dinner. Sleep averaged 6h 55m. He walked 12% more than last week. All medications taken. Nothing needs your attention."</em>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">How Family Bridge works</p>
          <div className="space-y-3">
            {[
              { n:'1', title:'Gift the Band', desc:'Order a SimpleMed Band + CGM to your parent\'s address in India. Setup takes 5 minutes with their phone.' },
              { n:'2', title:'Link your accounts', desc:'Your parent approves you as a family watcher — they control exactly what you can see.' },
              { n:'3', title:'Live your life', desc:'You get a morning check, smart alerts, and the Sunday digest. Call when it matters, relax when it doesn\'t.' },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{s.n}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-8" />
      </div>

      {/* Call modal */}
      {callModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setCallModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e=>e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl mx-auto mb-3">👨🏽</div>
            <p className="font-bold text-gray-900">{PARENT.name}</p>
            <p className="text-sm text-gray-500 mb-1">{PARENT.city}</p>
            <p className="text-xs text-gray-400 mb-4">It's {clocks.india} there — a good time to call</p>
            <div className="flex gap-2">
              <button className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                <Phone size={14} /> Call Now
              </button>
              <button onClick={() => setCallModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm">
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
