import React, { createContext, useContext, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { useAuth } from '../hooks/useAuth'

interface Profile {
  id: string
  username: string
  default_weight_unit: 'kg' | 'lbs'
  created_at: string
  updated_at: string
}

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>
  signUp: (email: string, password: string, username: string) => Promise<{ success: boolean; error: string | null; needsVerification: boolean }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error: string | null }>
  refreshProfile: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
