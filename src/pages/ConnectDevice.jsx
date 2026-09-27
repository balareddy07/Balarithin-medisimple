import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Check, ChevronRight, Wifi, ExternalLink, X } from 'lucide-react'

const DEVICES = [
  {
    id: 'dexcom',
    name: 'SimpleMed CGM',
    type: 'Continuous Glucose Monitor',
    icon: '🩸',
    color: '#FF6B35',
    bg: '#FFF4F0',
    features: ['Glucose every 5 min', 'Spike alerts', '24hr trend chart', 'Personal baseline detection'],
    status: 'demo', // 'connected' | 'demo' | 'available'
    badge: 'Most Popular',
  },
  {
    id: 'fitbit',
    name: 'SimpleMed Band',
    type: 'Health & Fitness Wristband',
    icon: '⌚',
    color: '#00B4D8',
    bg: '#F0FBFF',
    features: [
      'Heart rate 24/7', 'Sleep tracking', 'SpO₂ monitoring', 'Step & activity',
      'Blood Pressure trends (estimate)', 'Heart Rate Variability (HRV)',
      'Skin Temperature', 'Activity & Movement Patterns',
      'ECG recordings from your wrist', 'Irregular rhythm notifications',
      'Personal baseline tracking', 'Pro Intelligence 24/7',
    ],
    status: 'demo',
    badge: 'Recommended',
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    type: 'iPhone + Apple Watch',
    icon: '🍎',
    color: '#FF375F',
    bg: '#FFF0F3',
    features: ['All Health app data', 'Apple Watch metrics', 'ECG readings', 'Blood oxygen'],
    status: 'available',
    badge: null,
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    type: 'Smart Watch',
    icon: '🏃',
    color: '#007DC5',
    bg: '#F0F7FF',
    features: ['Heart rate & HRV', 'Stress tracking', 'Sleep stages', 'Pulse Ox'],
    status: 'available',
    badge: null,
  },
  {
    id: 'omron',
    name: 'Omron Blood Pressure',
    type: 'BP Monitor',
    icon: '💉',
    color: '#6C5CE7',
    bg: '#F5F3FF',
    features: ['Systolic & diastolic', 'Irregular heartbeat detection', 'Morning hypertension alert'],
    status: 'available',
    badge: null,
  },
  {
    id: 'manual',
    name: 'Manual Entry',
    type: 'Enter readings yourself',
    icon: '✏️',
    color: '#34C759',
    bg: '#E8F8ED',
    features: ['Any metric', 'Spike detection', 'No device needed', 'Always available'],
    status: 'always',
    badge: 'Always On',
  },
]

