import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Download, TrendingUp, Users, CreditCard, LogOut, ChevronRight } from 'lucide-react'

const DEMO = {
  name: 'Riverside Medical Center',
  plan: 'Professional',
  active_since: 'January 2025',
  patients: 342,
  reports: 891,
  growth: '+15%',
  monthly: [
    { m:'Jan', n:201 }, { m:'Feb', n:278 }, { m:'Mar', n:315 },
    { m:'Apr', n:298 }, { m:'May', n:342 },
  ],
  depts: [
    { name:'General Medicine', n:450 },
    { name:'Cardiology',       n:187 },
    { name:'Diabetology',      n:156 },
    { name:'Orthopaedics',     n:98  },
  ],
}

export default function HospitalAdmin() {
  const [authed, setAuthed]   = useState(false)
  const [email, setEmail]     = useState('')
  const [password, setPw]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [hospital, setHospital] = useState(null)
  const [country, setCountry]   = useState('US')
  const [billingMsg, setBillingMsg] = useState('')

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setError('')
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authErr) { setError(authErr.message); return }
    const { data: hosp } = await supabase.from('hospitals').select('*').eq('email', email).single()
    if (!hosp) {
      setError('No hospital account found. Contact hospitals@medisimple.health')
      await supabase.auth.signOut(); return
    }
    setHospital(hosp); setCountry(hosp.country || 'US'); setAuthed(true)
  }

  function downloadCSV() {
    const rows = [['Month','Patients','Reports'], ...DEMO.monthly.map(d=>[d.m, d.n, Math.round(d.n*2.6)])]
    const csv  = rows.map(r=>r.join(',')).join('\n')
    const url  = URL.createObjectURL(new Blob([csv], { type:'text/csv' }))
    const a    = Object.assign(document.createElement('a'), { href:url, download:`medisimple-${new Date().toISOString().slice(0,7)}.csv` })
    a.click(); URL.revokeObjectURL(url)
  }

  const maxN = Math.max(...DEMO.monthly.map(d=>d.n))
  const bill = country==='IN' ? '₹4,999' : '$59'

  /* ─── Login screen ─── */
  if (!authed) return (
    <div className="page min-h-screen bg-sys-bg flex flex-col">
      <div className="max-w-md mx-auto w-full px-5 flex-1 flex flex-col justify-center py-10">

        <div className="text-center mb-8 animate-slide-up">
          <div className="w-20 h-20 rounded-ios-2xl bg-apple-blue flex items-center justify-center shadow-card-lg mx-auto mb-4">
            <span className="text-5xl">🏥</span>
          </div>
          <h1 className="text-title-1 font-bold text-black">Hospital Admin</h1>
          <p className="text-callout text-sys-label3 mt-1">MediSimple for Healthcare Providers</p>
        </div>

        <div className="bg-white rounded-ios-2xl shadow-card-md overflow-hidden animate-slide-up" style={{ animationDelay:'60ms' }}>
          <div className="px-5 pt-5">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-ios px-3.5 py-3 mb-4">
                <span className="text-lg">⚠️</span>
                <p className="text-subhead text-apple-red">{error}</p>
              </div>
            )}
          </div>
          <form onSubmit={handleLogin} className="px-5 pb-5 space-y-3">
            <div className="input-group">
              <div className="input-row">
                <span className="text-sys-label3 text-subhead w-20 flex-shrink-0">Email</span>
                <input className="flex-1 bg-transparent text-callout text-black placeholder-sys-label3 outline-none"
                  type="email" placeholder="admin@hospital.com" value={email} onChange={e=>setEmail(e.target.value)} required />
              </div>
              <div className="input-row">
                <span className="text-sys-label3 text-subhead w-20 flex-shrink-0">Password</span>
                <input className="flex-1 bg-transparent text-callout text-black placeholder-sys-label3 outline-none"
                  type="password" placeholder="Your password" value={password} onChange={e=>setPw(e.target.value)} required />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-blue w-full py-4 text-headline">
              {loading ? 'Signing in…' : 'Sign In to Admin Panel'}
            </button>
          </form>
          <div className="px-5 pb-5 text-center">
            <p className="text-footnote text-sys-label3">
              New hospital?{' '}
              <a href="mailto:hospitals@medisimple.health" className="text-apple-blue font-medium">Contact us</a>
            </p>
          </div>
        </div>

        <button
          onClick={() => { setAuthed(true); setHospital({ name:'Riverside Medical Center', country:'US' }) }}
          className="text-center text-subhead text-sys-label3 mt-5 underline"
        >
          View demo dashboard →
        </button>
      </div>
    </div>
  )

  /* ─── Dashboard ─── */
  return (
    <div className="page min-h-screen bg-sys-bg pb-16">
      {/* Header bar */}
      <div className="glass border-b border-black/5 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-apple-blue rounded-ios flex items-center justify-center shadow-sm">
              <span className="text-base">🏥</span>
            </div>
            <div>
              <p className="text-headline font-bold text-black leading-tight">{hospital?.name || DEMO.name}</p>
              <div className="flex items-center gap-2">
                <span className="pill pill-green text-[10px]">{DEMO.plan}</span>
                <span className="text-caption-2 text-sys-label3">Since {DEMO.active_since}</span>
              </div>
            </div>
          </div>
          <button onClick={async()=>{await supabase.auth.signOut();setAuthed(false)}}
            className="flex items-center gap-1.5 text-apple-red text-subhead font-medium active:opacity-60">
            <LogOut size={16}/> Sign out
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5">

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { icon:<Users size={20} className="text-primary"/>,      label:'Patients This Month', val:DEMO.patients.toLocaleString(), bg:'bg-primary-light' },
            { icon:<TrendingUp size={20} className="text-apple-blue"/>,label:'Reports Generated', val:DEMO.reports.toLocaleString(),  bg:'bg-apple-blue-light' },
            { icon:<CreditCard size={20} className="text-apple-indigo"/>,label:'Monthly Bill',   val:bill,                           bg:'bg-indigo-50' },
            { icon:<span className="text-xl">📈</span>,              label:'Growth vs Last Month', val:DEMO.growth,                   bg:'bg-orange-50' },
          ].map(({icon,label,val,bg}) => (
            <div key={label} className="card py-5">
              <div className={`w-10 h-10 rounded-ios ${bg} flex items-center justify-center mb-3`}>{icon}</div>
              <p className="text-[28px] font-bold text-black leading-tight">{val}</p>
              <p className="text-caption-1 text-sys-label3 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <p className="section-header px-0 pt-0 pb-3">Monthly Patient Usage</p>
        <div className="card-lg mb-4">
          <div className="flex items-end justify-between gap-3" style={{ height:120 }}>
            {DEMO.monthly.map(({m,n}) => (
              <div key={m} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                <span className="text-caption-2 font-bold text-primary">{n}</span>
                <div
                  className="w-full rounded-t-ios bg-primary transition-all"
                  style={{ height: `${Math.round((n/maxN)*85)}px` }}
                />
                <span className="text-caption-2 text-sys-label3">{m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Departments */}
        <p className="section-header px-0 pt-0 pb-3">Usage by Department</p>
        <div className="card-lg mb-4 space-y-4">
          {DEMO.depts.map(({name,n}) => (
            <div key={name}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-subhead font-medium text-black">{name}</span>
                <span className="text-footnote text-sys-label3">{n} reports</span>
              </div>
              <div className="h-2 bg-sys-fill rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width:`${(n/DEMO.reports)*100}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Billing */}
        <p className="section-header px-0 pt-0 pb-3">Billing</p>
        <div className="card-lg mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-subhead text-sys-label3">Current plan</p>
              <p className="text-headline font-bold text-black mt-0.5">{DEMO.plan} · {bill}/month</p>
              <p className="text-footnote text-sys-label3 mt-1">
                via {country==='IN' ? 'Razorpay' : 'Stripe'} · Next billing: July 1, 2026
              </p>
            </div>
            <span className="pill pill-green">Active</span>
          </div>
          <button
            onClick={() => setBillingMsg(`Opening ${country==='IN'?'Razorpay':'Stripe'} portal…`)}
            className="btn-blue text-subhead py-2.5 px-5"
          >
            Manage Billing →
          </button>
          {billingMsg && <p className="text-subhead text-apple-blue mt-3 font-medium">{billingMsg}</p>}
        </div>

        {/* Download */}
        <button onClick={downloadCSV}
          className="w-full btn-outline py-4 text-headline mb-4 flex items-center justify-center gap-2">
          <Download size={18}/> Download Usage Report (CSV)
        </button>

        <p className="text-center text-caption-1 text-sys-label3 mb-6">
          Patient data is anonymised in all reports. Individual records are never accessible to hospitals.
        </p>
      </div>
    </div>
  )
}
