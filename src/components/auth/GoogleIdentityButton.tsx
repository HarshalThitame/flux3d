'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type GoogleIdentityButtonProps = {
  nextPath: string
  className?: string
}

// Google Identity Services global types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential?: string; error?: string }) => void
            nonce?: string
            use_fedcm_for_prompt?: boolean
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
            itp_support?: boolean
            context?: 'signin' | 'signup' | 'use'
            ux_mode?: 'popup' | 'redirect'
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon'
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              logo_alignment?: 'left' | 'center'
              width?: string | number
              locale?: string
            }
          ) => void
          prompt: (momentListener?: (notification: {
            isNotDisplayed: () => boolean
            isSkippedMoment: () => boolean
            isDismissedMoment: () => boolean
            getNotDisplayedReason: () => string
            getSkippedReason: () => string
            getDismissedReason: () => string
          }) => void) => void
          cancel: () => void
        }
      }
    }
  }
}

async function generateNonce(): Promise<[string, string]> {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  const encoder = new TextEncoder()
  const encodedNonce = encoder.encode(nonce)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return [nonce, hashedNonce]
}

function GoogleGIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

export default function GoogleIdentityButton({ nextPath, className = '' }: GoogleIdentityButtonProps) {
  const router = useRouter()
  const buttonRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gisReady, setGisReady] = useState(false)
  const [gisInitializing, setGisInitializing] = useState(true)
  const nonceRef = useRef<string>('')

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId || !buttonRef.current) return

    let script: HTMLScriptElement | null = null
    let cancelled = false

    const init = async () => {
      try {
        setGisInitializing(true)

        // Load Google Identity Services script if not already present
        if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
          script = document.createElement('script')
          script.src = 'https://accounts.google.com/gsi/client'
          script.async = true
          script.defer = true
          document.head.appendChild(script)

          await new Promise<void>((resolve, reject) => {
            script!.onload = () => resolve()
            script!.onerror = () => reject(new Error('Failed to load Google Identity Services'))
          })
        }

        if (cancelled) return

        if (!window.google?.accounts?.id) {
          throw new Error('Google Identity Services not available')
        }

        const [nonce, hashedNonce] = await generateNonce()
        nonceRef.current = nonce

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (response.error) {
              setError('Google sign-in was cancelled or failed.')
              setLoading(false)
              return
            }
            if (!response.credential) {
              setError('No credential returned from Google.')
              setLoading(false)
              return
            }

            setLoading(true)
            setError(null)

            try {
              const supabase = getSupabaseBrowserClient()
              const { data, error: signInError } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: response.credential,
                nonce: nonceRef.current,
              })

              if (signInError) {
                throw signInError
              }

              if (data.session) {
                router.push(nextPath)
              } else {
                throw new Error('No session created.')
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Sign-in failed.'
              setError(message)
              setLoading(false)
            }
          },
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
          auto_select: true,
          itp_support: true,
          cancel_on_tap_outside: false,
          context: 'signin',
          ux_mode: 'popup',
        })

        if (cancelled || !buttonRef.current) return

        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: '100%',
          locale: 'en',
        })

        // Trigger One Tap prompt for returning users.
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason()
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
              console.log('[GIS] One Tap not displayed:', reason)
            }
          } else if (notification.isSkippedMoment()) {
            const reason = notification.getSkippedReason()
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
              console.log('[GIS] One Tap skipped:', reason)
            }
          }
        })

        setGisReady(true)
        setGisInitializing(false)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Google sign-in unavailable.'
        setError(message)
        setGisReady(false)
        setGisInitializing(false)
      }
    }

    init()

    return () => {
      cancelled = true
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.cancel()
        } catch {
          // cancel() may throw if no prompt is active — safe to ignore.
        }
      }
      if (script && document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [clientId, nextPath, router])

  const handleFallbackLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (oauthError) {
        throw oauthError
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Redirect failed.'
      setError(message)
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setGisInitializing(true)
    setGisReady(false)
    // Force re-mount by briefly clearing the ref content
    if (buttonRef.current) {
      buttonRef.current.innerHTML = ''
    }
    // The useEffect will re-run because we change a state that doesn't affect deps,
    // but we need a better approach. Let's just reload the page for simplicity.
    window.location.reload()
  }

  if (!clientId) {
    return (
      <div className="rounded-2xl border border-red-200/60 bg-red-50/80 px-4 py-3 text-sm text-red-700">
        Google sign-in is not configured.
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/*
        Premium glass-morphism container.
        Wraps the Google button in a frosted-glass panel that matches
        the Flux3D premium auth aesthetic.
      */}
      <div
        className="group relative overflow-hidden rounded-2xl border border-[rgba(91,33,182,0.12)] bg-white/60 p-1 transition-all duration-300 ease-out hover:border-[rgba(91,33,182,0.22)] hover:shadow-[0_4px_20px_rgba(91,33,182,0.10)] hover:-translate-y-px"
        style={{
          boxShadow: '0 2px 12px rgba(91, 33, 182, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
      >
        {/* Subtle gradient overlay on hover */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.03) 0%, rgba(168,85,247,0.02) 100%)',
          }}
        />

        {/* Inner padding area */}
        <div className="relative rounded-xl bg-white px-2 py-2">
          {/* Google renders its branded button into this div */}
          <div
            ref={buttonRef}
            className={`w-full ${!gisReady && gisInitializing ? 'min-h-[44px]' : ''}`}
            aria-label="Sign in with Google"
          />

          {/* Shimmer loading state while GIS initializes */}
          {gisInitializing && !gisReady && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/90 px-4">
              <div className="flex w-full items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-200">
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 overflow-hidden rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100">
                    <div className="h-full w-full animate-pulse bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  </div>
                  <div className="h-2 w-1/2 overflow-hidden rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100">
                    <div className="h-full w-full animate-pulse bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Premium fallback button — rendered when GIS fails to load */}
      {!gisReady && !gisInitializing && (
        <button
          type="button"
          onClick={handleFallbackLogin}
          disabled={loading}
          className="premium-google-fallback relative inline-flex h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-[rgba(91,33,182,0.18)] bg-white px-5 text-sm font-bold text-[#070b1d] shadow-[0_2px_8px_rgba(91,33,182,0.05),0_8px_24px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:border-[rgba(91,33,182,0.35)] hover:bg-[rgba(91,33,182,0.03)] hover:shadow-[0_4px_16px_rgba(91,33,182,0.10),0_12px_32px_rgba(0,0,0,0.04)] hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {/* Shine sweep pseudo-element handled via inline style + custom class */}
          <span
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: 'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.18) 38%, rgba(255,255,255,0.30) 50%, rgba(255,255,255,0.18) 62%, transparent 100%)',
              transform: 'translateX(-130%)',
              transition: 'transform 700ms ease',
            }}
          />
          <GoogleGIcon className="h-5 w-5" />
          <span className="relative z-10">Continue with Google</span>
        </button>
      )}

      {/* Premium loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-[rgba(91,33,182,0.10)] bg-[rgba(91,33,182,0.02)] px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-[#6d28d9]" aria-hidden="true" />
          <span className="text-sm font-semibold text-[#6d28d9]">Establishing secure session...</span>
        </div>
      )}

      {/* Premium error state */}
      {error && (
        <div className="overflow-hidden rounded-2xl border border-red-200/60 bg-red-50/80 shadow-[0_2px_8px_rgba(220,38,38,0.06)]">
          <div className="flex items-start gap-3 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-700">{error}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm transition hover:bg-red-50"
                >
                  Try Again
                </button>
                <span className="text-xs text-red-400">or</span>
                <button
                  type="button"
                  onClick={() => {
                    const emailInput = document.getElementById('email')
                    emailInput?.focus()
                  }}
                  className="text-xs font-bold text-red-600 underline decoration-red-300 underline-offset-2 transition hover:text-red-800"
                >
                  use password instead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
