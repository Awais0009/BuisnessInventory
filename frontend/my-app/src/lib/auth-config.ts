/**
 * Session Configuration for Supabase Authentication
 * 
 * This file contains configuration for optimal session handling
 * to ensure users stay logged in across browser sessions and
 * app restarts during development.
 */

export const AUTH_CONFIG = {
  // Session duration (in seconds) - 24 hours by default
  SESSION_DURATION: 24 * 60 * 60,
  
  // Token refresh threshold (refresh when this much time is left)
  REFRESH_THRESHOLD: 5 * 60, // 5 minutes
  
  // Storage keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'sb-auth-token',
    USER_PROFILE: 'user-profile-cache',
    LAST_ACTIVITY: 'last-activity'
  },
  
  // Development vs Production settings
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  
  // Session persistence options
  PERSISTENCE: {
    // Always persist sessions in development
    ALWAYS_PERSIST_DEV: true,
    
    // Auto-refresh tokens when close to expiry
    AUTO_REFRESH: true,
    
    // Remember user preference for "Remember Me"
    REMEMBER_USER: true,
    
    // Clear session on browser close (set to false for persistent sessions)
    CLEAR_ON_CLOSE: false
  }
}

/**
 * Utility functions for session management
 */
export const SessionUtils = {
  /**
   * Check if session should persist based on environment and user preferences
   */
  shouldPersistSession(): boolean {
    if (AUTH_CONFIG.IS_DEVELOPMENT && AUTH_CONFIG.PERSISTENCE.ALWAYS_PERSIST_DEV) {
      return true
    }
    
    const rememberMe = localStorage.getItem('remember-me') === 'true'
    return rememberMe || !AUTH_CONFIG.PERSISTENCE.CLEAR_ON_CLOSE
  },

  /**
   * Update last activity timestamp
   */
  updateLastActivity(): void {
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString())
  },

  /**
   * Check if session should be refreshed
   */
  shouldRefreshSession(expiresAt: number): boolean {
    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = expiresAt - now
    return timeUntilExpiry <= AUTH_CONFIG.REFRESH_THRESHOLD
  },

  /**
   * Get time until session expires (in seconds)
   */
  getTimeUntilExpiry(expiresAt: number): number {
    const now = Math.floor(Date.now() / 1000)
    return Math.max(0, expiresAt - now)
  },

  /**
   * Format expiry time for display
   */
  formatExpiryTime(expiresAt: number): string {
    const timeLeft = this.getTimeUntilExpiry(expiresAt)
    
    if (timeLeft <= 0) return 'Expired'
    
    const hours = Math.floor(timeLeft / 3600)
    const minutes = Math.floor((timeLeft % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }
}

/**
 * Development helper for debugging sessions
 */
export const DebugHelpers = {
  logSessionInfo(session: unknown) {
    if (!AUTH_CONFIG.IS_DEVELOPMENT) return
    
    console.group('🔐 Session Debug Info')
    console.log('Session exists:', !!session)
    if (session && typeof session === 'object' && session !== null) {
      const s = session as { user?: { email?: string }; expires_at?: number }
      console.log('User email:', s.user?.email)
      if (s.expires_at) {
        console.log('Expires at:', new Date(s.expires_at * 1000).toLocaleString())
        console.log('Time until expiry:', SessionUtils.formatExpiryTime(s.expires_at))
        console.log('Should refresh:', SessionUtils.shouldRefreshSession(s.expires_at))
      }
    }
    console.log('Should persist:', SessionUtils.shouldPersistSession())
    console.log('Environment:', AUTH_CONFIG.IS_DEVELOPMENT ? 'Development' : 'Production')
    console.groupEnd()
  },

  logAuthEvent(event: string, details?: unknown) {
    if (!AUTH_CONFIG.IS_DEVELOPMENT) return
    
    console.log(`🔐 Auth Event: ${event}`, details || '')
  }
}
