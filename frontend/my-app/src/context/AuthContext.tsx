'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'
import { UserProfile, getUserProfile } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await getUserProfile(user.id)
      setProfile(userProfile)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    } else {
      setUser(null)
      setProfile(null)
      setSession(null)
    }
  }

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        setLoading(true)
        
        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          // Clear any corrupted session data
          await supabase.auth.signOut()
          return
        }

        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            try {
              const userProfile = await getUserProfile(session.user.id)
              if (mounted) {
                setProfile(userProfile)
              }
            } catch (profileError) {
              console.error('Error fetching profile:', profileError)
              // Don't sign out for profile errors, user might still be valid
            }
          }
        }
      } catch (error) {
        console.error('Unexpected error in getInitialSession:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      if (!mounted) return

      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            try {
              const userProfile = await getUserProfile(session.user.id)
              if (mounted) {
                setProfile(userProfile)
              }
            } catch (error) {
              console.error('Error fetching profile after auth change:', error)
            }
          }
          break
          
        case 'SIGNED_OUT':
          setSession(null)
          setUser(null)
          setProfile(null)
          break
          
        case 'PASSWORD_RECOVERY':
          // Handle password recovery if needed
          break
          
        default:
          setSession(session)
          setUser(session?.user ?? null)
          if (!session?.user) {
            setProfile(null)
          }
      }
      
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    user,
    profile,
    session,
    loading,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
