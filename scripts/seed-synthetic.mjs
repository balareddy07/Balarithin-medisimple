#!/usr/bin/env node
/**
 * seed-synthetic.mjs — SYNTHETIC DATA GENERATOR. NOT REAL PATIENT DATA.
 *
 * Generates fake patients, medical reports, vital readings, and medications
 * as JSON for load testing, demos, and CI fixtures.
 *
 * - Every record is labeled `"synthetic": true`.
 * - Seeded RNG (mulberry32): same --seed always yields the same dataset.
 * - NEVER upload this output to production tables or mix it with real data.
 *
 * Usage:
 *   node scripts/seed-synthetic.mjs [--count 50] [--seed 42] [--out seed-data/synthetic.json]
 *
 * Requires: Node 18+ (no dependencies).
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

function parseArgs(argv) {
  const out = { count: 50, seed: 42, out: 'seed-data/synthetic.json' }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--count' && argv[i + 1]) out.count = Math.max(1, parseInt(argv[++i], 10) || 50)
    else if (argv[i] === '--seed' && argv[i + 1]) out.seed = parseInt(argv[++i], 10) || 42
    else if (argv[i] === '--out' && argv[i + 1]) out.out = argv[++i]
  }
  return out
}

// Deterministic PRNG — same seed, same dataset.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST = ['Aarav', 'Diya', 'Kabir', 'Meera', 'Arjun', 'Anaya', 'Vikram', 'Priya', 'Rohan', 'Sneha', 'James', 'Maria', 'Chen', 'Fatima', 'Diego']
const LAST = ['Sharma', 'Patel', 'Reddy', 'Iyer', 'Khan', 'Gupta', 'Nair', 'Smith', 'Garcia', 'Kim']
const LANGS = ['en', 'hi', 'ta', 'te', 'es']
const REPORT_TYPES = ['HbA1c', 'Lipid Panel', 'CBC', 'Thyroid (TSH)', 'Kidney Function (KFT)', 'Liver Function (LFT)', 'ECG', 'Chest X-Ray']
const VITAL_TYPES = [
  { metric_type: 'glucose', unit: 'mg/dL', lo: 80, hi: 200 },
  { metric_type: 'heart_rate', unit: 'bpm', lo: 55, hi: 110 },
  { metric_type: 'spo2', unit: '%', lo: 94, hi: 100 },
  { metric_type: 'blood_pressure_sys', unit: 'mmHg', lo: 100, hi: 160 },
]
const MEDS = [
  { name: 'Metformin', dose: '500mg', frequency: 'Twice daily' },
  { name: 'Telmisartan', dose: '40mg', frequency: 'Once daily' },
  { name: 'Atorvastatin', dose: '10mg', frequency: 'Once daily' },
  { name: 'Amlodipine', dose: '5mg', frequency: 'Once daily' },
]

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}
function int(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1))
}
function isoDaysAgo(rng, days) {
  const d = new Date(Date.now() - Math.floor(rng() * days) * 24 * 3600 * 1000)
  return d.toISOString()
}

function generatePatient(rng, i) {
  const id = `synthetic-patient-${String(i + 1).padStart(4, '0')}`
  const name = `${pick(rng, FIRST)} ${pick(rng, LAST)} (SYNTHETIC)`
  const language = pick(rng, LANGS)

  const reports = []
  const nReports = int(rng, 1, 4)
  for (let r = 0; r < nReports; r++) {
    reports.push({
      id: `${id}-report-${r + 1}`,
      user_id: id,
      synthetic: true,
      report_type: pick(rng, REPORT_TYPES),
      language,
      // Placeholder — real summaries come from the Claude Edge Function.
      summary_format_check: 'pending',
      created_at: isoDaysAgo(rng, 60),
    })
  }

  const vitals = []
  const nVitals = int(rng, 5, 20)
  for (let v = 0; v < nVitals; v++) {
    const vt = pick(rng, VITAL_TYPES)
    vitals.push({
      id: `${id}-vital-${v + 1}`,
      user_id: id,
      synthetic: true,
      metric_type: vt.metric_type,
      value: int(rng, vt.lo, vt.hi),
      unit: vt.unit,
      source: pick(rng, ['manual', 'simulated_device']),
      recorded_at: isoDaysAgo(rng, 30),
    })
  }

  const medications = []
  const nMeds = int(rng, 0, 3)
  for (let m = 0; m < nMeds; m++) {
    const med = pick(rng, MEDS)
    medications.push({
      id: `${id}-med-${m + 1}`,
      user_id: id,
      synthetic: true,
      ...med,
      status: 'active',
    })
  }

  return {
    id,
    synthetic: true,
    name,
    age: int(rng, 45, 85),
    preferred_language: language,
    country: pick(rng, ['IN', 'US']),
    created_at: isoDaysAgo(rng, 90),
    reports,
    vitals,
    medications,
  }
}

function main() {
  const { count, seed, out } = parseArgs(process.argv.slice(2))
  const rng = mulberry32(seed)

  const patients = []
  for (let i = 0; i < count; i++) patients.push(generatePatient(rng, i))

  const payload = {
    synthetic: true,
    warning: 'SYNTHETIC DATA ONLY — generated for load testing and demos. Not real patient data.',
    generated_at: new Date().toISOString(),
    seed,
    count,
    patients,
  }

  const outPath = resolve(process.cwd(), out)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(payload, null, 2))

  const nReports = patients.reduce((n, p) => n + p.reports.length, 0)
  const nVitals = patients.reduce((n, p) => n + p.vitals.length, 0)
  const nMeds = patients.reduce((n, p) => n + p.medications.length, 0)
  console.log(`SYNTHETIC dataset written to ${outPath}`)
  console.log(`  seed=${seed} patients=${count} reports=${nReports} vitals=${nVitals} medications=${nMeds}`)
}

main()
