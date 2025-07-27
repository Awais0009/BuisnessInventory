'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { UserProfile, getCurrentUser, signOut as authSignOut, verifyToken } from '@/lib/auth'

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    try {
      const userProfile = await getCurrentUser()
      setUser(userProfile)
    } catch (error) {
      console.error('Error refreshing profile:', error)
      setUser(null)
    }
  }

  const signOut = async () => {
    try {
      await authSignOut()
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
      // Force local sign out even if backend call fails
      setUser(null)
    }
  }

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First check if there's a stored token
        const storedToken = localStorage.getItem('auth_token')
        console.log('AuthContext - Initialize auth, token exists:', !!storedToken)
        
        if (!storedToken) {
          console.log('AuthContext - No token found, setting user to null')
          setUser(null)
          setLoading(false)
          return
        }

        // Check if token is valid
        console.log('AuthContext - Verifying token...')
        const isValid = await verifyToken()
        console.log('AuthContext - Token verification result:', isValid)
        
        if (isValid) {
          // Get user profile
          console.log('AuthContext - Getting user profile...')
          const userProfile = await getCurrentUser()
          console.log('AuthContext - User profile retrieved:', !!userProfile)
          setUser(userProfile)
        } else {
          console.log('AuthContext - Token invalid, clearing user')
          setUser(null)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    signOut,
    refreshProfile,
    isAuthenticated: user !== null
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
