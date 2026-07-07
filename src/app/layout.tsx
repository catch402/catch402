import type { Metadata } from 'next'
import './globals.css'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { WalletProvider } from '@/contexts/WalletContext'
import { TransactionProvider } from '@/contexts/TransactionContext'
import { PaymentRequestProvider } from '@/contexts/PaymentRequestContext'
import { ExchangeRateProvider } from '@/contexts/ExchangeRateContext'
import { CapitalProvider } from '@/contexts/CapitalContext'
import LayoutClient from './layoutClient'

export const metadata: Metadata = {
  title: 'Catch402 | Payment Telemetry Router',
  description: 'Non-custodial serverless transaction telemetry router for the open web.',
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
        <AuthProvider>
          <ExchangeRateProvider>
            <WalletProvider>
              <TransactionProvider>
                <PaymentRequestProvider>
                  <CapitalProvider>
                    <SidebarProvider>
                      <LayoutClient>{children}</LayoutClient>
                    </SidebarProvider>
                  </CapitalProvider>
                </PaymentRequestProvider>
              </TransactionProvider>
            </WalletProvider>
          </ExchangeRateProvider>
        </AuthProvider>
      </body>
    </html>
  )
}