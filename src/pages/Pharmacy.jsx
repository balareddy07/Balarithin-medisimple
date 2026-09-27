import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Check, ChevronDown, X } from 'lucide-react'

const DEMO_MEDS = [
  { id:'m1', name:'Aspirin 75mg',      dose:'75mg',  frequency:'Once daily'  },
  { id:'m2', name:'Atorvastatin 40mg', dose:'40mg',  frequency:'Bedtime'     },
  { id:'m3', name:'Metformin 500mg',   dose:'500mg', frequency:'Twice daily' },
  { id:'m4', name:'Ramipril 5mg',      dose:'5mg',   frequency:'Once daily'  },
  { id:'m5', name:'Clopidogrel 75mg',  dose:'75mg',  frequency:'Once daily'  },
]
const DEMO_ORDERS = [
  {
    id:'o1', pharmacy_name:'CVS Pharmacy',
    medications: [{ name:'Aspirin 75mg', dose:'75mg' }, { name:'Atorvastatin 40mg', dose:'40mg' }],
    payment_method:'cash', status:'Preparing', created_at: new Date(Date.now() - 15*60000).toISOString(),
  },
]

const PHARMACIES = [
  'CVS Pharmacy', 'Walgreens', 'Rite Aid', 'Walmart Pharmacy',
  'Amazon Pharmacy', 'Costco Pharmacy', 'Kroger Pharmacy', 'Local Pharmacy',
]

const PAYMENT_METHODS = [
  { id: 'insurance', label: 'Insurance',        icon: '🏥', desc: 'Bill to your insurance plan' },
  { id: 'card',      label: 'Credit / Debit',   icon: '💳', desc: 'Pay online now'              },
  { id: 'cash',      label: 'Pay at pickup',    icon: '💵', desc: 'Pay when you collect'        },
]

const STATUS_STEPS = ['Sent', 'Preparing', 'Ready', 'Picked Up']
const STATUS_COLORS = {
  Sent:       { bg: '#EBF4FF', text: '#007AFF', icon: '📤' },
  Preparing:  { bg: '#FFF4E0', text: '#FF9500', icon: '⏳' },
  Ready:      { bg: '#E8F8ED', text: '#34C759', icon: '✅' },
  'Picked Up':{ bg: '#F2F2F7', text: '#8E8E93', icon: '🛍️' },
}

