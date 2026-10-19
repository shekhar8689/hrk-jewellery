import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import {
  LayoutDashboard, Package, ShoppingBag, Users, Image,
  Star, Tag, LogOut, Menu, X, LayoutGrid,
} from 'lucide-react'

const NAV = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/products',  icon: Package,          label: 'Products' },
  { to: '/admin/orders',    icon: ShoppingBag,      label: 'Orders' },
  { to: '/admin/users',     icon: Users,            label: 'Users' },
  { to: '/admin/banners',   icon: Image,            label: 'Banners' },
  { to: '/admin/categories', icon: LayoutGrid,     label: 'Categories' },
  { to: '/admin/reviews',   icon: Star,             label: 'Reviews' },
  { to: '/admin/coupons',   icon: Tag,              label: 'Coupons' },
]

export default function AdminLayout({ children }) {
  const { admin, logout } = useAdminAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/admin/login') }

  const Sidebar = ({ mobile }) => (
    <aside className={`
      ${mobile ? 'fixed inset-0 z-50 flex' : 'hidden md:flex'}
      flex-col w-64 bg-gray-900 text-white min-h-screen
    `}>
      {mobile && <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />}
      <div className={`relative flex flex-col w-64 h-full bg-gray-900 ${mobile ? 'shadow-2xl' : ''}`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-gray-900 text-sm">H</div>
          <div>
            <p className="font-semibold text-sm">HRK Jewellery</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
          {mobile && (
            <button onClick={() => setOpen(false)} className="ml-auto text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Admin navigation">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-amber-500 text-gray-900' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-700">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-gray-400">Logged in as</p>
            <p className="text-sm font-medium truncate">{admin?.name}</p>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      {open && <Sidebar mobile />}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setOpen(true)} className="text-gray-600 hover:text-gray-900" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-gray-800">HRK Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
