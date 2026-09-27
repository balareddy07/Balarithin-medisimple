import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ArrowRight, Upload, Shield, Globe, Activity, Users, Pill, Store, Stethoscope, Smartphone, CheckCircle2, ChevronRight, Heart, Bell } from 'lucide-react'

const FEATURES = [
  { icon: Upload,       color: '#34C759', bg: '#E8F8ED', title: 'AI Report Analysis',       desc: 'Upload any lab or hospital report. Claude AI explains it in plain language in under 30 seconds.' },
  { icon: Globe,        color: '#007AFF', bg: '#EBF4FF', title: '11 Languages',             desc: 'Get summaries in Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi or Spanish.' },
  { icon: Activity,     color: '#FF6B35', bg: '#FFF4F0', title: 'Personal Baseline AI',     desc: 'Alerts based on YOUR own health history — not generic averages. Your normal, your rules.' },
  { icon: Store,        color: '#FF9500', bg: '#FFF7E6', title: 'Send to Pharmacy',         desc: 'Transfer prescriptions directly to CVS, Walgreens, Amazon Pharmacy and 5 more with one tap.' },
  { icon: Users,        color: '#AF52DE', bg: '#F5EEFF', title: 'Family Bridge',            desc: 'Watch over your parents\' health from anywhere — live vitals, smart alerts, and a weekly digest.' },
  { icon: Shield,       color: '#34C759', bg: '#E8F8ED', title: 'AES-256 Encrypted',       desc: 'Reports are encrypted on your device before storing. The server never reads your medical data.' },
]

const STEPS = [
  { n: '01', title: 'Upload your report',      desc: 'Paste text, upload a PDF or take a photo of the report with your camera.' },
  { n: '02', title: 'AI explains it simply',   desc: 'Claude AI reads it and returns a clear summary in your chosen language — instantly.' },
  { n: '03', title: 'Track, share & act',      desc: 'Save to your health passport, share with your doctor, or send medication to the pharmacy.' },
]

const DEVICES = [
  { emoji: '🩹', name: 'SimpleMed CGM',  desc: 'Continuous glucose monitor. NFC tap activation, BLE 5.0, personal baseline alerts.' },
  { emoji: '⌚', name: 'SimpleMed Band', desc: 'Health wristband. ECG, heart rate, SpO₂, sleep, skin temperature, haptic alerts.' },
]

const LANGS = ['English', 'हिंदी', 'తెలుగు', 'தமிழ்', 'ಕನ್ನಡ', 'മലയാളം', 'मराठी', 'বাংলা', 'ગુજરાતી', 'ਪੰਜਾਬੀ', 'Español']

