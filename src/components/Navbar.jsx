import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { LogOut, User, FileText, Users, Menu, X, ChevronDown } from 'lucide-react'

const HIDE_ON = ['/device-simulator', '/simulator-pro']

const APP_NAV = [
  { to: '/upload',          label: 'Upload Report' },
  { to: '/vitals',          label: 'Live Monitor'  },
  { to: '/medications',     label: 'Medications'   },
  { to: '/health-passport', label: 'Passport'      },
  { to: '/family-bridge',   label: 'Bridge'        },
  { to: '/ecg-analysis',   label: 'ECG'           },
]

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)

  if (HIDE_ON.some(p => pathname.startsWith(p))) return null
  if (pathname === '/auth') return null

  const firstName = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Account'
  const initial   = (profile?.name || user?.email || '?')[0].toUpperCase()

  const handleSignOut = async () => {
    setDropOpen(false); setMobileOpen(false)
    await signOut(); navigate('/')
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0" onClick={() => setMobileOpen(false)}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-sm">💊</span>
              </div>
              <span className="font-bold text-lg tracking-tight text-gray-900">MediSimple</span>
            </Link>

            {/* Desktop centre nav */}
            {user ? (
              <div className="hidden md:flex items-center gap-1">
                {APP_NAV.map(({ to, label }) => (
                  <Link key={to} to={to}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${pathname === to ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                    {label}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-6">
                <Link to="/vitals"        className="text-sm font-medium text-gray-600 hover:text-gray-900">Demo</Link>
                <Link to="/whatsapp-bot"  className="text-sm font-medium text-gray-600 hover:text-gray-900">WhatsApp Bot</Link>
                <Link to="/hospital-admin" className="text-sm font-medium text-gray-600 hover:text-gray-900">For Hospitals</Link>
              </div>
            )}

            {/* Desktop right */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="relative">
                  <button onClick={() => setDropOpen(!dropOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                      {initial}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{firstName}</span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${dropOpen ? 'rotate-180':''}`} />
                  </button>
                  {dropOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDropOpen(false)} />
                      <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{profile?.name || firstName}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        {[
                          { to:'/profile',    Icon:User,    label:'Profile'    },
                          { to:'/my-reports', Icon:FileText, label:'My Reports' },
                          { to:'/family',     Icon:Users,   label:'Family'     },
                        ].map(({to,Icon,label}) => (
                          <Link key={to} to={to} onClick={()=>setDropOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Icon size={15} className="text-gray-400" /> {label}
                          </Link>
                        ))}
                        <div className="border-t border-gray-100">
                          <button onClick={handleSignOut}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                            <LogOut size={15} /> Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/auth"
                    className="text-sm font-medium text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    Sign In
                  </Link>
                  <Link to="/auth?tab=signup"
                    className="text-sm font-semibold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-colors shadow-sm">
                    Get Started Free
                  </Link>
                </>
              )}
            </div>

            {/* Mobile toggle */}
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-2 py-3 mb-1">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold">{initial}</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{profile?.name || firstName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  {APP_NAV.map(({to,label}) => (
                    <Link key={to} to={to} onClick={()=>setMobileOpen(false)}
                      className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                        ${pathname===to?'bg-primary/10 text-primary':'text-gray-700 hover:bg-gray-50'}`}>
                      {label}
                    </Link>
                  ))}
                  <div className="pt-2 border-t border-gray-100 mt-2 space-y-1">
                    <Link to="/profile" onClick={()=>setMobileOpen(false)} className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Profile</Link>
                    <button onClick={handleSignOut} className="block w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">Sign Out</button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/vitals"         onClick={()=>setMobileOpen(false)} className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Demo</Link>
                  <Link to="/whatsapp-bot"   onClick={()=>setMobileOpen(false)} className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">WhatsApp Bot</Link>
                  <Link to="/hospital-admin" onClick={()=>setMobileOpen(false)} className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">For Hospitals</Link>
                  <div className="flex flex-col gap-2 pt-3 border-t border-gray-100 mt-1">
                    <Link to="/auth" onClick={()=>setMobileOpen(false)}
                      className="block text-center px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700">Sign In</Link>
                    <Link to="/auth?tab=signup" onClick={()=>setMobileOpen(false)}
                      className="block text-center px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold">Get Started Free</Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
      <div className="h-16" />
    </>
  )
}