function OrderCard({ order, onAdvance }) {
  const status = order.status
  const sc = STATUS_COLORS[status] || STATUS_COLORS['Sent']
  const step = STATUS_STEPS.indexOf(status)
  const meds = Array.isArray(order.medications) ? order.medications : []
  const date = new Date(order.created_at).toLocaleDateString('en-US', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })

  return (
    <div className="bg-white rounded-ios-xl shadow-card overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-headline font-bold text-black">🏪 {order.pharmacy_name}</p>
            <p className="text-footnote text-sys-label3 mt-0.5">{date}</p>
          </div>
          <span className="text-caption-1 font-bold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: sc.bg, color: sc.text }}>
            {sc.icon} {status}
          </span>
        </div>

        {/* Medications list */}
        {meds.length > 0 && (
          <div className="mt-3 space-y-1">
            {meds.map((m, i) => (
              <p key={i} className="text-subhead text-black">
                💊 {m.name}{m.dose ? ` — ${m.dose}` : ''}
              </p>
            ))}
          </div>
        )}

        {/* Payment */}
        <p className="text-footnote text-sys-label3 mt-2">
          Payment: {order.payment_method === 'cash' ? '💵 Cash on pickup'
            : order.payment_method === 'insurance' ? '🏥 Insurance'
            : '📲 UPI / Card'}
        </p>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex gap-1">
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-all duration-500
                ${i <= step ? 'bg-primary' : 'bg-sys-fill'}`} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {STATUS_STEPS.map(s => (
              <span key={s} className="text-[9px] text-sys-label3 font-medium">{s}</span>
            ))}
          </div>
        </div>
      </div>

      {status !== 'Picked Up' && (
        <button
          onClick={() => onAdvance(order.id, STATUS_STEPS[step + 1])}
          className="w-full py-3 border-t border-sys-sep text-subhead font-semibold text-apple-blue
                     active:bg-sys-fill transition-colors"
        >
          Mark as {STATUS_STEPS[step + 1]} →
        </button>
      )}
    </div>
  )
}

export default function Pharmacy() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [demo, setDemo]           = useState(false)
  const [meds, setMeds]           = useState([])
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]     = useState(false)

  const [pharmacy, setPharmacy]       = useState('')
  const [pharmaOpen, setPharmaOpen]   = useState(false)
  const [payment, setPayment]         = useState('cash')
  const [notes, setNotes]             = useState('')
  const [selectedMeds, setSelectedMeds] = useState([])

  useEffect(() => {
    if (!user) {
      setMeds(DEMO_MEDS)
      setOrders(DEMO_ORDERS)
      setSelectedMeds(DEMO_MEDS.map(m => m.id))
      setDemo(true)
      setLoading(false)
      return
    }
    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    const [medsRes, ordersRes] = await Promise.all([
      supabase.from('medications').select('*').eq('user_id', user.id).eq('status', 'active').order('name'),
      supabase.from('pharmacy_orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    const activeMeds = medsRes.data || []
    setMeds(activeMeds)
    setSelectedMeds(activeMeds.map(m => m.id))  // pre-select all
    setOrders(ordersRes.data || [])
    setLoading(false)
  }

  function toggleMed(id) {
    setSelectedMeds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  async function submitOrder() {
    if (demo) { alert('Sign in to send a real order to the pharmacy.'); return }
    if (!pharmacy.trim()) { alert('Please choose a pharmacy.'); return }
    if (selectedMeds.length === 0) { alert('Please select at least one medication.'); return }
    setSubmitting(true)
    const medsPayload = meds
      .filter(m => selectedMeds.includes(m.id))
      .map(m => ({ name: m.name, dose: m.dose, qty: 1 }))

    const { data, error } = await supabase.from('pharmacy_orders').insert({
      user_id: user.id,
      pharmacy_name: pharmacy,
      medications: medsPayload,
      payment_method: payment,
      status: 'Sent',
      estimated_time: '20-30 minutes',
      notes: notes.trim() || null,
    }).select().single()

    if (!error && data) {
      setOrders(p => [data, ...p])
      setSuccess(true)
      setPharmacy('')
      setNotes('')
      setTimeout(() => setSuccess(false), 3000)
    }
    setSubmitting(false)
  }

  async function advanceStatus(orderId, nextStatus) {
    await supabase.from('pharmacy_orders').update({ status: nextStatus }).eq('id', orderId)
    setOrders(p => p.map(o => o.id === orderId ? { ...o, status: nextStatus } : o))
  }

  const activeOrders = orders.filter(o => o.status !== 'Picked Up')
  const pastOrders   = orders.filter(o => o.status === 'Picked Up')

  return (
    <div className="page min-h-screen bg-sys-bg pb-safe pt-nav">
      <div className="max-w-lg mx-auto px-4">

        <div className="pt-6 pb-4">
          <h1 className="text-title-1 font-bold text-black">Send to Pharmacy</h1>
          <p className="text-callout text-sys-label3 mt-0.5">Order your medications before you arrive</p>
        </div>

        {demo && (
          <div className="bg-orange-50 border border-orange-200 rounded-ios-xl px-4 py-3 mb-4">
            <p className="text-subhead text-orange-800 leading-relaxed">
              👁️ <strong>Demo Mode</strong> — Viewing sample data.{' '}
              <Link to="/auth" className="underline font-semibold">Sign in</Link> to send a real order.
            </p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 bg-primary-light border border-primary/20 rounded-ios-xl
                          px-4 py-4 mb-5 animate-scale-in">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-btn">
              <Check size={18} className="text-white" />
            </div>
            <div>
              <p className="text-callout font-bold text-primary-dark">Order Sent!</p>
              <p className="text-footnote text-primary/80">Pharmacy is preparing your medications</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="loader-dots text-primary"><span/><span/><span/></div>
          </div>
        ) : (
          <>
            {/* Active orders */}
            {activeOrders.length > 0 && (
              <>
                <p className="section-header px-0 pt-0 pb-2">Active Orders</p>
                <div className="space-y-3 mb-5">
                  {activeOrders.map(o => (
                    <OrderCard key={o.id} order={o} onAdvance={advanceStatus} />
                  ))}
                </div>
              </>
            )}

            {/* New order form */}
            <p className="section-header px-0 pt-0 pb-2">New Order</p>

            {/* Select medications */}
            <div className="bg-white rounded-ios-xl shadow-card mb-4 overflow-hidden">
              <p className="px-4 pt-3 pb-1 text-caption-1 font-bold text-sys-label2 uppercase tracking-wide">
                Select Medications
              </p>
              {meds.length === 0 ? (
                <div className="px-4 pb-4 pt-2">
                  <p className="text-callout text-sys-label3">No active medications found.</p>
                  <p className="text-footnote text-sys-label3 mt-1">Upload a prescription first to extract medications.</p>
                </div>
              ) : (
                meds.map(m => (
                  <button
                    key={m.id}
                    onClick={() => toggleMed(m.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-t border-sys-sep
                               text-left active:bg-sys-fill transition-colors"
                  >
                    <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all
                      ${selectedMeds.includes(m.id) ? 'bg-primary border-primary' : 'border-sys-sep'}`}>
                      {selectedMeds.includes(m.id) && <Check size={14} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-callout font-semibold text-black truncate">{m.name}</p>
                      <p className="text-footnote text-sys-label3">{m.dose} · {m.frequency}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Pharmacy selector */}
            <p className="section-header px-0 pt-0 pb-2">Choose Pharmacy</p>
            <div className="relative mb-4">
              <input
                className="w-full bg-white rounded-ios-xl shadow-card px-4 py-3.5 text-callout text-black
                           placeholder-sys-label3 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Type or choose pharmacy…"
                value={pharmacy}
                onChange={e => { setPharmacy(e.target.value); setPharmaOpen(true) }}
                onFocus={() => setPharmaOpen(true)}
              />
              {pharmaOpen && pharmacy === '' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-ios-xl shadow-card-lg
                                z-20 overflow-hidden animate-scale-in max-h-52 overflow-y-auto">
                  {PHARMACIES.map(p => (
                    <button
                      key={p}
                      onClick={() => { setPharmacy(p); setPharmaOpen(false) }}
                      className="w-full px-4 py-3 text-left text-callout text-black border-b border-sys-sep
                                 last:border-0 active:bg-sys-fill transition-colors"
                    >
                      🏪 {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Payment method */}
            <p className="section-header px-0 pt-0 pb-2">Payment Method</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setPayment(pm.id)}
                  className={`py-3.5 rounded-ios-xl flex flex-col items-center gap-1 text-center
                              border-2 transition-all duration-150 active:scale-95 select-none
                              ${payment === pm.id
                                ? 'border-primary bg-primary text-white shadow-btn'
                                : 'border-transparent bg-white text-black shadow-card'}`}
                >
                  <span className="text-2xl">{pm.icon}</span>
                  <span className="text-caption-1 font-bold leading-tight">{pm.label}</span>
                  <span className={`text-[10px] ${payment === pm.id ? 'text-white/80' : 'text-sys-label3'}`}>
                    {pm.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Notes */}
            <p className="section-header px-0 pt-0 pb-2">Note to Pharmacy (optional)</p>
            <div className="bg-white rounded-ios-xl shadow-card mb-5 overflow-hidden">
              <textarea
                className="w-full px-4 py-3.5 text-callout text-black placeholder-sys-label3
                           outline-none resize-none h-20 bg-transparent"
                placeholder="e.g. Please keep ready by 4 PM, need generic versions if available"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button
              onClick={submitOrder}
              disabled={submitting || meds.length === 0}
              className="btn-primary w-full py-4 text-headline mb-5"
            >
              {submitting
                ? <><div className="loader-dots text-white"><span/><span/><span/></div> Sending…</>
                : '🏪 Send Order to Pharmacy'}
            </button>

            {/* Past orders */}
            {pastOrders.length > 0 && (
              <>
                <p className="section-header px-0 pt-0 pb-2">Past Orders</p>
                <div className="space-y-3 mb-4 opacity-70">
                  {pastOrders.slice(0, 3).map(o => (
                    <OrderCard key={o.id} order={o} onAdvance={advanceStatus} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
