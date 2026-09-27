import { useParams, Link } from 'react-router-dom'

const PRIVACY = [
  { h: 'What we collect', b: 'Information you provide: your name, email, phone number, medical reports you upload, medications you enter, and vital readings from connected devices. We collect nothing you do not explicitly give us.' },
  { h: 'How your health data is protected', b: 'Medical reports and health readings are encrypted on your device with AES-256 before being stored. Our servers store only encrypted data. We cannot read your medical information.' },
  { h: 'How we use your data', b: 'Solely to provide the service to you: generating plain-language summaries, computing your personal baseline, and delivering the alerts and sharing features you configure. We never sell your data, never share it with advertisers, and never use it for marketing.' },
  { h: 'Family sharing is your choice', b: 'No family member can see your data unless you explicitly invite them. You can see exactly who has access and revoke it at any time from the Family page.' },
  { h: 'AI processing', b: 'When you request a report summary, the report content is processed by an AI model to generate the explanation. This processing is used only to produce your summary and is not used to train AI models.' },
  { h: 'Your rights', b: 'You may request a copy of your data or delete your account and all associated data at any time from your Profile. Deletion is permanent and takes effect within 30 days across all backups.' },
  { h: 'Breach notification', b: 'If a security breach affects your data, we will notify you without unreasonable delay, consistent with the FTC Health Breach Notification Rule and applicable state laws.' },
  { h: 'Children', b: 'MediSimple is intended for users 18 and older. We do not knowingly collect data from children.' },
  { h: 'Contact', b: 'Privacy questions: privacy@medisimple.health' },
]

const TERMS = [
  { h: 'What MediSimple is', b: 'MediSimple is a general wellness product that helps you understand, organize, and share your health information. It is free for patients.' },
  { h: 'What MediSimple is not', b: 'MediSimple does not provide medical advice, diagnosis, or treatment. It does not detect, diagnose, cure, mitigate, or prevent any disease or condition. Summaries, baselines, notifications, and trends are for informational purposes only and are not a substitute for the judgment of a licensed healthcare professional. Always consult your physician before making any medical decision. If you believe you are experiencing a medical emergency, call 911 immediately.' },
  { h: 'Personal baseline and notifications', b: 'Baseline ranges and out-of-range notifications are computed from your own historical readings for general awareness. They may be inaccurate, delayed, or unavailable, and must not be relied upon for medical decisions, medication changes, or emergency detection.' },
  { h: 'Devices', b: 'SimpleMed devices and device integrations provide wellness measurements. Readings can be affected by fit, movement, skin condition, and other factors, and are not a replacement for clinical-grade measurement by a healthcare provider.' },
  { h: 'Pharmacy and consultation features', b: 'Pharmacy ordering transmits your request to the pharmacy you select; the pharmacy is solely responsible for dispensing, and prescription items require a valid prescription. Consultations are provided by independent licensed practitioners, not by MediSimple.' },
  { h: 'Your account', b: 'You are responsible for keeping your login credentials secure and for the accuracy of the information you enter. You must be 18 or older to create an account.' },
  { h: 'Acceptable use', b: 'Do not use MediSimple to store or share data of another person without their consent, attempt to access other users’ data, or interfere with the service.' },
  { h: 'Limitation of liability', b: 'To the maximum extent permitted by law, MediSimple is provided "as is" and we are not liable for decisions made based on information shown in the app.' },
  { h: 'Changes', b: 'We may update these terms; material changes will be announced in the app before they take effect.' },
  { h: 'Contact', b: 'legal@medisimple.health' },
]

export default function Legal() {
  const { doc } = useParams()
  const isTerms = doc === 'terms'
  const sections = isTerms ? TERMS : PRIVACY

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-8">

        <div className="flex gap-2 mb-6">
          <Link to="/legal/privacy"
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${!isTerms ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            Privacy Policy
          </Link>
          <Link to="/legal/terms"
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${isTerms ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            Terms of Service
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {isTerms ? 'Terms of Service' : 'Privacy Policy'}
        </h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: July 7, 2026</p>

        <div className="space-y-6">
          {sections.map(s => (
            <div key={s.h} className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-2">{s.h}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{s.b}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-xs text-amber-800 leading-relaxed">
            MediSimple is a general wellness product. It does not diagnose, treat, cure, or prevent any
            disease and is not a substitute for professional medical advice. If you think you are having
            a medical emergency, call 911.
          </p>
        </div>

        <div className="h-8" />
      </div>
    </div>
  )
}
