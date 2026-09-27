import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { AlertTriangle, Copy, Check, Phone, Calendar, ChevronRight, X, RefreshCw } from 'lucide-react'

// Status helpers
function statusOf(value, normalLow, normalHigh, critHigh) {
  if (value === null || value === undefined) return { label:'—', color:'#8E8E93', bg:'#F2F2F7' }
  if (value > critHigh)        return { label:'Critical', color:'#FF3B30', bg:'#FFF1F0' }
  if (value > normalHigh)      return { label:'High',     color:'#FF9500', bg:'#FFF8F0' }
  if (value < normalLow)       return { label:'Low',      color:'#007AFF', bg:'#EBF4FF' }
  return                              { label:'Normal',   color:'#34C759', bg:'#E8F8ED' }
}

// Mini sparkline (last 8 readings)
function MiniLine({ values, color }) {
  if (!values || values.length < 2) return null
  const w=80, h=28, p=3
  const nums = values.slice(-8).map(v=>parseFloat(v)||0)
  const min=Math.min(...nums), max=Math.max(...nums), range=max-min||1
  const pts = nums.map((n,i)=>{
    const x = p+(i/(nums.length-1))*(w-p*2)
    const y = p+((1-(n-min)/range))*(h-p*2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const lx=(p+(( nums.length-1)/(nums.length-1))*(w-p*2)).toFixed(1)
  const lv=nums[nums.length-1]
  const ly=(p+((1-(lv-min)/range))*(h-p*2)).toFixed(1)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      <circle cx={lx} cy={ly} r="3" fill={color}/>
    </svg>
  )
}

// Vital card for a monitored person
function VitalCard({ label, icon, value, unit, normalLow, normalHigh, critHigh, history, source, time }) {
  const st = statusOf(value, normalLow, normalHigh, critHigh)
  return (
    <div className="bg-white rounded-ios-xl shadow-card px-4 py-3.5">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <p className="text-subhead font-semibold text-sys-label2">{label}</p>
        </div>
        <span className="text-caption-2 font-bold px-2 py-0.5 rounded-full"
          style={{color:st.color, background:st.bg}}>{st.label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[28px] font-bold leading-none" style={{color: value ? st.color : '#C7C7CC'}}>
            {value ?? '—'}
          </p>
          <p className="text-caption-1 text-sys-label3 mt-0.5">
            {unit}{time ? ` · ${time}` : ''}{source ? ` · ${source==='dexcom'?'📡 SimpleMed CGM':source==='fitbit'?'⌚ SimpleMed Band':source==='manual'?'✏️':'📱'}` : ''}
          </p>
        </div>
        {history && <MiniLine values={history} color={st.color}/>}
      </div>
    </div>
  )
}

// Demo data for a "parent" being monitored
function makeDemoParent() {
  const now = Date.now()
  const ago = h => new Date(now - h*3_600_000).toISOString()
  return {
    profile: { name:'Rajesh Kumar', age: 62, relation:'Father' },
    readings: {
      glucose:      [218, 195, 162, 148, 138, 128].map((v,i)=>({ value:v, unit:'mg/dL', source:'dexcom', recorded_at: ago(i*0.8) })),
      heart_rate:   [72, 75, 68, 80, 70].map((v,i)=>({ value:v, unit:'bpm', source:'fitbit', recorded_at: ago(i*2) })),
      blood_pressure:[{value:136, unit:'mmHg', source:'manual', recorded_at: ago(3)}],
      spo2:         [{value:97,  unit:'%',    source:'fitbit', recorded_at: ago(1)}],
      sleep_hours:  [{value:6.2, unit:'hrs',  source:'fitbit', recorded_at: ago(8)}],
    },
    baselines: {
      glucose:      { low:88,  high:128, mean:108 },
      heart_rate:   { low:54,  high:82,  mean:68  },
      blood_pressure:{ low:108, high:138, mean:122 },
      spo2:         { low:95,  high:99,  mean:97  },
    },
    alerts: [
      { metric:'glucose', value:218, unit:'mg/dL', severity:'warning', message:'Glucose High: 218 mg/dL (usual: 88–128)', created_at: ago(6.5) },
      { metric:'glucose', value:192, unit:'mg/dL', severity:'warning', message:'Glucose High: 192 mg/dL (usual: 88–128)', created_at: ago(13) },
    ],
    lastUpdated: new Date(now - 5*60000), // 5 mins ago
  }
}

const DEMO_PARENT = makeDemoParent()

export default function FamilyMonitor() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [demo, setDemo]           = useState(false)
  const [parent, setParent]       = useState(null) // monitored person's data
  const [monitorLink, setLink]    = useState('')
  const [copied, setCopied]       = useState(false)
  const [loading, setLoading]     = useState(true)
  const [lastPoll, setLastPoll]   = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName]   = useState('')
  const [inviting, setInviting]       = useState(false)
  const [inviteDone, setInviteDone]   = useState(false)

  useEffect(() => {
    if (!user) {
      setParent(DEMO_PARENT)
      setDemo(true)
      setLoading(false)
      return
    }
    loadMyData()
    // Poll every 30 seconds for new readings
    const interval = setInterval(loadMyData, 30000)
    return () => clearInterval(interval)
  }, [user])

  async function loadMyData() {
    setLoading(true)
    const since = new Date(Date.now() - 24*3_600_000).toISOString()
    const [vitalsRes, alertsRes, profileRes] = await Promise.all([
      supabase.from('vital_readings').select('*').eq('user_id', user.id)
        .gte('recorded_at', since).order('recorded_at', { ascending: false }),
      supabase.from('health_alerts').select('*').eq('user_id', user.id)
        .eq('resolved', false).order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('name,age').eq('id', user.id).single(),
    ])

    // Group vitals
    const grouped = {}
    for (const r of (vitalsRes.data || [])) {
      if (!grouped[r.metric_type]) grouped[r.metric_type] = []
      grouped[r.metric_type].push(r)
    }

    setParent({
      profile: { name: profileRes.data?.name || 'You', age: profileRes.data?.age },
      readings: grouped,
      alerts: alertsRes.data || [],
      baselines: {},
      lastUpdated: new Date(),
    })
    setLastPoll(new Date())
    setLoading(false)
  }

  async function generateMonitorLink() {
    if (demo) { setLink(`${window.location.origin}/monitor/demo-link-abc123`); return }
    // Create a family_access record
    const { data } = await supabase.from('family_access').insert({
      parent_user_id: user.id,
      nickname: 'Family Monitor',
    }).select().single()
    if (data?.access_token) {
      setLink(`${window.location.origin}/monitor/${data.access_token}`)
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    // In production: send email via Edge Function. For now just record access.
    if (!demo) {
      await supabase.from('family_access').insert({
        parent_user_id: user.id,
        monitor_email: inviteEmail.trim(),
        nickname: inviteName.trim() || inviteEmail.split('@')[0],
      })
    }
    setInviteDone(true)
    setInviting(false)
    setTimeout(() => { setShowInvite(false); setInviteDone(false); setInviteEmail(''); setInviteName('') }, 2000)
  }

  async function copyLink() {
    if (!monitorLink) await generateMonitorLink()
    await navigator.clipboard.writeText(monitorLink || `${window.location.origin}/monitor/link`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const relTime = parent?.lastUpdated
    ? (Date.now() - parent.lastUpdated < 60000 ? 'just now'
      : `${Math.round((Date.now() - parent.lastUpdated) / 60000)}m ago`)
    : '—'

  // Extract latest value per metric
  function latestOf(type) {
    const arr = parent?.readings?.[type] || []
    const sorted = [...arr].sort((a,b) => new Date(b.recorded_at) - new Date(a.recorded_at))
    return sorted[0] || null
  }

  const glucose  = latestOf('glucose')
  const hr       = latestOf('heart_rate')
  const bp       = latestOf('blood_pressure')
  const spo2     = latestOf('spo2')
  const sleep    = latestOf('sleep_hours')
  const bl       = parent?.baselines || {}
  const alerts   = parent?.alerts || []
  const critAlerts = alerts.filter(a => a.severity === 'critical')
  const warnAlerts = alerts.filter(a => a.severity === 'warning')

  const fmtTime = r => r ? new Date(r.recorded_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : null

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        <div className="pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-title-1 font-bold text-black">Family Monitor</h1>
              <p className="text-callout text-sys-label3 mt-0.5">Watch your family's health remotely</p>
            </div>
            <button onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 bg-primary text-white text-subhead font-semibold
                         px-3 py-2 rounded-ios shadow-btn active:scale-95 transition-transform">
              + Invite
            </button>
          </div>
        </div>

        {/* Demo banner */}
        {demo && (
          <div className="bg-orange-50 border border-orange-200 rounded-ios-xl px-4 py-3 mb-4">
            <p className="text-subhead text-orange-800 leading-relaxed">
              👁️ <strong>Demo Mode</strong> — Showing Rajesh Kumar's live cardiac monitoring.{' '}
              <Link to="/auth" className="underline font-semibold">Sign in</Link> to monitor your family.
            </p>
          </div>
        )}

        {/* Critical alert banner */}
        {critAlerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-ios-xl px-4 py-4 mb-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-apple-red flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <p className="text-callout font-bold text-apple-red">Critical Alert</p>
                {critAlerts.slice(0,2).map((a,i) => (
                  <p key={i} className="text-subhead text-apple-red/90 mt-1">{a.message}</p>
                ))}
              </div>
            </div>
            <button
              onClick={() => window.open('https://wa.me/?text='+encodeURIComponent(`Hi Dr, ${parent?.profile?.name} has a critical health alert. Can we schedule an urgent consultation?`), '_blank')}
              className="mt-3 w-full py-2.5 rounded-ios text-white font-semibold text-callout"
              style={{background:'linear-gradient(135deg,#25D366,#128C7E)'}}>
              💬 WhatsApp Doctor Now
            </button>
          </div>
        )}

        {/* Patient being monitored */}
        {parent?.profile && (
          <div className="bg-white rounded-ios-2xl shadow-card-md px-5 py-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold shadow-btn flex-shrink-0">
                {parent.profile.name?.[0] || '?'}
              </div>
              <div className="flex-1">
                <p className="text-title-3 font-bold text-black">{parent.profile.name}</p>
                {parent.profile.age && <p className="text-callout text-sys-label3">Age {parent.profile.age}</p>}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"/>
                  <span className="text-caption-1 text-primary font-semibold">Live</span>
                </div>
                <p className="text-caption-2 text-sys-label3 mt-0.5">Updated {relTime}</p>
                {!demo && (
                  <button onClick={loadMyData}
                    className="mt-1 flex items-center gap-1 text-caption-1 text-apple-blue font-semibold ml-auto">
                    <RefreshCw size={11}/> Refresh
                  </button>
                )}
              </div>
            </div>

            {/* Warnings summary */}
            {warnAlerts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-sys-sep">
                <p className="text-caption-1 font-bold text-orange-600 mb-1.5">
                  ⚠️ {warnAlerts.length} alert{warnAlerts.length>1?'s':''} today
                </p>
                {warnAlerts.slice(0,2).map((a,i)=>(
                  <p key={i} className="text-footnote text-orange-700 mt-0.5">{a.message}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live Vitals Grid */}
        <p className="section-header px-0 pt-0 pb-2">Live Vitals</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <VitalCard
            label="Glucose" icon="🩸"
            value={glucose?.value} unit="mg/dL"
            normalLow={bl.glucose?.low||70} normalHigh={bl.glucose?.high||140} critHigh={200}
            history={(parent?.readings?.glucose||[]).map(r=>r.value)}
            source={glucose?.source} time={fmtTime(glucose)}
          />
          <VitalCard
            label="Heart Rate" icon="❤️"
            value={hr?.value} unit="bpm"
            normalLow={bl.heart_rate?.low||50} normalHigh={bl.heart_rate?.high||100} critHigh={120}
            history={(parent?.readings?.heart_rate||[]).map(r=>r.value)}
            source={hr?.source} time={fmtTime(hr)}
          />
          <VitalCard
            label="Blood Pressure" icon="💉"
            value={bp?.value} unit="mmHg"
            normalLow={bl.blood_pressure?.low||90} normalHigh={bl.blood_pressure?.high||130} critHigh={160}
            history={(parent?.readings?.blood_pressure||[]).map(r=>r.value)}
            source={bp?.source} time={fmtTime(bp)}
          />
          <VitalCard
            label="SpO₂" icon="💫"
            value={spo2?.value} unit="%"
            normalLow={95} normalHigh={100} critHigh={100}
            history={(parent?.readings?.spo2||[]).map(r=>r.value)}
            source={spo2?.source} time={fmtTime(spo2)}
          />
        </div>

        {/* Sleep */}
        {sleep && (
          <div className="bg-white rounded-ios-xl shadow-card px-4 py-4 mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-ios bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">💤</span>
            </div>
            <div className="flex-1">
              <p className="text-callout font-bold text-black">Last Night's Sleep</p>
              <p className="text-footnote text-sys-label3">
                ⌚ SimpleMed Band · {fmtTime(sleep) || ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-title-3 font-bold"
                style={{color: sleep.value < 6 ? '#FF9500' : sleep.value > 9 ? '#FF9500' : '#34C759'}}>
                {sleep.value} hrs
              </p>
              <p className="text-caption-1"
                style={{color: sleep.value < 6 ? '#FF9500' : '#34C759'}}>
                {sleep.value < 6 ? 'Too Short' : sleep.value > 9 ? 'Too Long' : 'Good Sleep'}
              </p>
            </div>
          </div>
        )}

        {/* Alert History */}
        {alerts.length > 0 && (
          <>
            <p className="section-header px-0 pt-0 pb-2">Alert History (24h)</p>
            <div className="bg-white rounded-ios-xl shadow-card mb-5 overflow-hidden">
              {alerts.slice(0,5).map((a,i) => {
                const time = new Date(a.created_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
                return (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-sys-sep last:border-0">
                    <AlertTriangle size={16} className={`flex-shrink-0 mt-0.5 ${a.severity==='critical'?'text-apple-red':'text-orange-500'}`}/>
                    <div className="flex-1">
                      <p className="text-callout font-semibold text-black">{a.message}</p>
                      <p className="text-footnote text-sys-label3 mt-0.5">{time}</p>
                    </div>
                    <span className={`text-caption-2 font-bold px-2 py-0.5 rounded-full flex-shrink-0
                      ${a.severity==='critical'?'text-apple-red bg-red-50':'text-orange-600 bg-orange-50'}`}>
                      {a.severity}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Share / Book consultation */}
        <p className="section-header px-0 pt-0 pb-2">Actions</p>
        <div className="space-y-2.5 mb-5">
          {/* Share monitor link */}
          <div className="bg-white rounded-ios-xl shadow-card px-4 py-4">
            <p className="text-callout font-bold text-black mb-1">Share Monitor Access</p>
            <p className="text-footnote text-sys-label3 mb-3">
              Give family members a link to watch vitals in real time — no app needed
            </p>
            {monitorLink ? (
              <div className="bg-sys-fill rounded-ios px-3 py-2 mb-2">
                <p className="text-caption-1 font-mono text-sys-label2 break-all">{monitorLink}</p>
              </div>
            ) : null}
            <div className="flex gap-2">
              <button onClick={copyLink}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-ios
                           bg-primary text-white text-subhead font-semibold shadow-btn active:scale-95 transition-transform">
                {copied ? <><Check size={15}/> Copied!</> : <><Copy size={15}/> Copy Link</>}
              </button>
              <button onClick={() => {
                const link = monitorLink || `${window.location.origin}/monitor/link`
                const text = encodeURIComponent(`Hi, I'm sharing ${parent?.profile?.name||'my'} health monitor link.\n\nYou can watch vitals live here:\n${link}\n\nPowered by MediSimple`)
                window.open(`https://wa.me/?text=${text}`, '_blank')
              }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-ios
                           text-white text-subhead font-semibold shadow-btn active:scale-95 transition-transform"
                style={{background:'linear-gradient(135deg,#25D366,#128C7E)'}}>
                💬 WhatsApp
              </button>
            </div>
          </div>

          {/* Book consultation */}
          <button
            onClick={() => window.open('https://wa.me/?text='+encodeURIComponent(`Hello Doctor,\n\nI need to schedule a consultation for ${parent?.profile?.name||'my patient'}.\n\nHealth summary:\n• Glucose: ${glucose?.value||'—'} mg/dL\n• Heart Rate: ${hr?.value||'—'} bpm\n• BP: ${bp?.value||'—'} mmHg\n\nPowered by MediSimple`), '_blank')}
            className="w-full flex items-center gap-3 bg-white rounded-ios-xl shadow-card px-4 py-4
                       active:bg-sys-fill transition-colors text-left">
            <div className="w-10 h-10 rounded-ios bg-apple-blue-light flex items-center justify-center flex-shrink-0">
              <Calendar size={20} className="text-apple-blue"/>
            </div>
            <div className="flex-1">
              <p className="text-callout font-bold text-black">Book Consultation</p>
              <p className="text-footnote text-sys-label3">Alert doctor with current vitals via WhatsApp</p>
            </div>
            <ChevronRight size={16} className="text-sys-label4"/>
          </button>

          {/* Call parent */}
          <button
            onClick={() => { if (!demo) alert('Feature coming soon — will auto-call family in crisis'); }}
            className="w-full flex items-center gap-3 bg-white rounded-ios-xl shadow-card px-4 py-4
                       active:bg-sys-fill transition-colors text-left">
            <div className="w-10 h-10 rounded-ios bg-green-50 flex items-center justify-center flex-shrink-0">
              <Phone size={20} className="text-green-600"/>
            </div>
            <div className="flex-1">
              <p className="text-callout font-bold text-black">Emergency Call</p>
              <p className="text-footnote text-sys-label3">Auto-calls when vitals go critical</p>
            </div>
            <span className="text-caption-2 font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
              Coming soon
            </span>
          </button>
        </div>

        <div className="h-4"/>
      </div>

      {/* Invite sheet */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={()=>setShowInvite(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in"/>
          <div className="relative bg-sys-bg rounded-t-ios-3xl shadow-float max-w-lg mx-auto w-full animate-slide-up"
            onClick={e=>e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-sys-sep rounded-full"/>
            </div>
            <div className="px-5 pt-3 pb-2 flex items-center justify-between">
              <h2 className="text-title-3 font-bold text-black">Invite Family Member</h2>
              <button onClick={()=>setShowInvite(false)}
                className="w-8 h-8 rounded-full bg-sys-fill flex items-center justify-center">
                <X size={16} className="text-sys-label2"/>
              </button>
            </div>
            <p className="px-5 text-callout text-sys-label3 mb-4">
              They'll get a link to watch your vitals live — no login needed.
            </p>
            <div className="px-5 space-y-3 pb-4">
              <div className="input-group">
                <div className="input-row">
                  <span className="text-subhead text-sys-label3 w-20 flex-shrink-0">Name</span>
                  <input className="flex-1 bg-transparent text-callout text-black placeholder-sys-label3 outline-none"
                    placeholder="e.g. Priya (Daughter)"
                    value={inviteName} onChange={e=>setInviteName(e.target.value)}/>
                </div>
                <div className="input-row">
                  <span className="text-subhead text-sys-label3 w-20 flex-shrink-0">Email</span>
                  <input className="flex-1 bg-transparent text-callout text-black placeholder-sys-label3 outline-none"
                    type="email" placeholder="priya@gmail.com"
                    value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} autoFocus/>
                </div>
              </div>
            </div>
            <div className="px-5 pb-3 grid grid-cols-2 gap-3">
              <button onClick={()=>setShowInvite(false)} className="btn-ghost border border-sys-sep rounded-ios-xl">Cancel</button>
              <button onClick={sendInvite} disabled={inviting||!inviteEmail.trim()} className="btn-primary">
                {inviteDone ? <><Check size={16}/> Invited!</> : inviting ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
            <div className="pb-8"/>
          </div>
        </div>
      )}
    </div>
  )
}
