import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { track } from '../lib/analytics'
import { Share2, BookmarkCheck, Copy, Check, ChevronRight } from 'lucide-react'

// Parse the structured summary into sections
function parseSummary(text) {
  const sections = []
  const lines = text.split('\n')
  let current = null

  for (const raw of lines) {
    const line = raw.replace(/\*\*/g, '').trim()
    if (!line) continue

    const isHeader = /^[📋🔍📌💬⚠️]/.test(line)
    if (isHeader) {
      if (current) sections.push(current)
      current = { header: line, items: [] }
    } else if (current) {
      current.items.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}

const SECTION_STYLES = {
  '📋': { bg: 'bg-apple-blue-light',  border: 'border-apple-blue/20',  hdr: 'text-apple-blue' },
  '🔍': { bg: 'bg-primary-light',     border: 'border-primary/20',     hdr: 'text-primary-dark' },
  '📌': { bg: 'bg-orange-50',         border: 'border-orange-200',     hdr: 'text-orange-600' },
  '💬': { bg: 'bg-indigo-50',         border: 'border-indigo-200',     hdr: 'text-apple-indigo' },
  '⚠️': { bg: 'bg-yellow-50',        border: 'border-yellow-200',     hdr: 'text-yellow-700' },
}

function getSectionStyle(header) {
  for (const key of Object.keys(SECTION_STYLES)) {
    if (header.startsWith(key)) return SECTION_STYLES[key]
  }
  return { bg: 'bg-sys-bg', border: 'border-sys-sep', hdr: 'text-black' }
}

export default function AISummary() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const [saved, setSaved]   = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (state?.summary) track('ai_summary_viewed', { sections: parseSummary(state.summary).length })
  }, [])

  if (!state?.summary) {
    return (
      <div className="min-h-screen bg-sys-bg flex flex-col items-center justify-center px-6 text-center pt-nav pb-safe">
        <div className="text-6xl mb-5 animate-float-up">🤔</div>
        <h2 className="text-title-2 font-bold text-black mb-2">No summary yet</h2>
        <p className="text-callout text-sys-label3 mb-8 leading-relaxed">
          Upload a medical report first to get your AI summary.
        </p>
        <Link to="/upload" className="btn-primary px-8">Upload Report</Link>
      </div>
    )
  }

  const { summary, patientName, reportId } = state
  const sections = parseSummary(summary)

  const handleSave = () => {
    track('ai_summary_saved')
    setSaved(true)
    setTimeout(() => navigate('/my-reports'), 1200)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary.replace(/\*\*/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleWhatsApp = () => {
    track('ai_summary_shared', { channel: 'whatsapp' })
    const text = encodeURIComponent(
      `My MediSimple Health Report${patientName ? ` — ${patientName}` : ''}\n\n` +
      summary.replace(/\*\*/g, '').slice(0, 900) +
      '\n\n— MediSimple'
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="pt-6 pb-4 flex items-start gap-4">
          <div className="w-14 h-14 rounded-ios-xl bg-primary flex items-center justify-center shadow-btn flex-shrink-0">
            <span className="text-2xl">✨</span>
          </div>
          <div>
            <h1 className="text-title-2 font-bold text-black">AI Summary</h1>
            {patientName && <p className="text-callout text-sys-label3 mt-0.5">For {patientName}</p>}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3 mb-5">
          {sections.map((sec, i) => {
            const style = getSectionStyle(sec.header)
            return (
              <div
                key={i}
                className={`rounded-ios-xl border p-4 ${style.bg} ${style.border} animate-fade-in`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <h3 className={`text-headline font-bold mb-2 ${style.hdr}`}>{sec.header}</h3>
                <div className="space-y-1.5">
                  {sec.items.map((item, j) => (
                    <p key={j} className="text-callout text-black leading-relaxed">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-ios-xl px-4 py-3.5 mb-6">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <p className="text-subhead text-yellow-800 font-medium leading-relaxed">
            Please consult your doctor before making any medical decisions. This summary is for educational purposes only.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleSave} className="btn-primary py-3.5">
              {saved
                ? <><Check size={17} /> Saved!</>
                : <><BookmarkCheck size={17} /> Save Report</>}
            </button>
            <button
              onClick={() => navigate('/doctor-share', { state: { reportId } })}
              className="btn-blue py-3.5"
            >
              <Share2 size={17} /> Doctor
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopy}
              className="bg-white shadow-card rounded-ios-xl py-3.5 flex items-center justify-center gap-2
                         text-callout font-semibold text-black active:bg-sys-fill transition-colors"
            >
              {copied ? <><Check size={16} className="text-primary"/> Copied</> : <><Copy size={16} /> Copy</>}
            </button>
            <button
              onClick={handleWhatsApp}
              className="rounded-ios-xl py-3.5 flex items-center justify-center gap-2
                         text-callout font-semibold text-white active:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}
            >
              💬 WhatsApp
            </button>
          </div>
        </div>

        <div className="text-center pb-2">
          <Link to="/upload" className="text-apple-blue text-subhead font-medium active:opacity-60 transition-opacity">
            ← Upload another report
          </Link>
        </div>
      </div>
    </div>
  )
}
