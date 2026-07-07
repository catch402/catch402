'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { signOut } from '@/lib/actions/auth'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Activity,
  Settings,
  LogOut,
  Zap,
  Radio,
  Bell,
  X,
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigation = [
  {
    group: 'Monitor',
    items: [
      { name: 'Dashboard', href: '/home', icon: LayoutDashboard },
      { name: 'Route Watches', href: '/home', icon: Activity },
    ],
  },
  {
    group: 'Configure',
    items: [
      { name: 'Egress Settings', href: '/settings', icon: Radio },
    ],
  },
]

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth')
  }

  const sidebarContent = (
    <aside className="bg-[#0A0908] border-r border-[#1E1B19] h-full flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-[#1E1B19] flex-shrink-0">
        <Link href="/home" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#ff8800] text-black font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
            C4
          </div>
          <span className="text-white font-semibold text-sm">Catch402</span>
        </Link>
        <button onClick={onClose} className="lg:hidden text-neutral-600 hover:text-white p-1 rounded-lg transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {navigation.map((group) => (
          <div key={group.group}>
            <p className="px-3 text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1.5">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => onClose()}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-[#ff8800]/10 text-[#ff8800] shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-200 hover:bg-[#141211]'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-[#ff8800]' : 'text-neutral-600')} />
                    {item.name}
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ff8800]" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-[#1E1B19] pt-3 space-y-0.5 flex-shrink-0">
        <Link
          href="/settings"
          onClick={() => onClose()}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
            pathname === '/settings'
              ? 'bg-[#ff8800]/10 text-[#ff8800]'
              : 'text-neutral-500 hover:text-neutral-200 hover:bg-[#141211]'
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar (drawer) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 z-50 h-full w-64 lg:hidden"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar (always visible) */}
      <div className="hidden lg:flex h-full w-64 flex-shrink-0">
        {sidebarContent}
      </div>
    </>
  )
}

export default Sidebar
