'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Key, Fingerprint, Github, Chrome, Zap, ArrowRight, Loader2, Check, AlertCircle } from 'lucide-react'
import { sendEmailOtp, verifyEmailOtp, getOAuthUrl, generatePasskeyAuthOptions, verifyPasskeyAuth, verifyNostrAuth } from '@/lib/actions/auth'
import { startAuthentication } from '@simplewebauthn/browser'
import { getAccount, getClient } from '@/lib/appwrite/browser'

type AuthMethod = 'menu' | 'email-otp' | 'passkey'
type OtpStep = 'email' | 'otp'

export default function AuthPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [view, setView] = useState<AuthMethod>('menu')
  const [otpStep, setOtpStep] = useState<OtpStep>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const showError = (msg: string) => { setError(msg); setSuccess('') }
  const showSuccess = (msg: string) => { setSuccess(msg); setError('') }

  // ── Email OTP flow ────────────────────────────────────────────
  const handleSendOtp = () => {
    if (!email.trim()) return showError('Enter your email address')
    setLoading('email')
    startTransition(async () => {
      const result = await sendEmailOtp(email.trim())
      setLoading(null)
      if (result.success) {
        setUserId(result.userId!)
        setOtpStep('otp')
        showSuccess('Code sent! Check your inbox.')
      } else {
        showError(result.error || 'Failed to send code')
      }
    })
  }

  const handleVerifyOtp = () => {
    if (!otp.trim()) return showError('Enter the code from your email')
    setLoading('verify')
    startTransition(async () => {
      const result = await verifyEmailOtp(userId, otp.trim())
      setLoading(null)
      if (result.success) {
        showSuccess('Authenticated!')
        setTimeout(() => router.push('/home'), 800)
      } else {
        showError(result.error || 'Invalid code')
      }
    })
  }

  // ── OAuth ────────────────────────────────────────────────────
  const handleOAuth = async (provider: 'github' | 'google') => {
    setLoading(provider)
    const result = await getOAuthUrl(provider)
    window.location.href = result.url
  }

  // ── Passkey ─────────────────────────────────────────────────
  const handlePasskey = async () => {
    setLoading('passkey')
    setError('')
    try {
      const result = await generatePasskeyAuthOptions()
      const authResponse = await startAuthentication({ optionsJSON: result.options })
      const verification = await verifyPasskeyAuth(authResponse)
      setLoading(null)
      if (verification.success) {
        showSuccess('Authenticated with Passkey!')
        setTimeout(() => router.push('/home'), 800)
      } else {
        showError(verification.error || 'Passkey auth failed')
      }
    } catch (err: any) {
      setLoading(null)
      if (err.name === 'NotAllowedError') {
        showError('Passkey auth was cancelled')
      } else {
        showError(err.message || 'Passkey error')
      }
    }
  }

  // ── Nostr ────────────────────────────────────────────────────
  const handleNostr = async () => {
    setLoading('nostr')
    setError('')
    try {
      // @ts-ignore — window.nostr is provided by NIP-07 extension (Alby, nos2x, etc.)
      if (!window.nostr) {
        setLoading(null)
        return showError('No Nostr extension found. Install Alby or nos2x to continue.')
      }

      // Build a NIP-98 event
      const now = Math.floor(Date.now() / 1000)
      const event = {
        kind: 27235,
        created_at: now,
        tags: [['u', window.location.origin], ['method', 'GET']],
        content: '',
      }

      // @ts-ignore
      const signedEvent = await window.nostr.signEvent(event)
      const result = await verifyNostrAuth(signedEvent)
      setLoading(null)

      if (result.success) {
        showSuccess('Authenticated with Nostr!')
        setTimeout(() => router.push('/home'), 800)
      } else {
        showError(result.error || 'Nostr auth failed')
      }
    } catch (err: any) {
      setLoading(null)
      showError(err.message || 'Nostr signing failed')
    }
  }

  const authButtons = [
    {
      id: 'email-otp',
      label: 'Continue with Email',
      icon: Mail,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
      action: () => setView('email-otp'),
    },
    {
      id: 'passkey',
      label: 'Continue with Passkey',
      icon: Fingerprint,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30',
      action: handlePasskey,
    },
    {
      id: 'github',
      label: 'Continue with GitHub',
      icon: Github,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30',
      action: () => handleOAuth('github'),
    },
    {
      id: 'google',
      label: 'Continue with Google',
      icon: Chrome,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
      action: () => handleOAuth('google'),
    },
    {
      id: 'nostr',
      label: 'Continue with Nostr',
      icon: Zap,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30',
      action: handleNostr,
    },
  ]

  return (
    <div className="min-h-screen bg-[#0A0908] flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,136,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,136,0,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#ff8800] text-black font-bold text-xl mb-4 shadow-lg shadow-amber-500/20">
            C4
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Catch402</h1>
          <p className="text-neutral-500 text-sm mt-1">Non-custodial payment telemetry</p>
        </div>

        {/* Card */}
        <div className="bg-[#141211] border border-[#23211F] rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
          <AnimatePresence mode="wait">
            {view === 'menu' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
                className="p-6 space-y-3"
              >
                <p className="text-neutral-400 text-sm text-center mb-5">Choose how to sign in</p>
                {authButtons.map((btn) => {
                  const Icon = btn.icon
                  const isLoading = loading === btn.id
                  return (
                    <button
                      key={btn.id}
                      onClick={btn.action}
                      disabled={!!loading}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 text-left ${btn.bg} disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]`}
                    >
                      <div className={`flex-shrink-0 ${btn.color}`}>
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <span className="flex-1 text-white font-medium text-sm">{btn.label}</span>
                      {!isLoading && <ArrowRight className="h-4 w-4 text-neutral-600" />}
                    </button>
                  )
                })}
              </motion.div>
            )}

            {view === 'email-otp' && (
              <motion.div
                key="email-otp"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="p-6"
              >
                <button
                  onClick={() => { setView('menu'); setOtpStep('email'); setOtp(''); setError(''); setSuccess('') }}
                  className="text-neutral-500 hover:text-neutral-300 text-sm mb-6 flex items-center gap-1 transition-colors"
                >
                  ← Back
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold">Email Sign In</h2>
                    <p className="text-neutral-500 text-xs">
                      {otpStep === 'email' ? 'We\'ll send a one-time code' : `Code sent to ${email}`}
                    </p>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {otpStep === 'email' ? (
                    <motion.div key="email-input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                        placeholder="you@example.com"
                        className="w-full bg-[#0A0908] border border-[#23211F] focus:border-amber-500/50 rounded-xl px-4 py-3 text-white placeholder-neutral-600 outline-none transition-colors text-sm font-mono"
                      />
                      <button
                        onClick={handleSendOtp}
                        disabled={!!loading}
                        className="w-full bg-[#ff8800] hover:brightness-110 text-black font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                      >
                        {loading === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Send Code
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div key="otp-input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                        placeholder="6-digit code"
                        maxLength={6}
                        className="w-full bg-[#0A0908] border border-[#23211F] focus:border-amber-500/50 rounded-xl px-4 py-3 text-white placeholder-neutral-600 outline-none transition-colors text-center text-2xl font-mono tracking-widest"
                      />
                      <button
                        onClick={handleVerifyOtp}
                        disabled={!!loading || otp.length < 6}
                        className="w-full bg-[#ff8800] hover:brightness-110 text-black font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                      >
                        {loading === 'verify' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Verify Code
                      </button>
                      <button
                        onClick={() => setOtpStep('email')}
                        className="w-full text-neutral-500 hover:text-neutral-300 text-xs py-2 transition-colors"
                      >
                        Use a different email
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status messages */}
          <AnimatePresence>
            {(error || success) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-[#23211F] px-6 py-3"
              >
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    {success}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-neutral-700 text-xs mt-6">
          By signing in you accept Catch402&apos;s Terms of Service
        </p>
      </motion.div>
    </div>
  )
}
