import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { decrypt } from '../lib/encryption'
import { ChevronRight, Search, Plus, Trash2, Share2 } from 'lucide-react'

const LANG_LABELS = {
  en:'English', hi:'हिंदी', te:'తెలుగు', ta:'தமிழ்',
  kn:'ಕನ್ನಡ', ml:'മലയാളം', mr:'मराठी', bn:'বাংলা',
  gu:'ગુજરાતી', pa:'ਪੰਜਾਬੀ', es:'Español',
}

function SkeletonCard() {
  return (
    <div className="card flex items-center gap-3">
      <div className="skeleton w-11 h-11 rounded-ios flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    </div>
  )
}

export default function MyReports() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const filterFamilyId   = location.state?.familyMemberId
  const filterFamilyName = location.state?.name

  const [reports, setReports]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [expandedId, setExpanded] = useState(null)
  const [decrypted, setDecrypted] = useState({})

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    fetchReports()
  }, [user])

  async function fetchReports() {
    setLoading(true)
    let q = supabase
      .from('reports')
      .select('id, patient_name, language, created_at, family_members(name, relation)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (filterFamilyId) q = q.eq('family_member_id', filterFamilyId)
    const { data } = await q
    setReports(data || [])
    setLoading(false)
  }

  async function expand(report) {
    if (expandedId === report.id) { setExpanded(null); return }
    setExpanded(report.id)
    if (decrypted[report.id]) return
    const { data } = await supabase.from('reports').select('summary').eq('id', report.id).single()
    if (data?.summary) {
      try {
        const plain = await decrypt(data.summary, user.id)
        setDecrypted(p => ({ ...p, [report.id]: plain }))
      } catch {
        setDecrypted(p => ({ ...p, [report.id]: '(Could not decrypt — please re-upload)' }))
      }
    }
  }

  async function del(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this report?')) return
    await supabase.from('reports').delete().eq('id', id)
    setReports(p => p.filter(r => r.id !== id))
    if (expandedId === id) setExpanded(null)
  }

  const filtered = reports.filter(r =>
    r.patient_name?.toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = d => new Date(d).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="pt-6 pb-4 flex items-start justify-between">
          <div>
            <h1 className="text-title-1 font-bold text-black">
              {filterFamilyName ? `${filterFamilyName}'s Reports` : 'My Reports'}
            </h1>
            <p className="text-callout text-sys-label3 mt-0.5">
              {reports.length} report{reports.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link to="/upload"
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-btn active:scale-90 transition-transform">
            <Plus size={20} className="text-white" />
          </Link>
        </div>

        {/* Ask my reports */}
        {!loading && reports.length > 0 && (
          <Link
            to="/ask-reports"
            className="btn-primary w-full py-3.5 text-headline mb-4 flex items-center justify-center gap-2"
          >
            <span>💬</span> Ask my reports
          </Link>
        )}

        {/* Search */}
        {reports.length > 2 && (
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sys-label3" />
            <input
              className="w-full bg-white rounded-ios-xl shadow-card pl-10 pr-4 py-3
                         text-callout text-black placeholder-sys-label3 outline-none
                         focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3 pt-2">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-5 animate-float-up">📭</div>
            <h2 className="text-title-3 font-bold text-black mb-2">No reports yet</h2>
            <p className="text-callout text-sys-label3 mb-8 max-w-xs leading-relaxed">
              Upload your first medical report to get a free AI summary
            </p>
            <Link to="/upload" className="btn-primary px-8">Upload Report</Link>
          </div>
        )}

        {/* List */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-2.5">
            {filtered.map(report => (
              <div
                key={report.id}
                className="bg-white rounded-ios-xl shadow-card overflow-hidden active:scale-[0.99] transition-transform"
              >
                {/* Row */}
                <button
                  onClick={() => expand(report)}
                  className="w-full px-4 py-4 flex items-center gap-3 text-left"
                >
                  <div className="w-11 h-11 rounded-ios bg-primary-light flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📋</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-headline font-semibold text-black truncate">
                        {report.patient_name || 'Patient'}
                      </span>
                      {report.family_members?.name && (
                        <span className="pill pill-blue">{report.family_members.name}</span>
                      )}
                    </div>
                    <p className="text-footnote text-sys-label3 mt-0.5">
                      {formatDate(report.created_at)} · {LANG_LABELS[report.language] || report.language}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={e => del(report.id, e)}
                      className="w-7 h-7 flex items-center justify-center rounded-full
                                 text-sys-label4 hover:text-apple-red hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight
                      size={16}
                      className={`text-sys-label4 transition-transform duration-200 ${expandedId === report.id ? 'rotate-90' : ''}`}
                    />
                  </div>
                </button>

                {/* Expanded */}
                {expandedId === report.id && (
                  <div className="px-4 pb-4 border-t border-sys-sep animate-fade-in">
                    <div className="pt-3">
                      {decrypted[report.id] ? (
                        <p className="text-subhead text-black leading-relaxed whitespace-pre-line max-h-56 overflow-y-auto">
                          {decrypted[report.id].replace(/\*\*/g, '')}
                        </p>
                      ) : (
                        <div className="py-4 flex justify-center">
                          <div className="loader-dots text-primary"><span/><span/><span/></div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-sys-sep">
                        <Link
                          to="/doctor-share"
                          state={{ reportId: report.id }}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-apple-blue text-subhead font-semibold"
                        >
                          <Share2 size={14} /> Share with Doctor
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
