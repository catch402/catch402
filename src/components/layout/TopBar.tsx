'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { signOut } from '@/lib/actions/auth'
import { Menu, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react'

interface TopBarProps {
  onMenuClick: () => void
  mobile?: boolean
}

export function TopBar({ onMenuClick, mobile = false }: TopBarProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleSignOut = async () => {
    setDropdownOpen(false)
    await signOut()
    router.push('/auth')
  }

  return (
    <header className="h-14 flex items-center justify-between bg-[#0A0908] border-b border-[#1E1B19] px-4 lg:px-5 flex-shrink-0 z-30">
      {/* Mobile menu trigger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 text-neutral-500 hover:text-white rounded-xl transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop breadcrumb / page title area */}
      <div className="hidden lg:flex items-center gap-2 text-neutral-500 text-sm">
        <span className="text-white font-semibold">Catch402</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <button className="p-2 text-neutral-600 hover:text-neutral-200 hover:bg-[#141211] rounded-xl transition-colors">
          <Bell className="h-4 w-4" />
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((p) => !p)}
            className={cn(
              'flex items-center gap-2 p-1.5 rounded-xl transition-all duration-150',
              dropdownOpen ? 'bg-[#1E1B19]' : 'hover:bg-[#141211]'
            )}
          >
            <div className="h-7 w-7 rounded-lg bg-[#ff8800] text-black flex items-center justify-center font-bold text-xs flex-shrink-0">
              U
            </div>
            <ChevronDown className={cn('hidden lg:block h-3.5 w-3.5 text-neutral-600 transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-52 bg-[#141211] border border-[#23211F] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50"
              >
                <div className="p-1">
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-400 hover:text-white hover:bg-[#1E1B19] rounded-xl transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/5 rounded-xl transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

export default TopBar
