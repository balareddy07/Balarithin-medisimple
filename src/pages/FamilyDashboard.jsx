import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { track } from '../lib/analytics'
import { Plus, ChevronRight, X, Users } from 'lucide-react'

const RELATIONS = ['Spouse','Father','Mother','Son','Daughter','Brother','Sister','Grandfather','Grandmother','Other']

const REL_AVATAR = {
  Spouse:'👫', Father:'👨', Mother:'👩', Son:'👦', Daughter:'👧',
  Brother:'🧑', Sister:'👧', Grandfather:'👴', Grandmother:'👵', Other:'🧑',
}

const REL_COLOR = {
  Spouse:['#FF2D55','#FFF0F3'], Father:['#007AFF','#EBF4FF'], Mother:['#AF52DE','#F6EFFE'],
  Son:['#34C759','#E8F8ED'], Daughter:['#FF9500','#FFF4E0'], Brother:['#30B0C7','#E8F8FD'],
  Sister:['#FF2D55','#FFF0F3'], Grandfather:['#8E8E93','#F2F2F7'], Grandmother:['#5856D6','#EEEFFE'],
  Other:['#8E8E93','#F2F2F7'],
}

export default function FamilyDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [members, setMembers]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [reportCounts, setReportCounts] = useState({})
  const [showAdd, setShowAdd]         = useState(false)
  const [form, setForm]               = useState({ name: '', age: '', relation: 'Spouse' })
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    fetchMembers()
  }, [user])

  async function fetchMembers() {
    setLoading(true)
    const { data } = await supabase.from('family_members').select('*').eq('user_id', user.id).order('created_at')
    setMembers(data || [])
    if (data?.length) {
      const counts = {}
      await Promise.all(data.map(async m => {
        const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('family_member_id', m.id)
        counts[m.id] = count || 0
      }))
      setReportCounts(counts)
    }
    track('family_dashboard_viewed', { members: (data || []).length })
    setLoading(false)
  }

  async function addMember() {
    if (!form.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('family_members').insert({
      user_id: user.id, name: form.name.trim(),
      age: form.age ? parseInt(form.age) : null, relation: form.relation,
    }).select().single()
    if (!error && data) {
      track('family_member_added', { relation: form.relation })
      setMembers(p => [...p, data])
      setReportCounts(p => ({ ...p, [data.id]: 0 }))
    }
    setForm({ name: '', age: '', relation: 'Spouse' })
    setShowAdd(false)
    setSaving(false)
  }

  async function removeMember(id, e) {
    e.stopPropagation()
    if (!confirm('Remove this family member and their reports?')) return
    await supabase.from('reports').delete().eq('family_member_id', id)
    await supabase.from('family_members').delete().eq('id', id)
    setMembers(p => p.filter(m => m.id !== id))
  }

  const initials = profile?.name ? profile.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="pt-6 pb-5 flex items-start justify-between">
          <div>
            <h1 className="text-title-1 font-bold text-black">Family</h1>
            <p className="text-callout text-sys-label3 mt-0.5">Manage health for your whole family</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-btn active:scale-90 transition-transform"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>

        {/* Self card */}
        <p className="section-header px-0 pt-0 pb-2">Primary Account</p>
        <div className="list-group mb-4">
          <Link to="/my-reports" className="list-row">
            <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white font-bold text-[15px] flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-callout font-semibold text-black truncate">{profile?.name || 'You'}</p>
              <p className="text-footnote text-sys-label3 mt-0.5">Age {profile?.age || '—'} · Primary</p>
            </div>
            <div className="text-right flex-shrink-0 mr-2">
              <p className="text-footnote font-semibold text-primary">My Reports</p>
            </div>
            <ChevronRight size={16} className="text-sys-label4" />
          </Link>
        </div>

        {/* Members */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="loader-dots text-primary"><span/><span/><span/></div>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16">
            <div className="w-20 h-20 rounded-ios-2xl bg-primary-light flex items-center justify-center text-4xl mb-5 shadow-card">
              👨‍👩‍👧
            </div>
            <h2 className="text-title-3 font-bold text-black mb-2">No family members yet</h2>
            <p className="text-callout text-sys-label3 mb-6 max-w-xs leading-relaxed">
              Add your family members to manage their health reports separately
            </p>
            <button onClick={() => setShowAdd(true)} className="btn-primary px-8">
              <Plus size={17} /> Add Family Member
            </button>
          </div>
        ) : (
          <>
            <p className="section-header px-0 pt-0 pb-2">Family Members</p>
            <div className="list-group">
              {members.map(m => {
                const [color, bg] = REL_COLOR[m.relation] || ['#8E8E93','#F2F2F7']
                return (
                  <button
                    key={m.id}
                    onClick={() => navigate('/my-reports', { state: { familyMemberId: m.id, name: m.name } })}
                    className="list-row w-full text-left"
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: bg }}
                    >
                      {REL_AVATAR[m.relation] || '🧑'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-callout font-semibold text-black truncate">{m.name}</p>
                      <p className="text-footnote text-sys-label3 mt-0.5">
                        {m.relation} {m.age ? `· Age ${m.age}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-caption-1 font-semibold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
                        {reportCounts[m.id] || 0} reports
                      </span>
                      <button
                        onClick={e => removeMember(m.id, e)}
                        className="w-6 h-6 flex items-center justify-center text-sys-label4 hover:text-apple-red transition-colors"
                      >
                        <X size={14} />
                      </button>
                      <ChevronRight size={16} className="text-sys-label4" />
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Member Sheet */}
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

            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h2 className="text-title-3 font-bold text-black">Add Family Member</h2>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full bg-sys-fill flex items-center justify-center">
                <X size={16} className="text-sys-label2" />
              </button>
            </div>

            <div className="px-5 space-y-3 pb-4">
              <div className="input-group">
                <div className="input-row">
                  <span className="text-subhead text-sys-label3 w-20 flex-shrink-0">Name</span>
                  <input
                    className="flex-1 bg-transparent text-callout text-black placeholder-sys-label3 outline-none"
                    placeholder="e.g. Priya Kumar"
                    value={form.name}
                    onChange={e => setForm(f => ({...f, name: e.target.value}))}
                    autoFocus
                  />
                </div>
                <div className="input-row">
                  <span className="text-subhead text-sys-label3 w-20 flex-shrink-0">Relation</span>
                  <select
                    className="flex-1 bg-transparent text-callout text-black outline-none appearance-none"
                    value={form.relation}
                    onChange={e => setForm(f => ({...f, relation: e.target.value}))}
                  >
                    {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronRight size={14} className="text-sys-label4" />
                </div>
                <div className="input-row">
                  <span className="text-subhead text-sys-label3 w-20 flex-shrink-0">Age</span>
                  <input
                    className="flex-1 bg-transparent text-callout text-black placeholder-sys-label3 outline-none"
                    type="number" min="0" max="120" placeholder="Optional"
                    value={form.age}
                    onChange={e => setForm(f => ({...f, age: e.target.value}))}
                  />
                </div>
              </div>
            </div>

            <div className="px-5 pb-3 grid grid-cols-2 gap-3">
              <button onClick={() => setShowAdd(false)} className="btn-ghost border border-sys-sep rounded-ios-xl">Cancel</button>
              <button onClick={addMember} disabled={saving || !form.name.trim()} className="btn-primary">
                {saving ? 'Adding…' : 'Add Member'}
              </button>
            </div>
            <div className="pb-8" />
          </div>
        </div>
      )}
    </div>
  )
}
