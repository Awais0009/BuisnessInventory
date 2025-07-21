import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

/**
 * Enhanced authentication hook with session debugging
 */
export function useEnhancedAuth() {
  const auth = useAuth()
  const router = useRouter()
  const [sessionInfo, setSessionInfo] = useState<{
    hasSession: boolean
    isExpired: boolean
    expiresAt: string | null
    refreshToken: string | null
    accessToken: string | null
  }>({
    hasSession: false,
    isExpired: false,
    expiresAt: null,
    refreshToken: null,
    accessToken: null
  })

  // Check session status
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session check error:', error)
          setSessionInfo({
            hasSession: false,
            isExpired: true,
            expiresAt: null,
            refreshToken: null,
            accessToken: null
          })
          return
        }

        if (session) {
          const now = Math.floor(Date.now() / 1000)
          const expiresAt = session.expires_at || 0
          const isExpired = now >= expiresAt

          setSessionInfo({
            hasSession: true,
            isExpired,
            expiresAt: new Date(expiresAt * 1000).toISOString(),
            refreshToken: session.refresh_token ? 'present' : 'missing',
            accessToken: session.access_token ? 'present' : 'missing'
          })

          // Auto-refresh if expired
          if (isExpired) {
            console.log('Session expired, attempting refresh...')
            const { error: refreshError } = await supabase.auth.refreshSession()
            if (refreshError) {
              console.error('Session refresh failed:', refreshError)
              await supabase.auth.signOut()
              router.push('/landing')
            }
          }
        } else {
          setSessionInfo({
            hasSession: false,
            isExpired: false,
            expiresAt: null,
            refreshToken: null,
            accessToken: null
          })
        }
      } catch (error) {
        console.error('Session check failed:', error)
      }
    }

    checkSession()
    
    // Check session every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [router])

  const forceRefresh = async () => {
    try {
      const { error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Force refresh failed:', error)
        await supabase.auth.signOut()
        router.push('/landing')
      } else {
        console.log('Session refreshed successfully')
      }
    } catch (error) {
      console.error('Force refresh error:', error)
    }
  }

  const debugSession = () => {
    console.log('=== Authentication Debug Info ===')
    console.log('Auth Context:', {
      user: auth.user?.email,
      loading: auth.loading,
      hasProfile: !!auth.profile
    })
    console.log('Session Info:', sessionInfo)
    console.log('Local Storage Keys:', Object.keys(localStorage).filter(key => key.includes('supabase')))
    
    // Check for stored session
    const storedAuth = localStorage.getItem('sb-auth-token')
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth)
        console.log('Stored Auth Structure:', {
          hasAccessToken: !!parsed.access_token,
          hasRefreshToken: !!parsed.refresh_token,
          expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : 'N/A'
        })
      } catch {
        console.log('Stored auth is not valid JSON')
      }
    }
    console.log('================================')
  }

  return {
    ...auth,
    sessionInfo,
    forceRefresh,
    debugSession
  }
}
