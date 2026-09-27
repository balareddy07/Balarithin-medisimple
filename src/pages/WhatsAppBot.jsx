import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Check, ChevronRight } from 'lucide-react'

const STEPS = [
  { n:'1', title:'Save the number',  desc:'Save +1 (555) 900-1234 as "MediSimple" in your contacts',  icon:'📱' },
  { n:'2', title:'Send "Hello"',     desc:'Open WhatsApp, find MediSimple, and send "Hello"',          icon:'💬' },
  { n:'3', title:'Choose language',  desc:'The bot asks your language. Reply with the number.',        icon:'🌐' },
  { n:'4', title:'Send your report', desc:'Take a photo of the report and send it directly',           icon:'📷' },
  { n:'5', title:'Get your summary', desc:'Receive a simple explanation in your language in 30 seconds', icon:'✨' },
]

const LANGS = ['English','हिंदी','తెలుగు','தமிழ்','ಕನ್ನಡ','മലയാളം','मराठी','বাংলা','ગુજરાતી','ਪੰਜਾਬੀ','Español']
const BOT   = '+15559001234'

export default function WhatsAppBot() {
  const { user } = useAuth()
  const [linked, setLinked] = useState(false)

  function connect() {
    const msg = encodeURIComponent(`Hello! I want to understand my medical reports.\nUser: ${user?.id || 'guest'}`)
    window.open(`https://wa.me/${BOT.replace(/\D/g,'')}?text=${msg}`, '_blank')
    setLinked(true)
  }

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Hero */}
        <div className="pt-6 pb-5">
          <div
            className="rounded-ios-2xl overflow-hidden shadow-card-md mb-5"
            style={{ background: 'linear-gradient(135deg,#25D366 0%,#128C7E 100%)' }}
          >
            <div className="px-6 pt-8 pb-7 text-center">
              <div className="text-6xl mb-4 animate-float-up">💬</div>
              <h1 className="text-title-2 font-bold text-white mb-2">MediSimple Bot</h1>
              <p className="text-white/85 text-callout leading-relaxed">
                Get medical report summaries directly on WhatsApp — no app download needed
              </p>
              <p className="text-white/60 text-footnote mt-3 font-mono">{BOT}</p>
            </div>
          </div>
        </div>

        {/* Why section */}
        <p className="section-header px-0 pt-0 pb-2">Why Use the Bot?</p>
        <div className="list-group mb-5">
          {[
            { icon:'🏠', label:'No browser needed',       sub:'Works with just WhatsApp' },
            { icon:'👴', label:'Great for rural areas',   sub:'Simple for elderly patients' },
            { icon:'📱', label:'No sign-up required',     sub:'Just save and message' },
            { icon:'🔒', label:'Private & encrypted',     sub:'All reports are secure' },
            { icon:'⚡', label:'Fast — under 30 seconds', sub:'AI summary in moments' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="list-row pointer-events-none">
              <div className="list-icon bg-primary-light text-xl">{icon}</div>
              <div className="flex-1">
                <p className="text-callout font-semibold text-black">{label}</p>
                <p className="text-footnote text-sys-label3 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Steps */}
        <p className="section-header px-0 pt-0 pb-2">How to Get Started</p>
        <div className="space-y-2.5 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="bg-white rounded-ios-xl shadow-card px-4 py-4 flex items-center gap-4
                         animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center
                              text-white font-bold text-subhead flex-shrink-0 shadow-btn">
                {s.n}
              </div>
              <div className="flex-1">
                <p className="text-callout font-semibold text-black">{s.title}</p>
                <p className="text-footnote text-sys-label3 mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
              <div className="text-xl flex-shrink-0">{s.icon}</div>
            </div>
          ))}
        </div>

        {/* Connect button */}
        {linked ? (
          <div className="bg-primary-light border border-primary/20 rounded-ios-xl px-5 py-5 text-center mb-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mx-auto mb-3 shadow-btn">
              <Check size={24} className="text-white" />
            </div>
            <h3 className="text-headline font-bold text-black mb-1">Opening WhatsApp…</h3>
            <p className="text-subhead text-sys-label3">Send "Hello" to the bot to get started</p>
          </div>
        ) : (
          <button
            onClick={connect}
            className="w-full py-4 rounded-ios-xl flex items-center justify-center gap-3
                       text-white font-bold text-headline shadow-float mb-4
                       active:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}
          >
            💬 Connect WhatsApp Bot
          </button>
        )}

        {/* Languages */}
        <p className="section-header px-0 pt-0 pb-2">11 Languages Supported</p>
        <div className="bg-white rounded-ios-xl shadow-card px-4 py-4 mb-5">
          <div className="flex flex-wrap gap-2">
            {LANGS.map(l => (
              <span key={l} className="pill pill-green">{l}</span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
