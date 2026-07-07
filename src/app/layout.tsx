import type { Metadata } from 'next'
import './globals.css'
import { SidebarProvider } from '@/contexts/SidebarContext'
import LayoutClient from './layoutClient'

export const metadata: Metadata = {
  title: 'Catch402 | Payment Telemetry Router',
  description: 'Non-custodial serverless transaction telemetry router for the open web.',
  keywords: ['payment', 'telemetry', 'nostr', 'bitcoin', 'http 402', 'x402'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans">
        <SidebarProvider>
          <LayoutClient>{children}</LayoutClient>
        </SidebarProvider>
      </body>
    </html>
  )
}