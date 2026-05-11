import { useState, useEffect, useCallback } from 'react'
import { supabase, signInWithGoogle, signOut } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

const GOOGLE_TOKEN_KEY = 'google_provider_token'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [googleToken, setGoogleToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // On mount, check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        const storedToken = localStorage.getItem(GOOGLE_TOKEN_KEY)
        if (storedToken) setGoogleToken(storedToken)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)

      if (event === 'SIGNED_IN' && session?.provider_token) {
        localStorage.setItem(GOOGLE_TOKEN_KEY, session.provider_token)
        setGoogleToken(session.provider_token)

        // Clean URL hash after capturing tokens from OAuth redirect
        if (window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname)
        }
      }

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(GOOGLE_TOKEN_KEY)
        setGoogleToken(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshGoogleToken = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) throw error
    if (data.session?.provider_token) {
      localStorage.setItem(GOOGLE_TOKEN_KEY, data.session.provider_token)
      setGoogleToken(data.session.provider_token)
      return data.session.provider_token
    }
    throw new Error('Could not refresh Google token')
  }, [])

  return {
    session,
    googleToken,
    loading,
    userId: session?.user?.id ?? null,
    signIn: signInWithGoogle,
    signOut,
    refreshGoogleToken,
  }
}