function DeviceCard({ device, onConnect }) {
  const isDemo      = device.status === 'demo'
  const isConnected = device.status === 'connected'
  const isAlways    = device.status === 'always'

  return (
    <button
      onClick={() => onConnect(device)}
      className="w-full flex items-start gap-4 bg-white rounded-ios-xl shadow-card px-4 py-4 text-left
                 active:bg-sys-fill transition-colors"
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-ios flex items-center justify-center flex-shrink-0 text-2xl"
        style={{ background: device.bg }}>
        {device.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="text-callout font-bold text-black">{device.name}</p>
          {device.badge && (
            <span className="text-caption-2 font-bold px-2 py-0.5 rounded-full"
              style={{ color: device.color, background: device.bg }}>
              {device.badge}
            </span>
          )}
        </div>
        <p className="text-footnote text-sys-label3 mb-2">{device.type}</p>
        <div className="flex flex-wrap gap-1">
          {device.features.slice(0,3).map(f => (
            <span key={f} className="text-[10px] font-semibold text-sys-label2 bg-sys-fill px-1.5 py-0.5 rounded">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0 mt-0.5">
        {isConnected ? (
          <span className="flex items-center gap-1 text-caption-1 font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>
            Live
          </span>
        ) : isDemo ? (
          <span className="text-caption-1 font-bold text-primary bg-primary-light px-2.5 py-1 rounded-full">
            Demo
          </span>
        ) : isAlways ? (
          <span className="text-caption-1 font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            ✓ Active
          </span>
        ) : (
          <span className="flex items-center gap-1 text-caption-1 font-semibold text-apple-blue">
            Connect <ChevronRight size={12}/>
          </span>
        )}
      </div>
    </button>
  )
}

export default function ConnectDevice() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [selected, setSelected]   = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)

  function handleConnect(device) {
    if (device.id === 'manual') { navigate('/vitals'); return }
    setSelected(device)
  }

  function simulateConnect() {
    setConnecting(true)
    setTimeout(() => {
      setConnecting(false)
      setConnected(true)
    }, 2000)
  }

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="pt-6 pb-5">
          <div className="w-14 h-14 rounded-ios-xl bg-primary flex items-center justify-center mb-3 shadow-btn">
            <Wifi size={28} className="text-white"/>
          </div>
          <h1 className="text-title-1 font-bold text-black">Connect Device</h1>
          <p className="text-callout text-sys-label3 mt-1 leading-relaxed">
            Link your wearable or CGM. MediSimple uses your historical health data to set <strong>personalized</strong> spike thresholds — more accurate than factory defaults.
          </p>
        </div>

        {/* Hardware Simulator Banner */}
        <Link to="/device-simulator" className="block mb-5 active:scale-[0.98] transition-transform select-none">
          <div className="rounded-ios-xl overflow-hidden shadow-card-md border-2 border-emerald-500/20"
               style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-ios-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Wifi size={24} className="text-white animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-headline leading-tight">⚡ Interactive Hardware Simulator</p>
                <p className="text-white/85 text-footnote mt-0.5">Test SimpleMed CGM NFC activation, BLE GATT sync & haptic alerts live</p>
              </div>
              <ChevronRight size={18} className="text-white/60 flex-shrink-0" />
            </div>
          </div>
        </Link>

        {/* How it works */}
        <div className="bg-primary-light border border-primary/20 rounded-ios-xl px-4 py-4 mb-5">
          <p className="text-subhead font-bold text-primary-dark mb-2">How MediSimple makes it smarter</p>
          <div className="space-y-2">
            {[
              { icon:'📋', text:'We read 18 past glucose readings from your reports' },
              { icon:'🧮', text:'Your personal normal range: 88–128 mg/dL (not generic 70–140)' },
              { icon:'⚡', text:'Spikes are detected against YOUR baseline — alerts are far more accurate' },
              { icon:'👨‍👩‍👧', text:'Family members get notified only when it matters' },
            ].map(({icon,text}) => (
              <div key={text} className="flex items-start gap-2">
                <span className="text-sm flex-shrink-0">{icon}</span>
                <p className="text-footnote text-primary-dark leading-snug">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Device list */}
        <p className="section-header px-0 pt-0 pb-2">Supported Devices</p>
        <div className="space-y-2.5 mb-5">
          {DEVICES.map(d => (
            <DeviceCard key={d.id} device={d} onConnect={handleConnect} />
          ))}
        </div>

        {/* Bluetooth note */}
        <div className="bg-sys-fill rounded-ios-xl px-4 py-3 mb-4">
          <p className="text-footnote text-sys-label2 leading-relaxed">
            <strong>📱 SimpleMed Band — Pro Intelligence:</strong> Blood pressure trends, HRV,
            skin temperature, activity patterns, wrist ECG recordings, irregular rhythm notifications,
            and 24/7 tracking against your own personal baseline — all shareable with your family
            and your doctor. <Link to="/ecg-analysis" className="text-primary font-semibold">Open ECG Analysis →</Link>
          </p>
        </div>

        <div className="h-4"/>
      </div>

      {/* Device connect modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={()=>{if(!connecting){setSelected(null);setConnected(false)}}}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in"/>
          <div className="relative bg-sys-bg rounded-t-ios-3xl shadow-float max-w-lg mx-auto w-full animate-slide-up"
            onClick={e=>e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-sys-sep rounded-full"/>
            </div>

            <div className="px-5 pt-4 pb-2 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-ios flex items-center justify-center text-2xl"
                  style={{ background: selected.bg }}>{selected.icon}</div>
                <div>
                  <h2 className="text-title-3 font-bold text-black">{selected.name}</h2>
                  <p className="text-footnote text-sys-label3">{selected.type}</p>
                </div>
              </div>
              {!connecting && (
                <button onClick={()=>{setSelected(null);setConnected(false)}}
                  className="w-8 h-8 rounded-full bg-sys-fill flex items-center justify-center">
                  <X size={16} className="text-sys-label2"/>
                </button>
              )}
            </div>

            <div className="px-5 pb-3">
              {/* Features */}
              <div className="bg-sys-fill rounded-ios-xl p-4 mb-4">
                <p className="text-caption-1 font-bold text-sys-label2 uppercase tracking-wide mb-2">
                  What MediSimple will sync
                </p>
                {selected.features.map(f=>(
                  <div key={f} className="flex items-center gap-2 mb-1.5 last:mb-0">
                    <Check size={14} style={{color:selected.color}} className="flex-shrink-0"/>
                    <p className="text-callout text-black">{f}</p>
                  </div>
                ))}
              </div>

              {connected ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <Check size={32} className="text-green-600"/>
                  </div>
                  <p className="text-title-3 font-bold text-black">Connected!</p>
                  <p className="text-callout text-sys-label3 mt-1 mb-4">
                    {selected.name} is now syncing with MediSimple
                  </p>
                  <button onClick={()=>{setSelected(null);setConnected(false);navigate('/vitals')}}
                    className="btn-primary w-full py-4">
                    View Live Monitor →
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-orange-50 border border-orange-200 rounded-ios-xl px-4 py-3 mb-4">
                    <p className="text-subhead text-orange-800 leading-relaxed">
                      <strong>Demo:</strong> This is a simulated connection. In the real app,
                      you'd be taken to {selected.name}'s OAuth authorization page to grant access.
                    </p>
                  </div>
                  <button onClick={simulateConnect} disabled={connecting}
                    className="btn-primary w-full py-4 text-headline">
                    {connecting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="loader-dots text-white"><span/><span/><span/></div>
                        Connecting to {selected.name}…
                      </span>
                    ) : `Connect ${selected.name}`}
                  </button>
                </>
              )}
            </div>
            <div className="pb-8"/>
          </div>
        </div>
      )}
    </div>
  )
}
