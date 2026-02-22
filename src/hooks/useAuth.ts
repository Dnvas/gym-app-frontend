import { useState, useEffect } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Profile {
  id: string
  username: string
  default_weight_unit: 'kg' | 'lbs'
  created_at: string
  updated_at: string
}

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }))

      if (session?.user) {
        fetchProfile(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }))

        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setState(prev => ({ ...prev, profile: null }))
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      setState(prev => ({ ...prev, profile: data }))
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  async function signIn(email: string, password: string) {
    setState(prev => ({ ...prev, loading: true, error: null }))

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }))
      return { success: false, error: error.message }
    }

    setState(prev => ({ ...prev, loading: false }))
    return { success: true, error: null }
  }

  async function signUp(email: string, password: string, username: string) {
    setState(prev => ({ ...prev, loading: true, error: null }))

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username, // This will be used by the trigger to create profile
        },
      },
    })

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }))
      return { success: false, error: error.message, needsVerification: false }
    }

    // Check if email confirmation is required
    const needsVerification = !data.session

    setState(prev => ({ ...prev, loading: false }))
    return { success: true, error: null, needsVerification }
  }

  async function signOut() {
    setState(prev => ({ ...prev, loading: true }))
    await supabase.auth.signOut()
    setState(prev => ({
      ...prev,
      session: null,
      user: null,
      profile: null,
      loading: false,
    }))
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!state.user) return { success: false, error: 'No user logged in' }

    setState(prev => ({ ...prev, loading: true }))

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', state.user.id)

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }))
      return { success: false, error: error.message }
    }

    // Refresh profile
    await fetchProfile(state.user.id)
    setState(prev => ({ ...prev, loading: false }))
    return { success: true, error: null }
  }

  return {
    session: state.session,
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.session,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile: () => state.user && fetchProfile(state.user.id),
  }
}
