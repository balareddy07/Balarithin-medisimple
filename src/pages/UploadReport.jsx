import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { encrypt } from '../lib/encryption'
import { track } from '../lib/analytics'
import { reportError } from '../lib/telemetry'
import { Camera, Upload, FileText, ChevronDown, X, CheckCircle } from 'lucide-react'

const LANGUAGES = [
  { code: 'en', label: 'English',   flag: '🇺🇸' },
  { code: 'hi', label: 'हिंदी',      flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు',     flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்',      flag: '🇮🇳' },
  { code: 'kn', label: 'ಕನ್ನಡ',      flag: '🇮🇳' },
  { code: 'ml', label: 'മലയാളം',     flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी',      flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা',      flag: '🇮🇳' },
  { code: 'gu', label: 'ગુજરાતી',    flag: '🇮🇳' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ',     flag: '🇮🇳' },
  { code: 'es', label: 'Español',   flag: '🇺🇸' },
]

const MODES = [
  { id: 'paste',  Icon: FileText, label: 'Paste Text' },
  { id: 'file',   Icon: Upload,   label: 'Upload File' },
  { id: 'camera', Icon: Camera,   label: 'Camera' },
]

export default function UploadReport() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode]               = useState('paste')
  const [text, setText]               = useState('')
  const [file, setFile]               = useState(null)
  const [language, setLanguage]       = useState(profile?.preferred_language || 'en')
  const [familyMemberId, setFamilyMemberId] = useState('')
  const [familyMembers, setFamilyMembers]   = useState([])
  const [patientName, setPatientName] = useState(profile?.name || '')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [langOpen, setLangOpen]       = useState(false)
  const fileRef   = useRef()
  const cameraRef = useRef()

  useEffect(() => {
    if (!user) return
    supabase.from('family_members').select('*').eq('user_id', user.id).then(({ data }) => {
      if (data) setFamilyMembers(data)
    })
  }, [user])

  const selectedLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { setError('File too large. Max 10 MB.'); return }
    setFile(f)
    if (f.type === 'text/plain') {
      const reader = new FileReader()
      reader.onload = ev => setText(ev.target.result.slice(0, 20000))
      reader.readAsText(f)
    }
  }

  const getContent = async () => {
    if (mode === 'paste') return text
    if (!file) return ''
    if (file.type.startsWith('image/'))
      return `[IMAGE REPORT]\nFile: ${file.name}\nPatient: ${patientName}\nNote: Scanned report image.`
    if (file.type === 'text/plain') return text
    return `[Document Report]\nFile: ${file.name}\nPatient: ${patientName}`
  }

  const handleSummarise = async () => {
    if (!user) { navigate('/auth'); return }
    if (loading) return
    const content = await getContent()
    if (!content.trim() && !file) { setError('Please paste your report or upload a file.'); return }
    setError('')
    setLoading(true)
    track('report_uploaded', { mode, language })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ reportText: content, language }),
      })
      if (!res.ok) { reportError(new Error('summarize_api_error'), { status: res.status }); setError('AI service unavailable. Please try again.'); setLoading(false); return }
      const data = await res.json()
      await saveAndNavigate(content, data)
    } catch (err) {
      reportError(err, { flow: 'summarise' })
      setError('Connection error. Check your internet and retry.')
      setLoading(false)
    }
  }

  const saveAndNavigate = async (content, aiData) => {
    if (!user) return
    const { summary, extracted_metrics = [], extracted_medications = [], cardiac_findings = [] } = aiData
    const encContent = await encrypt(content, user.id)
    const encSummary = await encrypt(summary, user.id)
    const { data: report } = await supabase.from('reports').insert({
      user_id: user.id,
      family_member_id: familyMemberId || null,
      patient_name: patientName || profile?.name || 'Patient',
      original_content: encContent,
      summary: encSummary,
      language,
    }).select().single()

    // Save extracted health metrics
    if (report?.id && extracted_metrics.length > 0) {
      await supabase.from('health_metrics').insert(
        extracted_metrics.map(m => ({
          user_id: user.id,
          report_id: report.id,
          name: m.name,
          value: m.value,
          unit: m.unit || '',
          status: m.status || 'normal',
          normal_range: m.normal_range || '',
          recorded_date: new Date().toISOString().split('T')[0],
        }))
      ).catch(() => {})
    }

    // Save extracted medications (skip duplicates by name)
    if (report?.id && extracted_medications.length > 0) {
      const { data: existing } = await supabase
        .from('medications').select('name').eq('user_id', user.id).eq('status', 'active')
      const existingNames = new Set((existing || []).map(m => m.name.toLowerCase()))
      const newMeds = extracted_medications.filter(m => !existingNames.has(m.name.toLowerCase()))
      if (newMeds.length > 0) {
        await supabase.from('medications').insert(
          newMeds.map(m => ({
            user_id: user.id,
            report_id: report.id,
            name: m.name,
            dose: m.dose || '',
            frequency: m.frequency || '',
            prescribed_date: new Date().toISOString().split('T')[0],
            status: 'active',
          }))
        ).catch(() => {})
      }
    }

    // Save cardiac findings
    if (report?.id && cardiac_findings.length > 0) {
      await supabase.from('cardiac_records').insert(
        cardiac_findings.map(f => ({
          user_id: user.id,
          report_id: report.id,
          artery: f.artery || '',
          finding_text: f.finding_text || '',
          has_stent: f.has_stent || false,
          recorded_date: new Date().toISOString().split('T')[0],
        }))
      ).catch(() => {})
    }

    track('summary_generated', {
      language,
      metrics: extracted_metrics.length,
      medications: extracted_medications.length,
    })

    // Ask-my-reports RAG: index the plaintext for semantic search.
    // Fire-and-forget — the UI never waits on it. Only real pasted/typed
    // text is indexed (file/image placeholders start with "[").
    if (report?.id && content && !content.startsWith('[') && content.trim().length > 50) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ reportId: report.id, content: content.slice(0, 30000) }),
        }).catch(() => {})
      })
    }

    navigate('/summary', { state: { summary, language, patientName: patientName || profile?.name, reportId: report?.id } })
  }

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="pt-6 pb-5">
          <h1 className="text-title-1 font-bold text-black">Upload Report</h1>
          <p className="text-callout text-sys-label3 mt-1">Get an AI summary in plain, simple language</p>
        </div>

        {/* Patient name */}
        <p className="section-header px-0 pt-0 pb-2">Patient Name</p>
        <div className="input-group mb-4">
          <div className="input-row">
            <span className="text-lg">👤</span>
            <input
              className="flex-1 bg-transparent text-callout text-black placeholder-sys-label3 outline-none"
              placeholder="e.g. Rajesh Kumar"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
            />
          </div>
        </div>

        {/* Family member */}
        {familyMembers.length > 0 && (
          <>
            <p className="section-header px-0 pt-0 pb-2">Report For</p>
            <div className="input-group mb-4">
              <div className="input-row">
                <span className="text-lg">👨‍👩‍👧</span>
                <select
                  className="flex-1 bg-transparent text-callout text-black outline-none appearance-none"
                  value={familyMemberId}
                  onChange={e => setFamilyMemberId(e.target.value)}
                >
                  <option value="">Myself</option>
                  {familyMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.relation})</option>)}
                </select>
                <ChevronDown size={16} className="text-sys-label3 flex-shrink-0" />
              </div>
            </div>
          </>
        )}

        {/* Mode tabs */}
        <p className="section-header px-0 pt-0 pb-2">Input Method</p>
        <div className="flex gap-2 mb-4">
          {MODES.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => { setMode(id); setFile(null); setError('') }}
              className={`flex items-center justify-center gap-1.5 flex-1 py-3 rounded-ios text-subhead font-semibold
                          transition-all duration-150 active:scale-95 select-none
                          ${mode === id
                            ? 'bg-primary text-white shadow-btn'
                            : 'bg-white text-sys-label2 shadow-card'}`}
            >
              <Icon size={15} />
              <span className="hidden xs:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="mb-4">
          {mode === 'paste' && (
            <div className="bg-white rounded-ios-xl shadow-card overflow-hidden">
              <textarea
                className="w-full px-4 py-4 text-callout text-black placeholder-sys-label3
                           outline-none resize-none min-h-[180px] bg-transparent"
                placeholder={`Paste your medical report text here…\n\ne.g.\nBlood Sugar: 126 mg/dL\nHbA1c: 7.2%\nCholesterol: 210 mg/dL`}
                value={text}
                onChange={e => setText(e.target.value)}
              />
              {text && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-sys-sep">
                  <span className="text-caption-1 text-sys-label3">{text.length.toLocaleString()} characters</span>
                  <button onClick={() => setText('')} className="text-apple-red text-caption-1 font-medium">Clear</button>
                </div>
              )}
            </div>
          )}

          {(mode === 'file' || mode === 'camera') && (
            <button
              onClick={() => (mode === 'file' ? fileRef : cameraRef).current.click()}
              className={`w-full rounded-ios-xl border-2 border-dashed min-h-[180px]
                          flex flex-col items-center justify-center gap-3 transition-all duration-150
                          ${file
                            ? 'border-primary bg-primary-light'
                            : 'border-sys-sep bg-white hover:border-primary/40'}`}
            >
              {file ? (
                <>
                  <CheckCircle size={40} className="text-primary" />
                  <div className="text-center">
                    <p className="text-headline font-semibold text-black">{file.name}</p>
                    <p className="text-footnote text-sys-label3 mt-1">{(file.size / 1024).toFixed(0)} KB · Tap to change</p>
                  </div>
                </>
              ) : (
                <>
                  {mode === 'camera'
                    ? <Camera size={40} className="text-sys-label4" />
                    : <Upload size={40} className="text-sys-label4" />}
                  <div className="text-center">
                    <p className="text-headline font-semibold text-sys-label2">
                      {mode === 'camera' ? 'Take a photo' : 'Choose file'}
                    </p>
                    <p className="text-footnote text-sys-label3 mt-1">
                      {mode === 'camera' ? 'Hold camera over report' : 'PDF, JPG, PNG, TXT · Max 10 MB'}
                    </p>
                  </div>
                </>
              )}
              <input ref={fileRef}   type="file" accept=".pdf,.txt,.jpg,.jpeg,.png" className="hidden" onChange={handleFile} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            </button>
          )}
        </div>

        {/* Language picker */}
        <p className="section-header px-0 pt-0 pb-2">Summary Language</p>
        <div className="relative mb-6">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="w-full bg-white rounded-ios-xl shadow-card px-4 py-3.5 flex items-center gap-3
                       active:bg-sys-fill transition-colors select-none"
          >
            <span className="text-xl leading-none">{selectedLang.flag}</span>
            <span className="flex-1 text-callout font-medium text-black text-left">{selectedLang.label}</span>
            <ChevronDown size={16} className={`text-sys-label3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
          </button>
          {langOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-ios-xl shadow-card-lg
                            z-20 overflow-hidden animate-scale-in">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLanguage(l.code); setLangOpen(false) }}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left
                              border-b border-sys-sep last:border-0 transition-colors
                              ${language === l.code ? 'bg-primary-light' : 'hover:bg-sys-fill active:bg-sys-fill2'}`}
                >
                  <span className="text-xl leading-none">{l.flag}</span>
                  <span className={`text-callout font-medium ${language === l.code ? 'text-primary' : 'text-black'}`}>{l.label}</span>
                  {language === l.code && <span className="ml-auto text-primary">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-ios-lg px-4 py-3 mb-4">
            <span className="text-apple-red text-lg flex-shrink-0">⚠️</span>
            <p className="text-subhead text-apple-red">{error}</p>
          </div>
        )}

        <button
          onClick={handleSummarise}
          disabled={loading}
          className="btn-primary w-full py-4 text-headline mb-3"
        >
          {loading ? (
            <>
              <div className="loader-dots text-white"><span/><span/><span/></div>
              <span>Analysing your report…</span>
            </>
          ) : '✨ Summarise in Simple Language'}
        </button>

        <p className="text-center text-caption-1 text-sys-label3 pb-2">
          🔒 Encrypted end-to-end · Never shared without your permission
        </p>
      </div>
    </div>
  )
}
