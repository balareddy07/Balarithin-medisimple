import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Home, Upload, Activity, Users, Heart } from 'lucide-react'

const NAV = [
  { to: '/',                Icon: Home,     label: 'Home'    },
  { to: '/upload',          Icon: Upload,   label: 'Upload'  },
  { to: '/vitals',          Icon: Activity, label: 'Monitor' },
  { to: '/family-monitor',  Icon: Users,    label: 'Family'  },
  { to: '/health-passport', Icon: Heart,    label: 'Passport' },
]

export default function BottomNav() {
  const { user } = useAuth()
  // Show nav in demo mode too — all pages handle their own auth guards
  const demoRoutes = ['/', '/vitals', '/health-passport', '/family-monitor']
  const onDemoRoute = demoRoutes.some(r => window.location.pathname === r || window.location.pathname.startsWith(r+'/'))
  if (!user && !onDemoRoute) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-black/5"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-lg mx-auto flex justify-around pt-1">
        {NAV.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1 min-w-[52px] transition-all duration-150 select-none
              ${isActive ? 'text-primary' : 'text-sys-label3'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`transition-transform duration-150 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  <Icon size={24} strokeWidth={isActive ? 2.2 : 1.8} />
                </div>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
