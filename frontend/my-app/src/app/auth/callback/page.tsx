'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { confirmEmail, resetPasswordWithToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthCallback() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPasswordReset, setIsPasswordReset] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    
    if (!token) {
      setError('Invalid or missing token')
      setLoading(false)
      return
    }

    const handleEmailConfirmation = async (token: string) => {
      try {
        const { error } = await confirmEmail(token)
        
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Email confirmed successfully! You can now sign in.')
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/auth/login?confirmed=true')
          }, 3000)
        }
      } catch {
        setError('Failed to confirm email')
      } finally {
        setLoading(false)
      }
    }

    if (type === 'email_confirmation') {
      handleEmailConfirmation(token)
    } else if (type === 'password_reset') {
      setIsPasswordReset(true)
      setLoading(false)
    } else {
      setError('Invalid callback type')
      setLoading(false)
    }
  }, [searchParams, router])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setResetLoading(true)
    setError('')

    try {
      const token = searchParams.get('token')
      if (!token) {
        setError('Invalid token')
        return
      }

      const { error } = await resetPasswordWithToken(token, newPassword)
      
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Password reset successfully! You can now sign in with your new password.')
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      }
    } catch {
      setError('Failed to reset password')
    } finally {
      setResetLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Success!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {success}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Redirecting to login page...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isPasswordReset && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Reset your password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your new password below
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>New Password</CardTitle>
              <CardDescription>
                Choose a strong password for your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1"
                    placeholder="Enter new password (min. 6 characters)"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1"
                    placeholder="Confirm new password"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetLoading}
                >
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-medium text-gray-900">
              Error
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error}
            </p>
            <div className="mt-4">
              <Button
                onClick={() => router.push('/auth/login')}
                variant="outline"
              >
                Back to Login
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
