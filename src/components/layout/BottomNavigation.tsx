'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Activity, Radio, Settings } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/home', icon: LayoutDashboard },
  { name: 'Watches', href: '/home', icon: Activity },
  { name: 'Egress', href: '/settings', icon: Radio },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#0A0908] border-t border-[#1E1B19] lg:hidden">
      {/* Safe area padding for devices with home indicator */}
      <div className="flex items-center justify-around px-2 py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all duration-150',
                isActive
                  ? 'text-[#ff8800]'
                  : 'text-neutral-600 hover:text-neutral-300'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-xl transition-colors',
                isActive ? 'bg-[#ff8800]/10' : ''
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={cn('text-[10px] font-semibold', isActive ? 'text-[#ff8800]' : 'text-neutral-600')}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNavigation
