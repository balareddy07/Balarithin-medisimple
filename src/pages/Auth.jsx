import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Auth() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()

  const [tab, setTab]         = useState(params.get('tab') === 'signup' ? 'signup' : 'login')
  const [email, setEmail]     = useState('')
  const [password, setPw]     = useState('')
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [role, setRole]       = useState('patient') // patient | family_member
  const [language, setLanguage] = useState('en')
  const [otp, setOtp]         = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [msg, setMsg]         = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [consent, setConsent] = useState(false)

  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'മലയാളം' },
    { code: 'bn', label: 'বাংলা' },
    { code: 'mr', label: 'मराठी' },
    { code: 'gu', label: 'ગુજરાતી' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ' },
    { code: 'or', label: 'ଓଡ଼ିଆ' }
  ]

  // Redirect if already logged in
  useEffect(() => { if (user) navigate('/') }, [user])

  const clear = () => { setError(''); setMsg('') }

  async function handleLogin(e) {
    e.preventDefault(); clear(); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    navigate('/')
  }

  async function handleSignup(e) {
    e.preventDefault(); clear()
    if (!consent) { setError('Please agree to the Terms of Service and consent to health data processing to continue.'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          full_name: name,
          phone,
          preferred_language: language,
          role
        }
      }
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name,
        phone,
        preferred_language: language,
        role
      })
    }
    setLoading(false)
    setMsg('Account created! Sign in to continue.')
    setTab('login')
  }

  async function sendOTP(e) {
    e.preventDefault(); clear(); setLoading(true)
    const formatted = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })
    setLoading(false)
    if (error) { setError(error.message); return }
    setOtpSent(true)
    setMsg('OTP sent to ' + formatted)
  }

  async function verifyOTP(e) {
    e.preventDefault(); clear(); setLoading(true)
    const formatted = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`
    const { error } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: 'sms' })
    setLoading(false)
    if (error) { setError(error.message); return }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Minimal top bar */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex-1 flex justify-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-xs">💊</span>
            </div>
            <span className="font-bold text-gray-900">MediSimple</span>
          </Link>
        </div>
        <div className="w-16" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {tab === 'login'  ? 'Welcome back'       :
               tab === 'signup' ? 'Create your account' :
               'Sign in with phone'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {tab === 'login'  ? 'Sign in to your MediSimple account'     :
               tab === 'signup' ? 'Free forever for patients'               :
               'We\'ll send a one-time code to your number'}
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Tab bar */}
            <div className="flex border-b border-gray-100">
              {[
                { id: 'login',  label: 'Sign In'    },
                { id: 'signup', label: 'Sign Up'    },
                { id: 'otp',    label: 'Phone OTP'  },
              ].map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); clear() }}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors
                    ${tab === t.id
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-400 hover:text-gray-600'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
                  <span className="text-red-500 text-base mt-0.5">⚠</span>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Success */}
              {msg && (
                <div className="flex items-start gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-5">
                  <CheckCircle2 size={16} className="text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-800">{msg}</p>
                </div>
              )}

              {/* ── Sign In ── */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email address</label>
                    <input
                      type="email" required autoComplete="email"
                      placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm text-gray-900 placeholder-gray-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                        placeholder="Your password"
                        value={password} onChange={e => setPw(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm text-gray-900 placeholder-gray-400 transition-all pr-11"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors mt-2">
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                  <p className="text-center text-sm text-gray-500">
                    No account?{' '}
                    <button type="button" onClick={() => { setTab('signup'); clear() }}
                      className="text-primary font-semibold hover:text-primary-dark transition-colors">
                      Create one free
                    </button>
                  </p>
                </form>
              )}

              {/* ── Sign Up ── */}
              {tab === 'signup' && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full name</label>
                    <input
                      type="text" required autoComplete="name"
                      placeholder="Rajesh Kumar"
                      value={name} onChange={e => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm text-gray-900 placeholder-gray-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email address</label>
                    <input
                      type="email" required autoComplete="email"
                      placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm text-gray-900 placeholder-gray-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone <span className="font-normal text-gray-400">(optional)</span></label>
                    <input
                      type="tel" autoComplete="tel"
                      placeholder="+1 (555) 123-4567"
                      value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm text-gray-900 placeholder-gray-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">I am registering as a</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole('patient')}
                        className={`py-3 px-4 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1 transition-all active:scale-[0.98]
                          ${role === 'patient'
                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                      >
                        <span className="text-xl">🤕</span>
                        <span>Patient</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('family_member')}
                        className={`py-3 px-4 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1 transition-all active:scale-[0.98]
                          ${role === 'family_member'
                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                      >
                        <span className="text-xl">👨‍👩‍👧</span>
                        <span>Family Member</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Preferred Language</label>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm text-gray-900 bg-white transition-all"
                    >
                      {LANGUAGES.map(l => (
                        <option key={l.code} value={l.code}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'} required minLength={8}
                        placeholder="Min 8 characters"
                        value={password} onChange={e => setPw(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm text-gray-900 placeholder-gray-400 transition-all pr-11"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                    <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20" />
                    <span className="text-xs text-gray-500 leading-relaxed">
                      I am 18 or older, I agree to the{' '}
                      <Link to="/legal/terms" className="text-primary font-medium" target="_blank">Terms of Service</Link>{' '}
                      and{' '}
                      <Link to="/legal/privacy" className="text-primary font-medium" target="_blank">Privacy Policy</Link>,
                      and I consent to MediSimple processing my health information to provide the service.
                    </span>
                  </label>
                  <button type="submit" disabled={loading}
                    className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors mt-2">
                    {loading ? 'Creating account…' : 'Create Free Account'}
                  </button>
                  <p className="text-center text-xs text-gray-400">
                    Patient data is always private and AES-256 encrypted.
                  </p>
                </form>
              )}

              {/* ── Phone OTP ── */}
              {tab === 'otp' && (
                <form onSubmit={otpSent ? verifyOTP : sendOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone number</label>
                    <input
                      type="tel" required
                      placeholder="+1 (555) 123-4567"
                      value={phone} onChange={e => { setPhone(e.target.value); setOtpSent(false) }}
                      disabled={otpSent}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm text-gray-900 placeholder-gray-400 transition-all disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                  {otpSent && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">6-digit OTP</label>
                      <input
                        type="text" inputMode="numeric" maxLength={6} autoFocus required
                        placeholder="• • • • • •"
                        value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-2xl font-bold tracking-[0.4em] text-gray-900 placeholder-gray-300 transition-all text-center"
                      />
                    </div>
                  )}
                  <button type="submit" disabled={loading}
                    className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors">
                    {loading ? '…' : otpSent ? 'Verify OTP' : 'Send OTP'}
                  </button>
                  {otpSent && (
                    <button type="button" onClick={() => { setOtpSent(false); setOtp('') }}
                      className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
                      Change number
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Hospital link */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Managing a hospital?{' '}
            <Link to="/hospital-admin" className="text-primary font-semibold hover:text-primary-dark transition-colors">
              Hospital Admin Login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
