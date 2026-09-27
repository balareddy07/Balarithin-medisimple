import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'

import Home            from './pages/Home'
import UploadReport    from './pages/UploadReport'
import AISummary       from './pages/AISummary'
import MyReports       from './pages/MyReports'
import FamilyDashboard from './pages/FamilyDashboard'
import DoctorShare     from './pages/DoctorShare'
import DoctorView      from './pages/DoctorView'
import WhatsAppBot     from './pages/WhatsAppBot'
import Auth            from './pages/Auth'
import Profile         from './pages/Profile'
import HospitalAdmin   from './pages/HospitalAdmin'
import HealthPassport  from './pages/HealthPassport'
import Medications     from './pages/Medications'
import Pharmacy        from './pages/Pharmacy'
import FullRecordView  from './pages/FullRecordView'
import Consultation    from './pages/Consultation'
import VitalMonitor    from './pages/VitalMonitor'
import FamilyMonitor   from './pages/FamilyMonitor'
import ConnectDevice   from './pages/ConnectDevice'
import DeviceSimulator    from './pages/DeviceSimulator'
import DeviceSimulatorPro from './pages/DeviceSimulatorPro'
import ECGAnalysis        from './pages/ECGAnalysis'
import FamilyBridge       from './pages/FamilyBridge'
import Legal               from './pages/Legal'
import Waitlist            from './pages/Waitlist'

// Auth loading screen — prevents flash of wrong content on slow phones
function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-5xl">💊</div>
      <div className="pulse-loader"><span /><span /><span /></div>
    </div>
  )
}

// Error boundary — catches JS crashes so patients never see a blank white screen
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { crashed: false } }
  static getDerivedStateFromError() { return { crashed: true } }
  render() {
    if (this.state.crashed) return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="text-5xl mb-4">😔</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-500 mb-6">Please try again. Your reports are safe.</p>
        <a href="/" className="btn-primary">Go to Home</a>
      </div>
    )
    return this.props.children
  }
}

function AppLayout() {
  const { loading } = useAuth()
  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Routes>
          <Route path="/"               element={<Home />} />
          <Route path="/upload"         element={<UploadReport />} />
          <Route path="/summary"        element={<AISummary />} />
          <Route path="/my-reports"     element={<MyReports />} />
          <Route path="/family"         element={<FamilyDashboard />} />
          <Route path="/doctor-share"   element={<DoctorShare />} />
          <Route path="/share/:token"   element={<DoctorView />} />
          <Route path="/whatsapp-bot"   element={<WhatsAppBot />} />
          <Route path="/auth"           element={<Auth />} />
          <Route path="/waitlist"       element={<Waitlist />} />
          <Route path="/profile"        element={<Profile />} />
          <Route path="/hospital-admin"   element={<HospitalAdmin />} />
          <Route path="/health-passport"  element={<HealthPassport />} />
          <Route path="/medications"      element={<Medications />} />
          <Route path="/pharmacy"         element={<Pharmacy />} />
          <Route path="/share/full/:token" element={<FullRecordView />} />
          <Route path="/consultation"      element={<Consultation />} />
          <Route path="/vitals"            element={<VitalMonitor />} />
          <Route path="/family-monitor"    element={<FamilyMonitor />} />
          <Route path="/connect-device"    element={<ConnectDevice />} />
          <Route path="/device-simulator"     element={<DeviceSimulator />} />
          <Route path="/simulator-pro"        element={<DeviceSimulatorPro />} />
          <Route path="/ecg-analysis"         element={<ECGAnalysis />} />
          <Route path="/family-bridge"        element={<FamilyBridge />} />
          <Route path="/legal/:doc"           element={<Legal />} />
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center pt-24 px-4 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-xl font-bold mb-2">Page not found</h2>
              <a href="/" className="text-primary font-medium">Go Home →</a>
            </div>
          } />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  )
}