export default function Home() {
  const { user, profile } = useAuth()
  const firstName = profile?.name?.split(' ')[0]

  const [monitored, setMonitored] = useState([])
  const [inviteToken, setInviteToken] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [loadingMonitored, setLoadingMonitored] = useState(false)

  useEffect(() => {
    if (user && profile?.role === 'family_member') {
      fetchMonitored()
    }
  }, [user, profile])

  async function fetchMonitored() {
    setLoadingMonitored(true)
    const { data: accesses } = await supabase.from('family_access').select('*')
    if (accesses?.length) {
      const list = []
      for (const acc of accesses) {
        const { data: parentProfile } = await supabase.from('profiles').select('*').eq('id', acc.parent_user_id).single()
        if (parentProfile) {
          const { data: vitals } = await supabase
            .from('vital_readings')
            .select('*')
            .eq('user_id', acc.parent_user_id)
            .order('recorded_at', { ascending: false })
            .limit(10)
          
          list.push({
            access: acc,
            profile: parentProfile,
            vitals: vitals || []
          })
        }
      }
      setMonitored(list)
    } else {
      setMonitored([])
    }
    setLoadingMonitored(false)
  }

  async function handleAcceptInvite(e) {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess('')
    if (!inviteToken.trim()) return

    const { data: accessRecord } = await supabase.from('family_access').select('*').eq('access_token', inviteToken.trim()).single()

    if (accessRecord) {
      await supabase.from('family_access').update({
        monitor_user_id: user.id,
        monitor_email: profile.email
      }).eq('id', accessRecord.id)

      const metrics = ['glucose', 'blood_pressure', 'heart_rate', 'spo2']
      for (const m of metrics) {
        await supabase.from('family_sharing_rules').insert({
          parent_user_id: accessRecord.parent_user_id,
          monitor_user_id: user.id,
          metric_type: m,
          allowed: true
        })
      }

      setInviteSuccess('Successfully linked to patient!')
      setInviteToken('')
      fetchMonitored()
    } else {
      setInviteError('Invalid invitation token. Please check and try again.')
    }
  }

  return (
    <div className="bg-white min-h-screen">

      {/* ── HERO ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-3xl mx-auto text-center">
          {user && firstName ? (
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Welcome back, {firstName}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              🇺🇸 Made for American families &nbsp;·&nbsp; 🌏 Watch over parents anywhere
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
            Your Health,<br />
            <span className="text-primary">Simply Explained.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            Upload any medical report and get a clear, plain-language summary — in your own language,
            encrypted end-to-end, free forever. Built for chronic-condition patients and the families
            who watch over them — even from the other side of the world.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {user ? (
              <>
                <Link to="/upload"
                  className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3.5 rounded-xl text-base transition-colors shadow-sm">
                  <Upload size={18} /> Upload a Report
                </Link>
                <Link to="/vitals"
                  className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 font-medium px-6 py-3.5 rounded-xl text-base transition-colors">
                  Live Monitor <ArrowRight size={16} />
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth?tab=signup"
                  className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3.5 rounded-xl text-base transition-colors shadow-sm">
                  Get Started Free <ArrowRight size={18} />
                </Link>
                <Link to="/vitals"
                  className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 font-medium px-6 py-3.5 rounded-xl text-base transition-colors">
                  View Live Demo
                </Link>
              </>
            )}
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-primary" /> AES-256 Encrypted</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-primary" /> Free Forever for Patients</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-primary" /> No Ads, No Data Selling</span>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything a patient needs</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">From understanding reports to ordering medications — one app, zero confusion.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: bg }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-gray-500 text-lg">Three steps from confusion to clarity.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <span className="text-primary font-bold text-lg">{n}</span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUICK ACTIONS (logged in) / CTA CARDS (logged out) ── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {user ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { to:'/upload',       emoji:'📤', label:'Upload Report',    sub:'Paste, file or camera' },
                  { to:'/medications',  emoji:'💊', label:'Medications',      sub:'View & manage meds' },
                  { to:'/pharmacy',     emoji:'🏪', label:'Send to Pharmacy', sub:'CVS, Walgreens & more' },
                  { to:'/consultation', emoji:'🩺', label:'Consultation Mode',sub:'Before your doctor visit' },
                  { to:'/my-reports',   emoji:'📄', label:'My Reports',       sub:'All saved summaries' },
                  { to:'/family',       emoji:'👨‍👩‍👧', label:'Family',           sub:'Manage members' },
                  { to:'/doctor-share', emoji:'🔗', label:'Share with Doctor',sub:'Secure 48-hr link' },
                  { to:'/connect-device',emoji:'📡',label:'Connect Device',   sub:'SimpleMed CGM & Band' },
                ].map(({ to, emoji, label, sub }) => (
                  <Link key={to} to={to}
                    className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-primary/30 hover:shadow-sm transition-all group">
                    <span className="text-2xl mb-3 block">{emoji}</span>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Link to="/pharmacy"
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-4">
                  <Store size={20} className="text-orange-500" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">Send to Pharmacy</h3>
                <p className="text-sm text-gray-500">Transfer prescriptions to CVS, Walgreens, Amazon Pharmacy and more with one tap.</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-500 mt-3">Try demo <ChevronRight size={13} /></span>
              </Link>
              <Link to="/vitals"
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-primary/30 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Activity size={20} className="text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors">Live Vital Monitor</h3>
                <p className="text-sm text-gray-500">Real-time glucose, heart rate, SpO₂ and sleep tracking against your personal baseline.</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-3">Try demo <ChevronRight size={13} /></span>
              </Link>
              <Link to="/consultation"
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Stethoscope size={20} className="text-blue-500" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">Consultation Mode</h3>
                <p className="text-sm text-gray-500">Going to the doctor? Prepare before, show a summary during, and understand after.</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-500 mt-3">See 4 steps <ChevronRight size={13} /></span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── SIMPLEMED DEVICES ── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            <div className="md:w-1/2">
              <div className="inline-block bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">SimpleMed Hardware</div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Wearables built for cardiac patients</h2>
              <p className="text-gray-500 text-lg mb-6 leading-relaxed">
                The SimpleMed CGM and Band communicate over BLE 5.0 and sync directly with the app.
                Alerts fire based on <em>your</em> personal baseline — not a textbook number.
              </p>
              <div className="flex flex-col gap-3">
                {DEVICES.map(({ emoji, name, desc }) => (
                  <div key={name} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-2xl">{emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/device-simulator"
                className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-primary hover:text-primary-dark transition-colors">
                Try the interactive simulator <ArrowRight size={16} />
              </Link>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                {[
                  { emoji:'📡', label:'BLE 5.0 GATT', sub:'Real-time data stream' },
                  { emoji:'🧠', label:'Personal AI', sub:'Your history, not averages' },
                  { emoji:'🔔', label:'Haptic Alerts', sub:'DRV2605L vibration' },
                  { emoji:'🌡️', label:'ECG + Temp', sub:'PQRST waveform live' },
                ].map(({ emoji, label, sub }) => (
                  <div key={label} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-center">
                    <span className="text-3xl mb-2 block">{emoji}</span>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LANGUAGES ── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Speaks your language</h2>
          <p className="text-gray-500 mb-8">AI summaries available in 11 languages — choose when you upload.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {LANGS.map(l => (
              <span key={l} className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-primary/40 hover:text-primary transition-colors cursor-default">
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHATSAPP + HOSPITAL ── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link to="/whatsapp-bot"
              className="flex items-start gap-5 p-7 rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-sm transition-all bg-white group">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💬</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">WhatsApp Bot</h3>
                <p className="text-sm text-gray-500 leading-relaxed">Get report summaries by sending a photo on WhatsApp. No app needed. Works on basic data.</p>
                <p className="text-xs font-medium text-green-600 mt-2">+1 (555) 900-1234 →</p>
              </div>
            </Link>
            <Link to="/hospital-admin"
              className="flex items-start gap-5 p-7 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all bg-white group">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🏥</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">For Hospitals</h3>
                <p className="text-sm text-gray-500 leading-relaxed">White-label MediSimple for your patients. Admin dashboard, department analytics, $499/mo.</p>
                <p className="text-xs font-medium text-purple-600 mt-2">Hospital Admin Login →</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      {!user && (
        <section className="bg-primary py-20">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Start understanding your health today</h2>
            <p className="text-white/80 text-lg mb-8">Free forever for patients. No credit card required.</p>
            <Link to="/auth?tab=signup"
              className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-8 py-4 rounded-xl text-base hover:bg-gray-50 transition-colors shadow-sm">
              Create your free account <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <p className="text-xs text-gray-400 text-center leading-relaxed max-w-3xl mx-auto">
            MediSimple is a general wellness product intended to help you understand and organize your health
            information. It does not diagnose, treat, cure, or prevent any disease and is not a substitute for
            professional medical advice. Always consult your physician for medical decisions. If you think you
            are having a medical emergency, call 911.
          </p>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <span className="text-xs">💊</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">MediSimple</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400 text-sm">Free for patients, forever</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link to="/auth"           className="hover:text-gray-700 transition-colors">Sign In</Link>
            <Link to="/auth?tab=signup" className="hover:text-gray-700 transition-colors">Sign Up</Link>
            <Link to="/hospital-admin" className="hover:text-gray-700 transition-colors">Hospitals</Link>
            <Link to="/whatsapp-bot"   className="hover:text-gray-700 transition-colors">WhatsApp Bot</Link>
            <Link to="/legal/privacy"  className="hover:text-gray-700 transition-colors">Privacy</Link>
            <Link to="/legal/terms"    className="hover:text-gray-700 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
