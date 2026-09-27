import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { generateShareToken } from '../lib/encryption'
import { track } from '../lib/analytics'
import { Copy, Check, Lock, Clock, ChevronDown } from 'lucide-react'

export default function DoctorShare() {
  const { user } = useAuth()
  const { state } = useLocation()
  const navigate  = useNavigate()

  const [reports, setReports]         = useState([])
  const [selectedReport, setSelected] = useState(state?.reportId || '')
  const [expiry, setExpiry]           = useState('24')
  const [link, setLink]               = useState('')
  const [generating, setGenerating]   = useState(false)
  const [copied, setCopied]           = useState(false)
  const [reportOpen, setReportOpen]   = useState(false)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    supabase.from('reports').select('id, patient_name, created_at').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setReports(data || []))
  }, [user])

  const selectedMeta = reports.find(r => r.id === selectedReport)

  async function generateLink() {
    if (!selectedReport) return
    setGenerating(true)
    const token = generateShareToken()
    const expiresAt = new Date(Date.now() + parseInt(expiry) * 3_600_000).toISOString()
    const { error } = await supabase.from('doctor_shares').insert({
      report_id: selectedReport, encrypted_token: token, expires_at: expiresAt,
    })
    if (!error) {
      setLink(`${window.location.origin}/share/${token}`)
      track('doctor_link_created', { expiry_hours: parseInt(expiry) })
    }
    setGenerating(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function shareWhatsApp() {
    track('doctor_link_shared', { channel: 'whatsapp' })
    const name = selectedMeta?.patient_name || 'Patient'
    const text = encodeURIComponent(
      `Hello Doctor,\n\nI'm sharing my medical report summary via MediSimple (secure, encrypted):\n\n${link}\n\nValid for ${expiry} hours only.\nPatient: ${name}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  function shareEmail() {
    track('doctor_link_shared', { channel: 'email' })
    const name = selectedMeta?.patient_name || 'Patient'
    window.open(
      `mailto:?subject=Medical Report — ${name} (MediSimple)&body=Hello Doctor,%0A%0APlease find my medical report summary here:%0A%0A${link}%0A%0AThis link expires in ${expiry} hours.%0A%0AThank you`,
      '_blank'
    )
  }

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="pt-6 pb-5">
          <h1 className="text-title-1 font-bold text-black">Share with Doctor</h1>
          <p className="text-callout text-sys-label3 mt-1">Generate an encrypted, time-limited link</p>
        </div>

        {/* Security banner */}
        <div className="flex items-center gap-3 bg-primary-light border border-primary/20 rounded-ios-xl px-4 py-3.5 mb-5">
          <div className="w-9 h-9 rounded-ios bg-primary flex items-center justify-center flex-shrink-0">
            <Lock size={17} className="text-white" />
          </div>
          <p className="text-subhead text-primary-dark font-medium leading-relaxed">
            <strong>End-to-end encrypted.</strong> The link auto-expires. No one else can view it.
          </p>
        </div>

        {/* Select report */}
        <p className="section-header px-0 pt-0 pb-2">Select Report</p>
        <div className="relative mb-4">
          <button
            onClick={() => setReportOpen(!reportOpen)}
            className="w-full bg-white rounded-ios-xl shadow-card px-4 py-3.5 flex items-center gap-3
                       active:bg-sys-fill transition-colors select-none"
          >
            <span className="text-xl">📋</span>
            <span className={`flex-1 text-callout text-left ${selectedMeta ? 'text-black font-medium' : 'text-sys-label3'}`}>
              {selectedMeta
                ? `${selectedMeta.patient_name} — ${new Date(selectedMeta.created_at).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' })}`
                : 'Choose a report…'}
            </span>
            <ChevronDown size={16} className={`text-sys-label3 transition-transform ${reportOpen ? 'rotate-180' : ''}`} />
          </button>
          {reportOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-ios-xl shadow-card-lg z-20 overflow-hidden animate-scale-in max-h-56 overflow-y-auto">
              {reports.map(r => (
                <button
                  key={r.id}
                  onClick={() => { setSelected(r.id); setReportOpen(false); setLink('') }}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left border-b border-sys-sep last:border-0 transition-colors
                              ${selectedReport === r.id ? 'bg-primary-light' : 'hover:bg-sys-fill'}`}
                >
                  <span className="text-lg">📋</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-callout font-medium truncate ${selectedReport === r.id ? 'text-primary' : 'text-black'}`}>
                      {r.patient_name}
                    </p>
                    <p className="text-caption-1 text-sys-label3">
                      {new Date(r.created_at).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' })}
                    </p>
                  </div>
                  {selectedReport === r.id && <span className="text-primary">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Expiry */}
        <p className="section-header px-0 pt-0 pb-2">Link Expiry</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {['24','48'].map(h => (
            <button
              key={h}
              onClick={() => { setExpiry(h); setLink('') }}
              className={`py-4 rounded-ios-xl flex flex-col items-center gap-1 font-semibold border-2
                          transition-all duration-150 active:scale-95 select-none
                          ${expiry === h
                            ? 'border-primary bg-primary text-white shadow-btn'
                            : 'border-transparent bg-white text-black shadow-card'}`}
            >
              <Clock size={20} />
              <span className="text-headline">{h} Hours</span>
              <span className={`text-caption-1 ${expiry === h ? 'text-white/80' : 'text-sys-label3'}`}>
                {h === '24' ? 'Standard' : 'Extended'}
              </span>
            </button>
          ))}
        </div>

        {!link ? (
          <button
            onClick={generateLink}
            disabled={!selectedReport || generating}
            className="btn-primary w-full py-4 text-headline"
          >
            {generating
              ? <><div className="loader-dots text-white"><span/><span/><span/></div> Generating…</>
              : '🔐 Generate Encrypted Link'}
          </button>
        ) : (
          <div className="space-y-3 animate-slide-up">
            {/* Link display */}
            <div className="bg-white rounded-ios-xl shadow-card px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock size={13} className="text-primary" />
                <span className="text-caption-1 font-semibold text-primary uppercase tracking-wide">
                  Secure Link · Expires in {expiry} hours
                </span>
              </div>
              <p className="text-subhead font-mono text-sys-label2 break-all leading-relaxed">{link}</p>
            </div>

            <button onClick={copyLink} className="btn-outline w-full py-3.5">
              {copied ? <><Check size={17} className="text-primary" /> Copied to clipboard!</> : <><Copy size={17} /> Copy Link</>}
            </button>

            <button
              onClick={shareWhatsApp}
              className="w-full py-3.5 rounded-ios-xl flex items-center justify-center gap-2
                         text-white font-semibold text-callout active:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}
            >
              💬 Share via WhatsApp
            </button>

            <button
              onClick={shareEmail}
              className="w-full py-3.5 rounded-ios-xl flex items-center justify-center gap-2
                         bg-white shadow-card text-callout font-semibold text-black
                         active:bg-sys-fill transition-colors"
            >
              📧 Share via Email
            </button>

            <button onClick={() => { setLink(''); setSelected('') }} className="w-full text-sys-label3 text-subhead py-2">
              Generate new link
            </button>
          </div>
        )}
        <div className="h-4" />
      </div>
    </div>
  )
}
