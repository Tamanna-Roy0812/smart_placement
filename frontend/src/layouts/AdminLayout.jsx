import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { MdNotifications } from 'react-icons/md'
import { FiX } from 'react-icons/fi'
import { supabase } from '../lib/supabase'

function AdminLayout() {
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)

  const navItems = [
    { name: 'Dashboard', path: '/admin' },
    { name: 'User Management', path: '/admin/users' },
    { name: 'Bulk Add Students', path: '/admin/bulk-students' },
    { name: 'Skills & Assessments', path: '/admin/skills-assessments' },
    { name: 'Companies', path: '/admin/companies' },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('userRole')
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      {/* Sidebar */}
      <aside className="w-full bg-slate-900 text-white md:min-h-screen md:w-64">
        <div className="border-b border-slate-700 p-6">
          <h1 className="text-xl font-bold">
            Smart Placement
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Admin Panel
          </p>
        </div>

        <nav className="p-4">
          <div className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-slate-900'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-6 w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
            >
              Logout
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Area */}
      <main className="relative min-w-0 flex-1">
        {/* Notification Bell */}
        <div className="absolute right-6 top-5 z-40 md:right-8">
          <button
            type="button"
            onClick={() =>
              setShowNotifications(!showNotifications)
            }
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-amber-50"
            aria-label="Notifications"
          >
            <MdNotifications
              size={25}
              className="text-amber-400"
            />
          </button>

          {/* Notification Panel */}
          {showNotifications && (
            <div className="absolute right-0 top-[4.5rem] z-50 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              {/* Notification Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Notifications
                  </h2>

                  <p className="text-xs text-slate-400">
                    0 new notifications
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowNotifications(false)
                  }
                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close notifications"
                >
                  <FiX size={20} />
                </button>
              </div>

              {/* Empty Notification State */}
              <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                <MdNotifications
                  size={40}
                  className="mb-5 text-amber-400"
                />

                <p className="text-base font-semibold text-slate-800">
                  No notifications
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  You're all caught up!
                </p>
              </div>

              {/* Close Button */}
              <div className="border-t border-slate-200 px-5 py-4 text-center">
                <button
                  type="button"
                  onClick={() =>
                    setShowNotifications(false)
                  }
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Page Content */}
        <div className="pt-4">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AdminLayout