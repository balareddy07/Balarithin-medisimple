import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Clock, AlertCircle } from 'lucide-react'

export default function DoctorView() {
  const { token } = useParams()
  const [status, setStatus]           = useState('loading')
  const [summary, setSummary]         = useState('')
  const [patientName, setPatientName] = useState('')
  const [expiresAt, setExpiresAt]     = useState(null)

  useEffect(() => {
    async function load() {
      if (!token) { setStatus('invalid'); return }
      const { data: share } = await supabase
        .from('doctor_shares')
        .select('*, reports(patient_name, summary, language)')
        .eq('encrypted_token', token)
        .single()
      if (!share) { setStatus('invalid'); return }
      if (new Date(share.expires_at) < new Date()) { setStatus('expired'); return }
      await supabase.from('doctor_shares').update({ accessed_at: new Date().toISOString() }).eq('id', share.id)
      setPatientName(share.reports?.patient_name || 'Patient')
      setSummary(share.reports?.summary || '')
      setExpiresAt(share.expires_at)
      setStatus('valid')
    }
    load()
  }, [token])

  const lines = summary.replace(/\*\*/g, '').split('\n').filter(l => l.trim())
  const hoursLeft = expiresAt
    ? Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 3_600_000))
    : 0

  if (status === 'loading') return (
    <div className="min-h-screen bg-sys-bg flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-ios-2xl bg-primary flex items-center justify-center shadow-btn animate-pulse">
        <span className="text-3xl">💊</span>
      </div>
      <p className="text-callout text-sys-label3 font-medium">Verifying secure link…</p>
    </div>
  )

  if (status === 'expired') return (
    <div className="min-h-screen bg-sys-bg flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-4xl mb-6 animate-spring-pop">
        ⏰
      </div>
      <h1 className="text-title-1 font-bold text-black mb-2">Link Expired</h1>
      <p className="text-callout text-sys-label3 mb-6 max-w-xs leading-relaxed">
        This link is no longer valid. Ask your patient to generate a new one from the MediSimple app.
      </p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-ios-xl px-5 py-4 max-w-xs">
        <p className="text-subhead text-yellow-800 leading-relaxed">
          For security, MediSimple links expire after 24–48 hours to protect patient health data.
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
        This link is invalid or has already expired. Please ask your patient to share a new link.
      </p>
    </div>
  )

  return (
    <div className="min-h-screen bg-sys-bg">
      {/* Doctor navbar */}
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

      <div className="max-w-lg mx-auto px-4 pt-5 pb-16 page">

        {/* Patient banner */}
        <div className="flex items-center gap-3 bg-primary-light border border-primary/20 rounded-ios-xl px-4 py-3.5 mb-5">
          <div className="w-9 h-9 rounded-ios bg-primary flex items-center justify-center flex-shrink-0">
            <Lock size={17} className="text-white" />
          </div>
          <div>
            <p className="text-subhead font-semibold text-primary-dark">
              Shared by <strong>{patientName}</strong>
            </p>
            <p className="text-caption-1 text-primary/80 mt-0.5">Encrypted · Auto-expires in {hoursLeft} hours</p>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-3 mb-5">
          {lines.map((line, i) => {
            const isHeader = /^[📋🔍📌💬⚠️]/.test(line)
            if (isHeader) {
              return (
                <h3 key={i} className="text-headline font-bold text-black mt-4 first:mt-0 flex items-center gap-2">
                  {line}
                </h3>
              )
            }
            return (
              <p key={i} className="text-callout text-black leading-relaxed">
                {line}
              </p>
            )
          })}
        </div>

        {/* Doctor note */}
        <div className="flex items-start gap-3 bg-apple-blue-light border border-apple-blue/20 rounded-ios-xl px-4 py-4 mb-6">
          <AlertCircle size={18} className="text-apple-blue flex-shrink-0 mt-0.5" />
          <p className="text-subhead text-apple-blue leading-relaxed">
            <strong>Note for Doctor:</strong> This is an AI-generated plain-language summary to help the patient understand their report. Please refer to original documents for clinical decisions.
          </p>
        </div>

        <p className="text-center text-caption-1 text-sys-label3">
          Powered by <span className="font-semibold text-primary">MediSimple</span> · Free health literacy for every patient
        </p>
      </div>
    </div>
  )
}
