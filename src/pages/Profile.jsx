import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Check, LogOut, ChevronRight } from 'lucide-react'

const LANGUAGES = [
  { code:'en', label:'English',   flag:'🇺🇸' },
  { code:'hi', label:'हिंदी',      flag:'🇮🇳' },
  { code:'te', label:'తెలుగు',     flag:'🇮🇳' },
  { code:'ta', label:'தமிழ்',      flag:'🇮🇳' },
  { code:'kn', label:'ಕನ್ನಡ',      flag:'🇮🇳' },
  { code:'ml', label:'മലയാളം',     flag:'🇮🇳' },
  { code:'mr', label:'मराठी',      flag:'🇮🇳' },
  { code:'bn', label:'বাংলা',      flag:'🇮🇳' },
  { code:'gu', label:'ગુજરાતી',    flag:'🇮🇳' },
  { code:'pa', label:'ਪੰਜਾਬੀ',     flag:'🇮🇳' },
  { code:'es', label:'Español',   flag:'🇺🇸' },
]

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]     = useState({ name:'', age:'', phone:'', preferred_language:'en' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [stats, setStats]   = useState({ reports:0, family:0 })

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    if (profile) setForm({ name:profile.name||'', age:profile.age||'', phone:profile.phone||'', preferred_language:profile.preferred_language||'en' })
    Promise.all([
      supabase.from('reports').select('*',{count:'exact',head:true}).eq('user_id',user.id),
      supabase.from('family_members').select('*',{count:'exact',head:true}).eq('user_id',user.id),
    ]).then(([r,f]) => setStats({ reports:r.count||0, family:f.count||0 }))
  }, [user, profile])

  async function save() {
    setSaving(true)
    await supabase.from('profiles').upsert({ id:user.id, name:form.name, age:form.age?parseInt(form.age):null, phone:form.phone, preferred_language:form.preferred_language })
    setSaving(false); setSaved(true); refreshProfile()
    setTimeout(() => setSaved(false), 2500)
  }

  const initials = form.name ? form.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Avatar */}
        <div className="pt-8 pb-6 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold shadow-card-md mb-4">
            {initials}
          </div>
          <h1 className="text-title-2 font-bold text-black">{form.name || 'Your Profile'}</h1>
          <p className="text-subhead text-sys-label3 mt-0.5">{user?.email}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="card text-center py-5">
            <p className="text-[34px] font-bold text-primary leading-none">{stats.reports}</p>
            <p className="text-footnote text-sys-label3 mt-2">Reports Saved</p>
          </div>
          <div className="card text-center py-5">
            <p className="text-[34px] font-bold text-apple-blue leading-none">{stats.family}</p>
            <p className="text-footnote text-sys-label3 mt-2">Family Members</p>
          </div>
        </div>

        {/* Personal details */}
        <p className="section-header px-0 pt-0 pb-2">Personal Details</p>
        <div className="input-group mb-4">
          {[
            { label:'Name',  type:'text',   ph:'Your full name',  val:form.name,  k:'name'  },
            { label:'Age',   type:'number', ph:'Your age',        val:form.age,   k:'age'   },
            { label:'Phone', type:'tel',    ph:'+1 (555) 123-4567', val:form.phone, k:'phone' },
          ].map(({label,type,ph,val,k}) => (
            <div key={k} className="input-row">
              <span className="text-subhead text-sys-label3 w-16 flex-shrink-0">{label}</span>
              <input className="flex-1 bg-transparent text-callout text-black placeholder-sys-label3 outline-none"
                type={type} placeholder={ph} value={val} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
            </div>
          ))}
        </div>

        {/* Language */}
        <p className="section-header px-0 pt-0 pb-2">Summary Language</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {LANGUAGES.map(l => (
            <button key={l.code}
              onClick={() => setForm(f=>({...f, preferred_language:l.code}))}
              className={`flex items-center gap-1.5 px-2.5 py-2.5 rounded-ios text-footnote font-medium
                          border-2 transition-all duration-150 active:scale-95 select-none
                          ${form.preferred_language===l.code
                            ? 'border-primary bg-primary text-white shadow-btn'
                            : 'border-transparent bg-white text-black shadow-card'}`}
            >
              <span className="text-base leading-none">{l.flag}</span>
              <span className="truncate">{l.label}</span>
            </button>
          ))}
        </div>

        <button onClick={save} disabled={saving} className="btn-primary w-full py-4 text-headline mb-5">
          {saved ? <><Check size={18}/> Saved!</> : saving ? 'Saving…' : 'Save Profile'}
        </button>

        {/* Privacy */}
        <p className="section-header px-0 pt-0 pb-2">Privacy & Security</p>
        <div className="list-group mb-4">
          {['🔒 All health data encrypted at rest','🚫 Never sold to third parties','🔗 Shared with doctor only by you','🗑️ Delete account anytime'].map(t => (
            <div key={t} className="input-row pointer-events-none">
              <p className="text-subhead text-sys-label2">{t}</p>
            </div>
          ))}
        </div>

        {/* Links */}
        <p className="section-header px-0 pt-0 pb-2">More</p>
        <div className="list-group mb-4">
          {[
            { to:'/my-reports', icon:'📋', label:'My Reports',        color:'text-apple-blue', bg:'bg-apple-blue-light' },
            { to:'/family',     icon:'👨‍👩‍👧', label:'Family Dashboard', color:'text-primary',    bg:'bg-primary-light'    },
            { to:'/whatsapp-bot',icon:'💬',label:'WhatsApp Bot',      color:'text-[#25D366]',  bg:'bg-green-50'         },
          ].map(({to,icon,label,color,bg}) => (
            <Link key={to} to={to} className="list-row">
              <div className={`list-icon ${bg} ${color}`}>{icon}</div>
              <span className="flex-1 text-callout font-medium text-black">{label}</span>
              <ChevronRight size={16} className="text-sys-label4" />
            </Link>
          ))}
        </div>

        <div className="list-group mb-8">
          <button onClick={async()=>{await signOut();navigate('/')}} className="list-row w-full text-left">
            <div className="list-icon bg-red-50 text-apple-red"><LogOut size={17}/></div>
            <span className="flex-1 text-callout font-medium text-apple-red">Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  )
}
