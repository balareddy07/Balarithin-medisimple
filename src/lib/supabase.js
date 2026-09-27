import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Initial database seed for localStorage
const SEED_DATA = {
  profiles: [
    {
      id: 'rajesh-patient-id',
      name: 'Rajesh Kumar',
      age: 62,
      phone: '+919876543210',
      preferred_language: 'ta',
      role: 'patient',
      created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'arun-family-id',
      name: 'Arun Kumar',
      age: 32,
      phone: '+919999999999',
      preferred_language: 'en',
      role: 'family_member',
      created_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString()
    }
  ],
  family_members: [
    {
      id: 'fm-1',
      user_id: 'rajesh-patient-id',
      name: 'Lakshmi Kumar',
      age: 58,
      relation: 'Spouse',
      created_at: new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString()
    }
  ],
  family_access: [
    {
      id: 'fa-1',
      parent_user_id: 'rajesh-patient-id',
      monitor_email: 'arun@gmail.com',
      monitor_user_id: 'arun-family-id',
      access_token: 'demo-access-token-abc123',
      nickname: 'Arun (Son)',
      created_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString()
    }
  ],
  family_sharing_rules: [
    {
      id: 'fs-1',
      parent_user_id: 'rajesh-patient-id',
      monitor_user_id: 'arun-family-id',
      metric_type: 'glucose',
      allowed: true
    },
    {
      id: 'fs-2',
      parent_user_id: 'rajesh-patient-id',
      monitor_user_id: 'arun-family-id',
      metric_type: 'blood_pressure',
      allowed: true
    },
    {
      id: 'fs-3',
      parent_user_id: 'rajesh-patient-id',
      monitor_user_id: 'arun-family-id',
      metric_type: 'heart_rate',
      allowed: true
    },
    {
      id: 'fs-4',
      parent_user_id: 'rajesh-patient-id',
      monitor_user_id: 'arun-family-id',
      metric_type: 'spo2',
      allowed: true
    }
  ],
  reports: [
    {
      id: 'r-1',
      user_id: 'rajesh-patient-id',
      patient_name: 'Rajesh Kumar',
      original_content: 'ZlhVcmhBWDJCYmE0K2x2N2pxNWtqQT09Onp2OG1aUT09OnBsc2FmZQ==', // encrypted mock
      summary: '📋 **Overview**\nBlood sugar test report indicates HbA1c is elevated.\n\n🔍 **Key Findings**\n• HbA1c is 7.2% which is in the diabetic range.\n• Fasting glucose is 135 mg/dL.\n\n📌 **Next Steps**\n1. Consult your endocrinologist.\n2. Monitor daily blood glucose.\n3. Restrict high-carbohydrate meals.',
      language: 'en',
      created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
    }
  ],
  vital_readings: [
    { id: 'v-1', user_id: 'rajesh-patient-id', metric_type: 'glucose', value: 118, unit: 'mg/dL', source: 'dexcom', recorded_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    { id: 'v-2', user_id: 'rajesh-patient-id', metric_type: 'glucose', value: 162, unit: 'mg/dL', source: 'dexcom', recorded_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString() },
    { id: 'v-3', user_id: 'rajesh-patient-id', metric_type: 'heart_rate', value: 71, unit: 'bpm', source: 'fitbit', recorded_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString() },
    { id: 'v-4', user_id: 'rajesh-patient-id', metric_type: 'blood_pressure', value: 128, value_extra: 82, unit: 'mmHg', source: 'manual', recorded_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString() },
    { id: 'v-5', user_id: 'rajesh-patient-id', metric_type: 'spo2', value: 97, unit: '%', source: 'fitbit', recorded_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString() }
  ],
  health_alerts: [
    { id: 'a-1', user_id: 'rajesh-patient-id', metric_type: 'glucose', value: 162, unit: 'mg/dL', severity: 'warning', message: 'Glucose High: 162 mg/dL (your usual: 88–128)', resolved: false, created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString() }
  ],
  medications: [
    { id: 'm-1', user_id: 'rajesh-patient-id', name: 'Metformin', dose: '500mg', frequency: 'Twice daily', prescribed_date: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(), status: 'active' },
    { id: 'm-2', user_id: 'rajesh-patient-id', name: 'Telmisartan', dose: '40mg', frequency: 'Once daily', prescribed_date: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(), status: 'active' }
  ]
}

// Local Storage Helper
const getLocalStorageDb = () => {
  const db = localStorage.getItem('arogya_db')
  if (!db) {
    localStorage.setItem('arogya_db', JSON.stringify(SEED_DATA))
    return SEED_DATA
  }
  return JSON.parse(db)
}

const saveLocalStorageDb = (db) => {
  localStorage.setItem('arogya_db', JSON.stringify(db))
}

// Mock Supabase Query Builder
class MockQueryBuilder {
  constructor(table) {
    this.table = table
    this.filters = []
    this.orderCol = null
    this.orderAsc = true
    this.limitVal = null
    this.singleVal = false
  }

  eq(field, value) {
    this.filters.push((row) => row[field] === value)
    return this
  }

  gte(field, value) {
    this.filters.push((row) => new Date(row[field]) >= new Date(value) || row[field] >= value)
    return this
  }

  lte(field, value) {
    this.filters.push((row) => new Date(row[field]) <= new Date(value) || row[field] <= value)
    return this
  }

  order(field, opts = {}) {
    this.orderCol = field
    this.orderAsc = opts.ascending !== false
    return this
  }

  limit(n) {
    this.limitVal = n
    return this
  }

  single() {
    this.singleVal = true
    return this
  }

  async select(fields = '*') {
    const db = getLocalStorageDb()
    let data = db[this.table] || []

    // Apply RLS policies
    const sessionStr = localStorage.getItem('arogya_session')
    const session = sessionStr ? JSON.parse(sessionStr) : null
    const currentUser = session?.user

    let parentIds = []
    if (currentUser) {
      const accesses = db.family_access || []
      parentIds = accesses
        .filter(fa => fa.monitor_user_id === currentUser.id || fa.monitor_email === currentUser.email)
        .map(fa => fa.parent_user_id)
    }

    if (currentUser && ['reports', 'vital_readings', 'health_alerts', 'medications', 'cardiac_records', 'profiles', 'family_members', 'family_access', 'family_sharing_rules'].includes(this.table)) {
      if (this.table === 'profiles') {
        data = data.filter(r => r.id === currentUser.id || parentIds.includes(r.id))
      } else if (this.table === 'family_access') {
        data = data.filter(r => r.parent_user_id === currentUser.id || r.monitor_user_id === currentUser.id || r.monitor_email === currentUser.email)
      } else if (this.table === 'family_members') {
        data = data.filter(r => r.user_id === currentUser.id || parentIds.includes(r.user_id))
      } else if (this.table === 'family_sharing_rules') {
        data = data.filter(r => r.parent_user_id === currentUser.id || r.monitor_user_id === currentUser.id)
      } else {
        data = data.filter(r => {
          if (r.user_id === currentUser.id) return true
          if (parentIds.includes(r.user_id)) {
            // Check metric visibility rule
            if (this.table === 'vital_readings' || this.table === 'health_alerts') {
              const metricType = r.metric_type
              const rule = (db.family_sharing_rules || []).find(
                fs => fs.parent_user_id === r.user_id &&
                      fs.monitor_user_id === currentUser.id &&
                      fs.metric_type === metricType
              )
              return rule ? rule.allowed : true // default allowed
            }
            return true
          }
          return false
        })
      }
    }

    // Apply filters
    for (const filter of this.filters) {
      data = data.filter(filter)
    }

    // Apply sorting
    if (this.orderCol) {
      data = [...data].sort((a, b) => {
        const valA = a[this.orderCol]
        const valB = b[this.orderCol]
        if (valA < valB) return this.orderAsc ? -1 : 1
        if (valA > valB) return this.orderAsc ? 1 : -1
        return 0
      })
    }

    // Apply limit
    if (this.limitVal !== null) {
      data = data.slice(0, this.limitVal)
    }

    if (this.singleVal) {
      return { data: data[0] || null, error: null }
    }

    return { data, error: null }
  }

  async insert(rows) {
    const db = getLocalStorageDb()
    const tableData = db[this.table] || []
    const toInsert = Array.isArray(rows) ? rows : [rows]

    const inserted = toInsert.map((row) => ({
      id: row.id || `row-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      ...row
    }))

    db[this.table] = [...inserted, ...tableData]
    saveLocalStorageDb(db)

    const returnData = Array.isArray(rows) ? inserted : inserted[0]
    return {
      data: returnData,
      error: null,
      select: () => ({
        single: () => ({
          async single() { return { data: returnData, error: null } },
          then(cb) { cb({ data: returnData, error: null }) }
        }),
        then(cb) { cb({ data: returnData, error: null }) }
      }),
      then(cb) { cb({ data: returnData, error: null }) }
    }
  }

  async update(changes) {
    const db = getLocalStorageDb()
    let tableData = db[this.table] || []

    tableData = tableData.map((row) => {
      // Check if row matches filters
      let match = true
      for (const filter of this.filters) {
        if (!filter(row)) {
          match = false
          break
        }
      }
      if (match) {
        return { ...row, ...changes, updated_at: new Date().toISOString() }
      }
      return row
    })

    db[this.table] = tableData
    saveLocalStorageDb(db)

    return { data: null, error: null }
  }

  async upsert(rows) {
    const db = getLocalStorageDb()
    let tableData = db[this.table] || []
    const toUpsert = Array.isArray(rows) ? rows : [rows]

    for (const row of toUpsert) {
      const idx = tableData.findIndex((r) => r.id === row.id)
      if (idx !== -1) {
        tableData[idx] = { ...tableData[idx], ...row, updated_at: new Date().toISOString() }
      } else {
        tableData.push({
          id: row.id || `row-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          ...row
        })
      }
    }

    db[this.table] = tableData
    saveLocalStorageDb(db)

    return { data: null, error: null }
  }

  async delete() {
    const db = getLocalStorageDb()
    let tableData = db[this.table] || []

    tableData = tableData.filter((row) => {
      let match = true
      for (const filter of this.filters) {
        if (!filter(row)) {
          match = false
          break
        }
      }
      return !match // Keep row if it does NOT match filters
    })

    db[this.table] = tableData
    saveLocalStorageDb(db)

    return { data: null, error: null }
  }

  // Promise resolution support so we can await the query builder directly
  then(onfulfilled) {
    return this.select().then(onfulfilled)
  }
}

