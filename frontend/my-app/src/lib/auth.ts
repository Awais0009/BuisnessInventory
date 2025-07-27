// Custom Backend Authentication Library
// Connects to your Express JWT backend at http://localhost:3001

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  business_name?: string  // Changed from company_name to business_name
  role: 'admin' | 'manager' | 'user' | 'viewer'
  phone?: string
  address?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  user: UserProfile | null
  token: string | null
  error: Error | null
}

export interface SignUpData {
  email: string
  password: string
  full_name: string
  business_name?: string  // Changed from company_name to business_name
}

export interface SignInData {
  email: string
  password: string
}

// Helper function to get stored token
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

// Helper function to store token
export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('auth_token', token)
  // Also set as a cookie for server-side access
  document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
}

// Helper function to remove token
export function removeStoredToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('auth_token')
  // Also remove the cookie
  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

// API request helper with auth header
export async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken()
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
  return response
}

// Sign up new user
export async function signUp(data: SignUpData): Promise<AuthResponse> {
  try {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        business_name: data.business_name || '',
      }),
    })

    // First check the response as text to see if it's valid JSON
    const responseText = await response.text()
    console.log('Raw response text:', responseText)
    
    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.log('Response was not valid JSON:', responseText)
      throw new Error('Server returned invalid JSON response')
    }
    
    console.log('Registration response status:', response.status)
    console.log('Registration response result:', result)
    console.log('Registration response full object:', JSON.stringify(result, null, 2))
    console.log('Response data field:', result.data)
    console.log('Response data type:', typeof result.data)
    console.log('Response data keys:', result.data ? Object.keys(result.data) : 'No data field')

    if (!response.ok) {
      throw new Error(result.error || 'Registration failed')
    }

    // Backend returns: { success: true, data: { user: {...}, token: "..." } }
    console.log('Checking response structure:', {
      hasSuccess: 'success' in result,
      successValue: result.success,
      hasData: 'data' in result,
      dataValue: result.data,
      fullResult: result
    });
    
    if (result.success && result.data) {
      console.log('Registration successful, storing token and returning user')
      // Store the token
      setStoredToken(result.data.token)
      
      return {
        user: result.data.user,
        token: result.data.token,
        error: null
      }
    }

    console.log('Invalid response format - throwing error')
    throw new Error('Invalid response format')
  } catch (error) {
    console.error('Registration error:', error)
    return {
      user: null,
      token: null,
      error: error as Error
    }
  }
}

// Sign in existing user
export async function signIn(data: SignInData): Promise<AuthResponse> {
  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    })

    const result = await response.json()
    
    console.log('Login response:', { status: response.status, result })

    if (!response.ok) {
      throw new Error(result.error || 'Login failed')
    }

    // Backend returns: { success: true, data: { user: {...}, token: "..." } }
    if (result.success && result.data) {
      // Store the token
      setStoredToken(result.data.token)
      
      return {
        user: result.data.user,
        token: result.data.token,
        error: null
      }
    }

    throw new Error('Invalid response format')
  } catch (error) {
    return {
      user: null,
      token: null,
      error: error as Error
    }
  }
}

// Sign out user
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    // Call backend logout endpoint
    await apiRequest('/auth/logout', { method: 'POST' })
    
    // Remove token from storage
    removeStoredToken()
    
    return { error: null }
  } catch (error) {
    // Even if backend call fails, remove local token
    removeStoredToken()
    return { error: error as Error }
  }
}

// Get current user profile
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const token = getStoredToken()
    console.log('getCurrentUser - stored token:', token ? 'Token exists' : 'No token found')
    
    if (!token) return null

    const response = await apiRequest('/auth/profile')
    console.log('getCurrentUser - response status:', response.status)
    
    if (!response.ok) {
      console.log('getCurrentUser - response not OK, status:', response.status)
      if (response.status === 401) {
        console.log('getCurrentUser - Unauthorized, removing token')
        // Token expired or invalid
        removeStoredToken()
        return null
      }
      throw new Error('Failed to get user profile')
    }

    const result = await response.json()
    console.log('getCurrentUser - response result:', result)
    
    // Backend returns: { success: true, data: userProfile }
    if (result.success && result.data) {
      return result.data
    }

    return null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// Update user profile
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<{ error: Error | null }> {
  try {
    const response = await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error || 'Failed to update profile')
    }

    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}

// Verify token (check if user is still authenticated)
export async function verifyToken(): Promise<boolean> {
  try {
    const token = getStoredToken()
    if (!token) return false

    const response = await apiRequest('/auth/verify-token', { method: 'POST' })
    
    if (!response.ok) {
      removeStoredToken()
      return false
    }

    // Backend returns: { success: true, message: "Token is valid", user: {...} }
    const result = await response.json()
    return result.success === true
  } catch (error) {
    console.error('Token verification failed:', error)
    removeStoredToken()
    return false
  }
}

// Reset password - send reset email
export async function resetPassword(email: string): Promise<{ error: Error | null }> {
  try {
    const response = await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send reset email')
    }

    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}

// Confirm email with token
export async function confirmEmail(token: string): Promise<{ error: Error | null }> {
  try {
    const response = await apiRequest('/auth/confirm-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Email confirmation failed')
    }

    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}

// Reset password with token and new password
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ error: Error | null }> {
  try {
    const response = await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Password reset failed')
    }

    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}

// Resend confirmation email
export async function resendConfirmationEmail(email: string): Promise<{ error: Error | null }> {
  try {
    const response = await apiRequest('/auth/resend-confirmation', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to resend confirmation email')
    }

    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getStoredToken() !== null
}

// Test function to check backend connectivity
export async function testBackendConnection(): Promise<void> {
  try {
    console.log('Testing backend connection to:', API_BASE_URL)
    const response = await fetch(`${API_BASE_URL}/auth/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    console.log('Backend test response status:', response.status)
    const text = await response.text()
    console.log('Backend test response text:', text)
  } catch (error) {
    console.error('Backend connection test failed:', error)
  }
}
