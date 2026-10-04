import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { reportError } from '../lib/telemetry'
import { MessageCircleQuestion, Send, FileText, Loader2 } from 'lucide-react'

const EXAMPLES = [
  'What was my HbA1c in the last report?',
  'Which medications were mentioned across my reports?',
  'Summarise my cholesterol readings over time.',
]

export default function AskReports() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const language = profile?.preferred_language || 'en'

  const [reportCount, setReportCount] = useState(null)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { found, answer, citations }

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setReportCount(count ?? 0))
  }, [user])

  const ask = async (q) => {
    const query = (q ?? question).trim()
    if (!query || loading) return
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ question: query, language }),
      })
      if (!res.ok) throw new Error(`ask_reports_${res.status}`)
      setResult(await res.json())
    } catch (err) {
      reportError(err, { flow: 'ask_reports' })
      setError('Could not search your reports right now. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="pt-6 pb-5">
          <h1 className="text-title-1 font-bold text-black flex items-center gap-2">
            <MessageCircleQuestion size={26} className="text-primary" />
            Ask my reports
          </h1>
          <p className="text-callout text-sys-label3 mt-1">
            Answers come only from your uploaded reports, with sources shown.
          </p>
        </div>

        {/* No reports yet */}
        {reportCount === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-6xl mb-5">📭</div>
            <h2 className="text-title-3 font-bold text-black mb-2">No reports to search yet</h2>
            <p className="text-callout text-sys-label3 mb-8 max-w-xs leading-relaxed">
              Upload a medical report first — it gets indexed automatically, then you can ask anything about it.
            </p>
            <Link to="/upload" className="btn-primary px-8">Upload Report</Link>
          </div>
        )}

        {reportCount > 0 && (
          <>
            {/* Question box */}
            <div className="bg-white rounded-ios-xl shadow-card overflow-hidden mb-4">
              <textarea
                className="w-full px-4 py-4 text-callout text-black placeholder-sys-label3 outline-none resize-none min-h-[96px] bg-transparent"
                placeholder="Ask about your reports… e.g. What was my HbA1c?"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
              />
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-sys-sep">
                <span className="text-caption-1 text-sys-label3">
                  {reportCount} report{reportCount !== 1 ? 's' : ''} indexed
                </span>
                <button
                  onClick={() => ask()}
                  disabled={loading || !question.trim()}
                  className="flex items-center gap-1.5 bg-primary text-white text-subhead font-semibold
                             rounded-ios px-5 py-2 active:scale-95 transition-transform
                             disabled:opacity-40 disabled:active:scale-100"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Ask
                </button>
              </div>
            </div>

            {/* Example prompts */}
            {!result && !loading && (
              <div className="mb-4">
                <p className="section-header px-0 pt-0 pb-2">Try asking</p>
                <div className="space-y-2">
                  {EXAMPLES.map(ex => (
                    <button
                      key={ex}
                      onClick={() => { setQuestion(ex); ask(ex) }}
                      className="w-full text-left bg-white rounded-ios-lg shadow-card px-4 py-3
                                 text-subhead text-sys-label2 active:scale-[0.99] transition-transform"
                    >
                      “{ex}”
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-ios-lg px-4 py-3 mb-4">
                <p className="text-subhead text-apple-red">{error}</p>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-ios-xl shadow-card px-4 py-8 mb-4 flex flex-col items-center gap-3">
                <div className="loader-dots text-primary"><span /><span /><span /></div>
                <p className="text-subhead text-sys-label3">Searching your reports…</p>
              </div>
            )}

            {/* Answer */}
            {result && !loading && (
              <div className="mb-4 animate-fade-in">
                {!result.found ? (
                  <div className="bg-white rounded-ios-xl shadow-card px-4 py-6 text-center">
                    <p className="text-headline font-semibold text-black mb-1">Not in your reports</p>
                    <p className="text-subhead text-sys-label3 leading-relaxed">
                      I couldn't find anything about that in your uploaded reports. Try rephrasing, or upload the report that has it.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-ios-xl shadow-card px-4 py-4 mb-3">
                      <p className="text-callout text-black leading-relaxed whitespace-pre-line">
                        {result.answer}
                      </p>
                    </div>

                    {/* Citations */}
                    {result.citations?.length > 0 && (
                      <div className="mb-3">
                        <p className="section-header px-0 pt-1 pb-2">
                          Sources · {result.citations.length}
                        </p>
                        <div className="space-y-2">
                          {result.citations.map(c => (
                            <div key={c.n} className="bg-white rounded-ios-lg shadow-card px-4 py-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-6 h-6 rounded-full bg-primary-light text-primary
                                                 text-caption-1 font-bold flex items-center justify-center flex-shrink-0">
                                  {c.n}
                                </span>
                                <FileText size={14} className="text-sys-label3 flex-shrink-0" />
                                <span className="text-subhead font-semibold text-black truncate">
                                  {c.reportName}
                                </span>
                                <span className="text-caption-1 text-sys-label3 ml-auto flex-shrink-0">
                                  {c.reportDate}
                                </span>
                              </div>
                              <p className="text-footnote text-sys-label2 leading-relaxed">
                                …{c.excerpt}…
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Safety note */}
            <p className="text-center text-caption-1 text-sys-label3 pb-2 leading-relaxed">
              🔍 Answers are looked up from your own reports only — never from general AI knowledge.<br />
              Not a diagnosis. Always verify with a healthcare professional.
            </p>
          </>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
