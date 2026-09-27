import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Check, X } from 'lucide-react'

const STATUS_FILTER = ['All', 'Current', 'Stopped']

const DEMO_MEDS = [
  { id:'m1', name:'Aspirin 75mg',      dose:'75mg',  frequency:'Once daily',  status:'active',  doctor_name:'Sharma',  prescribed_date:'2025-11-20' },
  { id:'m2', name:'Atorvastatin 40mg', dose:'40mg',  frequency:'Bedtime',     status:'active',  doctor_name:'Sharma',  prescribed_date:'2025-11-20' },
  { id:'m3', name:'Metformin 500mg',   dose:'500mg', frequency:'Twice daily', status:'active',  doctor_name:'Sharma',  prescribed_date:'2025-11-20' },
  { id:'m4', name:'Ramipril 5mg',      dose:'5mg',   frequency:'Once daily',  status:'active',  doctor_name:'Sharma',  prescribed_date:'2025-11-20' },
  { id:'m5', name:'Clopidogrel 75mg',  dose:'75mg',  frequency:'Once daily',  status:'active',  doctor_name:'Sharma',  prescribed_date:'2025-11-20' },
  { id:'m6', name:'Metoprolol 25mg',   dose:'25mg',  frequency:'Twice daily', status:'stopped', doctor_name:'Patel',   prescribed_date:'2025-06-10' },
  { id:'m7', name:'Losartan 50mg',     dose:'50mg',  frequency:'Once daily',  status:'stopped', doctor_name:'Patel',   prescribed_date:'2025-06-10' },
]

