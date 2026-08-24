'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
            getNotDisplayedReason: () => string
            getSkippedReason: () => string
          }) => void) => void
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

export default function GoogleIdentityButton({ nextPath, className = '' }: GoogleIdentityButtonProps) {
  const router = useRouter()
  const buttonRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gisReady, setGisReady] = useState(false)
  const nonceRef = useRef<string>('')

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId || !buttonRef.current) return

    let script: HTMLScriptElement | null = null
    let cancelled = false

    const init = async () => {
      try {
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

        setGisReady(true)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Google sign-in unavailable.'
        setError(message)
        setGisReady(false)
      }
    }

    init()

    return () => {
      cancelled = true
      if (script && document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [clientId, nextPath, router])

  // Silent fallback: if GIS fails to load, show a plain Google button that
  // falls back to the legacy Supabase OAuth redirect (still showing flux3d.in
  // on the first screen, though Google may show the Supabase callback on
  // the consent step). This is a last-resort fallback, not the primary path.
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

  if (!clientId) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        Google sign-in is not configured.
      </p>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Google renders its branded button into this div */}
      <div
        ref={buttonRef}
        className={`w-full ${!gisReady ? 'min-h-[40px]' : ''}`}
        aria-label="Sign in with Google"
      />

      {/* If GIS failed to load, show our own fallback button */}
      {!gisReady && !loading && (
        <button
          type="button"
          onClick={handleFallbackLogin}
          disabled={loading}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
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
          Continue with Google
        </button>
      )}

      {loading && (
        <p className="text-center text-sm font-medium text-gray-500">Signing in with Google...</p>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
