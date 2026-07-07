'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'

// Routes that bypass the AppShell entirely
function isShelllessRoute(pathname: string) {
  return (
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/pitch') ||
    pathname.startsWith('/u/') // public payment challenge pages
  )
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isShelllessRoute(pathname)) {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}
