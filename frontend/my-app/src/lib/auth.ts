import { supabase } from './supabase-client'
import type { User, Session } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  company_name?: string
  role?: string
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  user: User | null
  session: Session | null
  error: Error | null
}

export interface SignUpData {
  email: string
  password: string
  full_name: string
  company_name?: string
}

export interface SignInData {
  email: string
  password: string
}

// Sign up new user
export async function signUp(data: SignUpData): Promise<AuthResponse> {
  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          company_name: data.company_name || '',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) throw error

    return {
      user: authData.user,
      session: authData.session,
      error: null
    }
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error as Error
    }
  }
}

// Sign in existing user
export async function signIn(data: SignInData): Promise<AuthResponse> {
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) throw error

    return {
      user: authData.user,
      session: authData.session,
      error: null
    }
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error as Error
    }
  }
}

// Sign out user
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// Get user profile
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}

// Update user profile
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}

// Reset password
export async function resetPassword(email: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}

// Update password
export async function updatePassword(newPassword: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}

// Listen to auth state changes
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback)
}
