import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { track } from '../lib/analytics'

// Waitlist / early-access signup. Warm, simple, 16px+ type throughout.
// Posts to the public.waitlist table (insert-only RLS — no public read).

const ROLES = [
  { value: 'patient', label: 'Patient — I want my reports explained simply' },
  { value: 'family', label: 'Family — I look after a parent from far away' },
  { value: 'doctor', label: 'Doctor — I want to receive patient records' },
  { value: 'hospital', label: 'Hospital — I want this for my patients' },
]

const COUNTRIES = ['India', 'USA', 'Other']

export default function Waitlist() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('family')
  const [country, setCountry] = useState('India')
  const [status, setStatus] = useState('idle') // idle | saving | done | error
  const [error, setError] = useState('')

  const valid = email.trim().length > 3 && email.includes('@')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid || status === 'saving') return
    setStatus('saving')
    setError('')
    try {
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert({ email: email.trim().toLowerCase(), name: name.trim() || null, role, country })
      if (insertError) throw insertError
      track('waitlist_joined', { role, country })
      setStatus('done')
    } catch (err) {
      // Friendly message for the common duplicate-email case.
      const msg = String(err?.message || '')
      setError(msg.includes('duplicate') ? 'This email is already on the list — you are all set! 💚' : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="text-6xl mb-5">💚</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">You're on the list!</h1>
        <p className="text-lg text-gray-600 max-w-md mb-8">
          We'll reach out as soon as early access opens. Thank you for believing in simpler health reports.
        </p>
        <a href="/" className="btn-primary text-lg px-8 py-3">Back to Home</a>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-6 pt-10 pb-24">
      <div className="text-5xl mb-4">🌱</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Get early access to MediSimple</h1>
      <p className="text-lg text-gray-600 mb-8">
        Upload a medical report, get it explained in simple words in your own language — free for patients, forever.
        Join the waitlist and we'll let you in first.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-lg font-medium text-gray-800">Your name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lakshmi Kumar"
            className="text-lg px-4 py-3 rounded-ios border border-gray-300 focus:border-primary focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-lg font-medium text-gray-800">Email <span className="text-apple-red">*</span></span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="text-lg px-4 py-3 rounded-ios border border-gray-300 focus:border-primary focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-lg font-medium text-gray-800">I am a…</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="text-lg px-4 py-3 rounded-ios border border-gray-300 focus:border-primary focus:outline-none bg-white"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-lg font-medium text-gray-800">Country</span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="text-lg px-4 py-3 rounded-ios border border-gray-300 focus:border-primary focus:outline-none bg-white"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        {status === 'error' && (
          <p className="text-lg text-apple-red" role="alert">{error}</p>
        )}

        <button
          type="submit"
          disabled={!valid || status === 'saving'}
          className="btn-primary text-lg px-8 py-4 disabled:opacity-50"
        >
          {status === 'saving' ? 'Joining…' : 'Join the waitlist'}
        </button>

        <p className="text-base text-gray-500 text-center">
          No spam, ever. One email when your access is ready.
        </p>
      </form>
    </div>
  )
}
