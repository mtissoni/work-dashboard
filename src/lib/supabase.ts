import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar.readonly',
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
      },
    },
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}
