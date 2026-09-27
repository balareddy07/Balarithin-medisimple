import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Clock, AlertCircle } from 'lucide-react'

function statusColor(status) {
  if (status === 'critical') return { text: '#FF3B30', bg: '#FFF1F0' }
  if (status === 'high')     return { text: '#FF9500', bg: '#FFF8F0' }
  if (status === 'low')      return { text: '#007AFF', bg: '#EBF4FF' }
  return                            { text: '#34C759', bg: '#E8F8ED' }
}

export default function FullRecordView() {
  const { token } = useParams()
  const [status, setStatus]     = useState('loading')
  const [share, setShare]       = useState(null)
  const [metrics, setMetrics]   = useState([])
  const [meds, setMeds]         = useState([])
  const [cardiac, setCardiac]   = useState([])
  const [profile, setProfile]   = useState(null)
  const [expiresAt, setExpiresAt] = useState(null)

  useEffect(() => {
    async function load() {
      if (!token) { setStatus('invalid'); return }

      const { data: shareData } = await supabase
        .from('full_record_shares')
        .select('*')
        .eq('encrypted_token', token)
        .single()

      if (!shareData) { setStatus('invalid'); return }
      if (new Date(shareData.expires_at) < new Date()) { setStatus('expired'); return }

      await supabase.from('full_record_shares')
        .update({ accessed_at: new Date().toISOString() })
        .eq('id', shareData.id)

      setShare(shareData)
      setExpiresAt(shareData.expires_at)

      const userId = shareData.user_id
      const [profileRes, metricsRes, medsRes, cardiacRes] = await Promise.all([
        supabase.from('profiles').select('name, age').eq('id', userId).single(),
        supabase.from('health_metrics').select('*').eq('user_id', userId).order('recorded_date', { ascending: false }),
        supabase.from('medications').select('*').eq('user_id', userId).eq('status', 'active').order('name'),
        supabase.from('cardiac_records').select('*').eq('user_id', userId).order('recorded_date', { ascending: false }),
      ])

      setProfile(profileRes.data)
      setMeds(medsRes.data || [])
      setCardiac(cardiacRes.data || [])

      // Latest metric per name
      const seen = new Set()
      const latest = []
      for (const m of (metricsRes.data || [])) {
        if (!seen.has(m.name)) { seen.add(m.name); latest.push(m) }
      }
      setMetrics(latest)
      setStatus('valid')
    }
    load()
  }, [token])

  const hoursLeft = expiresAt
    ? Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 3_600_000))
    : 0

  if (status === 'loading') return (
    <div className="min-h-screen bg-sys-bg flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-ios-2xl bg-primary flex items-center justify-center shadow-btn animate-pulse">
        <span className="text-3xl">💊</span>
      </div>
      <p className="text-callout text-sys-label3 font-medium">Loading health record…</p>
    </div>
  )

  if (status === 'expired') return (
    <div className="min-h-screen bg-sys-bg flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-4xl mb-6">⏰</div>
      <h1 className="text-title-1 font-bold text-black mb-2">Link Expired</h1>
      <p className="text-callout text-sys-label3 mb-6 max-w-xs leading-relaxed">
        This link is no longer valid. Ask your patient to generate a new one from the MediSimple app.
      </p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-ios-xl px-5 py-4 max-w-xs">
        <p className="text-subhead text-yellow-800 leading-relaxed">
          For security, MediSimple links expire after 48 hours to protect patient health data.
        </p>
      </div>
    </div>
  )

  if (status === 'invalid') return (
    <div className="min-h-screen bg-sys-bg flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
        <Lock size={36} className="text-apple-red" />
      </div>
      <h1 className="text-title-1 font-bold text-black mb-2">Invalid Link</h1>
      <p className="text-callout text-sys-label3 max-w-xs leading-relaxed">
        This link is invalid or has already been revoked. Please ask your patient to share a new link.
      </p>
    </div>
  )

  const CARDIAC_GOALS = [
    { metric: 'HbA1c', target: '< 6.0', targetVal: 6.0, unit: '%', label: 'HbA1c (Diabetes)' },
    { metric: 'LDL', target: '< 60', targetVal: 60, unit: 'mg/dL', label: 'LDL Cholesterol' },
    { metric: 'Triglycerides', target: '< 150', targetVal: 150, unit: 'mg/dL', label: 'Triglycerides' },
    { metric: 'Systolic BP', target: '< 130', targetVal: 130, unit: 'mmHg', label: 'Systolic BP' },
  ]

  return (
    <div className="min-h-screen bg-sys-bg">
      {/* Navbar */}
      <div className="glass border-b border-black/5 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-ios flex items-center justify-center shadow-sm">
            <span className="text-base">💊</span>
          </div>
          <span className="font-bold text-[17px] text-black">MediSimple</span>
          <div className="ml-auto flex items-center gap-1.5 text-caption-1 text-sys-label3">
            <Clock size={12} />
            <span>{hoursLeft}h remaining</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-16">

        {/* Patient Banner */}
        <div className="flex items-center gap-3 bg-primary-light border border-primary/20 rounded-ios-xl px-4 py-3.5 mb-5">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-btn">
            <span className="text-lg">🧑‍⚕️</span>
          </div>
          <div>
            <p className="text-callout font-bold text-primary-dark">
              {profile?.name || 'Patient'}{profile?.age ? `, Age ${profile.age}` : ''}
            </p>
            <p className="text-caption-1 text-primary/80 mt-0.5">
              Complete Health Record · Encrypted · Expires in {hoursLeft}h
            </p>
          </div>
        </div>

        {/* Doctor disclaimer */}
        <div className="flex items-start gap-3 bg-apple-blue-light border border-apple-blue/20 rounded-ios-xl px-4 py-4 mb-6">
          <AlertCircle size={18} className="text-apple-blue flex-shrink-0 mt-0.5" />
          <p className="text-subhead text-apple-blue leading-relaxed">
            <strong>Note for Doctor:</strong> This record was auto-extracted by MediSimple AI from patient-uploaded reports.
            Please refer to original documents for clinical decisions.
          </p>
        </div>

        {/* Cardiac Goals */}
        {metrics.length > 0 && (
          <>
            <p className="text-caption-1 font-bold text-sys-label2 uppercase tracking-wide mb-2">
              Cardiac Management Goals
            </p>
            <div className="bg-white rounded-ios-xl shadow-card mb-5 overflow-hidden">
              {CARDIAC_GOALS.map(goal => {
                const m = metrics.find(x => x.name === goal.metric)
                if (!m) return (
                  <div key={goal.metric} className="flex items-center gap-3 px-4 py-3 border-b border-sys-sep last:border-0">
                    <span className="flex-1 text-callout font-semibold text-black">{goal.label}</span>
                    <span className="text-caption-1 text-sys-label3">Target: {goal.target} {goal.unit}</span>
                    <span className="text-caption-1 text-sys-label3 bg-sys-fill px-2 py-0.5 rounded-full">No data</span>
                  </div>
                )
                const val = parseFloat(m.value) || 0
                const ok = val < goal.targetVal
                return (
                  <div key={goal.metric} className="flex items-center gap-3 px-4 py-3 border-b border-sys-sep last:border-0">
                    <div className="flex-1">
                      <p className="text-callout font-semibold text-black">{goal.label}</p>
                      <p className="text-footnote text-sys-label3">Target: {goal.target} {goal.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-callout font-bold" style={{ color: ok ? '#34C759' : '#FF3B30' }}>
                        {m.value} {goal.unit}
                      </p>
                      <p className="text-caption-2 font-semibold" style={{ color: ok ? '#34C759' : '#FF3B30' }}>
                        {ok ? '✅ On target' : '🔴 Off target'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* All Metrics */}
        {metrics.length > 0 && (
          <>
            <p className="text-caption-1 font-bold text-sys-label2 uppercase tracking-wide mb-2">
              Lab Values
            </p>
            <div className="bg-white rounded-ios-xl shadow-card mb-5 overflow-hidden">
              {metrics.map(m => {
                const sc = statusColor(m.status)
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-sys-sep last:border-0">
                    <div className="flex-1">
                      <p className="text-callout font-semibold text-black">{m.name}</p>
                      {m.normal_range && <p className="text-footnote text-sys-label3">Normal: {m.normal_range}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-callout font-bold" style={{ color: sc.text }}>
                        {m.value} {m.unit}
                      </p>
                      <span className="text-caption-2 font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: sc.text, background: sc.bg }}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Cardiac Findings */}
        {cardiac.length > 0 && (
          <>
            <p className="text-caption-1 font-bold text-sys-label2 uppercase tracking-wide mb-2">
              Cardiac Findings
            </p>
            <div className="bg-white rounded-ios-xl shadow-card mb-5 overflow-hidden">
              {cardiac.map(c => (
                <div key={c.id} className="px-4 py-3 border-b border-sys-sep last:border-0">
                  {c.artery && <p className="text-caption-1 font-bold text-sys-label2 uppercase">{c.artery}</p>}
                  <p className="text-callout text-black">{c.finding_text}</p>
                  {c.has_stent && (
                    <span className="text-caption-2 font-semibold text-orange-600 bg-orange-50
                                     px-2 py-0.5 rounded-full mt-1 inline-block">Stent Placed</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Medications */}
        {meds.length > 0 && (
          <>
            <p className="text-caption-1 font-bold text-sys-label2 uppercase tracking-wide mb-2">
              Current Medications
            </p>
            <div className="bg-white rounded-ios-xl shadow-card mb-5 overflow-hidden">
              {meds.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-sys-sep last:border-0">
                  <span className="text-xl flex-shrink-0">💊</span>
                  <div className="flex-1">
                    <p className="text-callout font-semibold text-black">{m.name}</p>
                    <p className="text-footnote text-sys-label3">{[m.dose, m.frequency].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {metrics.length === 0 && meds.length === 0 && cardiac.length === 0 && (
          <div className="flex flex-col items-center text-center py-12">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-title-3 font-bold text-black mb-2">No health data yet</h2>
            <p className="text-callout text-sys-label3 max-w-xs leading-relaxed">
              The patient has not uploaded any reports yet or no data was extracted. Ask them to upload a blood test or prescription in MediSimple.
            </p>
          </div>
        )}

        <p className="text-center text-caption-1 text-sys-label3 mt-4">
          Powered by <span className="font-semibold text-primary">MediSimple</span> · Free health literacy for every patient
        </p>
      </div>
    </div>
  )
}