export default function Medications() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [demo, setDemo]       = useState(false)
  const [meds, setMeds]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ name: '', dose: '', frequency: '', doctor_name: '' })
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!user) {
      setMeds(DEMO_MEDS)
      setDemo(true)
      setLoading(false)
      return
    }
    load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setMeds(data || [])
    setLoading(false)
  }

  async function toggleStatus(id, current) {
    if (demo) { setMeds(p => p.map(m => m.id === id ? { ...m, status: current === 'active' ? 'stopped' : 'active' } : m)); return }
    const next = current === 'active' ? 'stopped' : 'active'
    await supabase.from('medications').update({ status: next }).eq('id', id)
    setMeds(p => p.map(m => m.id === id ? { ...m, status: next } : m))
  }

  async function addManual() {
    if (!form.name.trim()) return
    if (demo) { alert('Sign in to add medications to your real health record.'); return }
    setSaving(true)
    const { data, error } = await supabase.from('medications').insert({
      user_id: user.id,
      name: form.name.trim(),
      dose: form.dose.trim(),
      frequency: form.frequency.trim(),
      doctor_name: form.doctor_name.trim(),
      prescribed_date: new Date().toISOString().split('T')[0],
      status: 'active',
    }).select().single()
    if (!error && data) setMeds(p => [data, ...p])
    setForm({ name: '', dose: '', frequency: '', doctor_name: '' })
    setShowAdd(false)
    setSaving(false)
  }

  async function remove(id) {
    if (demo) return
    if (!confirm('Remove this medication?')) return
    await supabase.from('medications').delete().eq('id', id)
    setMeds(p => p.filter(m => m.id !== id))
  }

  const visible = meds.filter(m => {
    if (filter === 'Current') return m.status === 'active'
    if (filter === 'Stopped') return m.status === 'stopped'
    return true
  })

  const activeCnt  = meds.filter(m => m.status === 'active').length
  const stoppedCnt = meds.filter(m => m.status === 'stopped').length

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="pt-6 pb-4 flex items-start justify-between">
          <div>
            <h1 className="text-title-1 font-bold text-black">Medications</h1>
            <p className="text-callout text-sys-label3 mt-0.5">
              {activeCnt} current · {stoppedCnt} stopped
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-btn
                       active:scale-90 transition-transform"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>

        {/* Demo banner */}
        {demo && (
          <div className="bg-orange-50 border border-orange-200 rounded-ios-xl px-4 py-3 mb-4">
            <p className="text-subhead text-orange-800 leading-relaxed">
              👁️ <strong>Demo Mode</strong> — Viewing sample data.{' '}
              <Link to="/auth" className="underline font-semibold">Sign in</Link> to see your real medications.
            </p>
          </div>
        )}

        {/* Info banner */}
        {!demo && (
          <div className="bg-primary-light border border-primary/20 rounded-ios-xl px-4 py-3 mb-5">
            <p className="text-subhead text-primary-dark leading-relaxed">
              💊 Medications are auto-extracted from uploaded reports. You can also add them manually.
            </p>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {STATUS_FILTER.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2.5 rounded-ios text-subhead font-semibold transition-all duration-150
                          active:scale-95 select-none
                          ${filter === f
                            ? 'bg-primary text-white shadow-btn'
                            : 'bg-white text-sys-label2 shadow-card'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-ios-xl shadow-card px-4 py-4 flex gap-3">
                <div className="skeleton w-10 h-10 rounded-ios flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-3 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20">
            <div className="text-6xl mb-4">💊</div>
            <h2 className="text-title-3 font-bold text-black mb-2">
              {filter === 'All' ? 'No medications yet' : `No ${filter.toLowerCase()} medications`}
            </h2>
            <p className="text-callout text-sys-label3 mb-6 max-w-xs leading-relaxed">
              {filter === 'All'
                ? 'Upload a prescription or add medications manually'
                : 'Medications will appear here once extracted from your reports'}
            </p>
            {filter === 'All' && (
              <div className="flex gap-3">
                <Link to="/upload" className="btn-primary px-6">Upload Report</Link>
                <button onClick={() => setShowAdd(true)} className="btn-outline px-6">Add Manually</button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {visible.map(med => (
              <div key={med.id} className="bg-white rounded-ios-xl shadow-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className={`w-11 h-11 rounded-ios flex items-center justify-center flex-shrink-0
                    ${med.status === 'active' ? 'bg-primary-light' : 'bg-sys-fill'}`}>
                    <span className="text-xl">💊</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-callout font-bold truncate
                        ${med.status === 'active' ? 'text-black' : 'text-sys-label3 line-through'}`}>
                        {med.name}
                      </p>
                      <span className={`text-caption-2 font-bold px-2 py-0.5 rounded-full flex-shrink-0
                        ${med.status === 'active'
                          ? 'text-green-700 bg-green-50'
                          : 'text-sys-label3 bg-sys-fill'}`}>
                        {med.status === 'active' ? 'Current' : 'Stopped'}
                      </span>
                    </div>
                    <p className="text-footnote text-sys-label3 mt-0.5">
                      {[med.dose, med.frequency].filter(Boolean).join(' · ')}
                    </p>
                    {med.doctor_name && (
                      <p className="text-caption-1 text-sys-label3 mt-0.5">Dr. {med.doctor_name}</p>
                    )}
                    {med.prescribed_date && (
                      <p className="text-caption-1 text-sys-label3">
                        Since {new Date(med.prescribed_date).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleStatus(med.id, med.status)}
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors
                        ${med.status === 'active'
                          ? 'text-sys-label3 hover:text-orange-500 hover:bg-orange-50'
                          : 'text-primary hover:bg-primary-light'}`}
                      title={med.status === 'active' ? 'Mark as stopped' : 'Mark as current'}
                    >
                      {med.status === 'active' ? <X size={16} /> : <Check size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Send to pharmacy CTA */}
        {activeCnt > 0 && (
          <Link to="/pharmacy"
            className="mt-5 flex items-center justify-center gap-2 py-3.5 rounded-ios-xl
                       bg-orange-50 border border-orange-200 text-orange-700 font-semibold text-callout
                       active:bg-orange-100 transition-colors">
            🏪 Send prescription to pharmacy
          </Link>
        )}

        <div className="h-4" />
      </div>

      {/* Add Medication Sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            className="relative bg-sys-bg rounded-t-ios-3xl shadow-float max-w-lg mx-auto w-full animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-sys-sep rounded-full" />
            </div>
            <div className="px-5 pt-3 pb-3 flex items-center justify-between">
              <h2 className="text-title-3 font-bold text-black">Add Medication</h2>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full bg-sys-fill flex items-center justify-center">
                <X size={16} className="text-sys-label2" />
              </button>
            </div>

            <div className="px-5 space-y-3 pb-4">
              <div className="input-group">
                {[
                  { key: 'name',        label: 'Medicine',  placeholder: 'e.g. Aspirin'        },
                  { key: 'dose',        label: 'Dose',      placeholder: 'e.g. 75mg'            },
                  { key: 'frequency',   label: 'When',      placeholder: 'e.g. Once daily'      },
                  { key: 'doctor_name', label: 'Doctor',    placeholder: 'e.g. Dr. Sharma (optional)' },
                ].map(f => (
                  <div key={f.key} className="input-row">
                    <span className="text-subhead text-sys-label3 w-20 flex-shrink-0">{f.label}</span>
                    <input
                      className="flex-1 bg-transparent text-callout text-black placeholder-sys-label3 outline-none"
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 pb-3 grid grid-cols-2 gap-3">
              <button onClick={() => setShowAdd(false)} className="btn-ghost border border-sys-sep rounded-ios-xl">Cancel</button>
              <button onClick={addManual} disabled={saving || !form.name.trim()} className="btn-primary">
                {saving ? 'Adding…' : 'Add'}
              </button>
            </div>
            <div className="pb-8" />
          </div>
        </div>
      )}
    </div>
  )
}
