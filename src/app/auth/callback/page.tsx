'use client'

import { useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { finalizeOAuthSession } from '@/lib/actions/auth'
import { getAccount } from '@/lib/appwrite/browser'
import { Loader2 } from 'lucide-react'
import { Suspense } from 'react'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  useEffect(() => {
    const provider = searchParams.get('provider')
    const error = searchParams.get('error')

    if (error) {
      router.push(`/auth?error=oauth_failed`)
      return
    }

    // After Appwrite OAuth redirect, the session cookie is already set by Appwrite.
    // We just need to read the session from the account object.
    startTransition(async () => {
      try {
        const account = getAccount()
        const session = await account.getSession('current')
        if (session) {
          await finalizeOAuthSession(session.$id)
          router.push('/home')
        } else {
          router.push('/auth?error=session_not_found')
        }
      } catch {
        router.push('/auth?error=oauth_failed')
      }
    })
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-[#0A0908] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#ff8800] text-black font-bold text-lg flex items-center justify-center">
          C4
        </div>
        <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
        <p className="text-neutral-500 text-sm">Completing sign in...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
