'use client'

import React from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { BottomNavigation } from './BottomNavigation'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface AppShellProps {
  children: React.ReactNode
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { isSidebarOpen, toggleSidebar, closeSidebar } = useSidebar()

  return (
    <div className="flex h-screen bg-[#0A0908] text-white overflow-hidden">
      {/* Sidebar — manages both desktop and mobile rendering internally */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Right side: header + content */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <TopBar onMenuClick={toggleSidebar} />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto bg-[#0A0908]">
          <div className="pb-20 lg:pb-0">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav — outside main so it doesn't scroll */}
        <BottomNavigation />
      </div>
    </div>
  )
}

export default AppShell