// Mock Supabase Auth
const mockAuth = {
  listeners: [],
  onAuthStateChange(callback) {
    this.listeners.push(callback)
    const session = this.getCurrentSession()
    callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session)
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter((cb) => cb !== callback)
          }
        }
      }
    }
  },
  getCurrentSession() {
    const sessionStr = localStorage.getItem('arogya_session')
    return sessionStr ? JSON.parse(sessionStr) : null
  },
  async getSession() {
    return { data: { session: this.getCurrentSession() }, error: null }
  },
  async getUser(token) {
    const session = this.getCurrentSession()
    return { data: { user: session?.user || null }, error: null }
  },
  async signUp({ email, password, options = {} }) {
    const db = getLocalStorageDb()
    const exists = db.profiles.some((p) => p.email === email)
    if (exists) {
      return { data: null, error: { message: 'User already exists' } }
    }

    const userId = `u-${Math.random().toString(36).substr(2, 9)}`
    const newProfile = {
      id: userId,
      name: options.data?.full_name || email.split('@')[0],
      phone: options.data?.phone || '',
      preferred_language: options.data?.preferred_language || 'en',
      role: options.data?.role || 'patient',
      email,
      created_at: new Date().toISOString()
    }

    db.profiles.push(newProfile)
    saveLocalStorageDb(db)

    // Log user in immediately in mock mode
    const session = {
      access_token: `mock-token-${userId}`,
      user: { id: userId, email, role: newProfile.role }
    }
    localStorage.setItem('arogya_session', JSON.stringify(session))

    // Notify listeners
    this.listeners.forEach((cb) => cb('SIGNED_IN', session))

    return { data: { user: session.user, session }, error: null }
  },
  async signInWithPassword({ email, password }) {
    const db = getLocalStorageDb()
    const profile = db.profiles.find((p) => p.email === email || p.phone === email)
    if (!profile) {
      return { data: null, error: { message: 'Invalid credentials' } }
    }

    const session = {
      access_token: `mock-token-${profile.id}`,
      user: { id: profile.id, email: profile.email || email, role: profile.role }
    }
    localStorage.setItem('arogya_session', JSON.stringify(session))

    // Notify listeners
    this.listeners.forEach((cb) => cb('SIGNED_IN', session))

    return { data: { user: session.user, session }, error: null }
  },
  async signInWithOtp({ phone }) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    localStorage.setItem('mock_otp', JSON.stringify({ phone, otp, expires: Date.now() + 5 * 60 * 1000 }))
    alert(`[MOCK OTP SERVICE] Code sent to ${phone}: ${otp}`)
    return { data: null, error: null }
  },
  async verifyOtp({ phone, token }) {
    const otpDataStr = localStorage.getItem('mock_otp')
    if (!otpDataStr) return { data: null, error: { message: 'No OTP requested' } }

    const { phone: savedPhone, otp, expires } = JSON.parse(otpDataStr)
    if (savedPhone !== phone || otp !== token || Date.now() > expires) {
      return { data: null, error: { message: 'Invalid or expired OTP' } }
    }

    // Sign in or create
    const db = getLocalStorageDb()
    let profile = db.profiles.find((p) => p.phone === phone)
    if (!profile) {
      // Create profile for new phone signup
      const userId = `u-${Math.random().toString(36).substr(2, 9)}`
      profile = {
        id: userId,
        name: `User ${phone.slice(-4)}`,
        phone,
        preferred_language: 'en',
        role: 'patient',
        email: `${phone.slice(1)}@arogya.local`,
        created_at: new Date().toISOString()
      }
      db.profiles.push(profile)
      saveLocalStorageDb(db)
    }

    const session = {
      access_token: `mock-token-${profile.id}`,
      user: { id: profile.id, email: profile.email, phone, role: profile.role }
    }
    localStorage.setItem('arogya_session', JSON.stringify(session))

    this.listeners.forEach((cb) => cb('SIGNED_IN', session))
    return { data: { user: session.user, session }, error: null }
  },
  async signOut() {
    localStorage.removeItem('arogya_session')
    this.listeners.forEach((cb) => cb('SIGNED_OUT', null))
    return { error: null }
  }
}

// Proxied client
const realClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Check if we are running in localhost or if dns failed
const isDnsFailed = false // Changed to false to connect to the real remote Supabase project

export const supabase = isDnsFailed
  ? new Proxy(realClient, {
      get(target, prop) {
        if (prop === 'auth') {
          return mockAuth
        }
        if (prop === 'from') {
          return (table) => new MockQueryBuilder(table)
        }
        if (prop === 'channel') {
          return (channelName) => ({
            on: function() { return this },
            subscribe: function(callback) {
              if (callback) callback('SUBSCRIBED')
              return this
            }
          })
        }
        return target[prop]
      }
    })
  : realClient

