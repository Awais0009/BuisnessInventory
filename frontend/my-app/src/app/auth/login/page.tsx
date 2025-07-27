'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn, resendConfirmationEmail } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [resendingEmail, setResendingEmail] = useState(false)
  const [showResendOption, setShowResendOption] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for messages in URL params
    const urlError = searchParams.get('error')
    const confirmed = searchParams.get('confirmed')
    
    if (urlError === 'callback_error') {
      setError('There was an error processing your email verification. Please try again.')
    } else if (urlError === 'unexpected_error') {
      setError('An unexpected error occurred. Please try again.')
    } else if (confirmed === 'true') {
      setError('') // Clear any errors
      setSuccessMessage('Your email has been confirmed! Please log in with your credentials.')
    }
  }, [searchParams])

  const handleResendEmail = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    setResendingEmail(true)
    try {
      const { error } = await resendConfirmationEmail(email)
      if (error) {
        setError(`Failed to resend confirmation email: ${error.message}`)
      } else {
        setSuccessMessage('Confirmation email has been resent! Please check your inbox.')
        setError('')
        setShowResendOption(false)
      }
    } catch {
      setError('Failed to resend confirmation email. Please try again.')
    } finally {
      setResendingEmail(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('🔄 Starting login process for:', email);
      const { user, error } = await signIn({ email, password })
      
      console.log('📊 Login result:', { user: !!user, error: error?.message });
      
      if (error) {
        console.log('❌ Login error:', error.message);
        // Provide more helpful error messages
        if (error.message.includes('confirm your email')) {
          setError('Please confirm your email address before logging in. Check your email for the confirmation link.');
          setShowResendOption(true);
        } else if (error.message.includes('Invalid email or password')) {
          setError('Invalid email or password. Please check your credentials and try again.');
          setShowResendOption(false);
        } else {
          setError(error.message);
          setShowResendOption(false);
        }
      } else if (user) {
        console.log('✅ Login successful, user:', user.email);
        // Force reload the page to reinitialize AuthContext
        window.location.href = '/';
      } else {
        console.log('⚠️ Login: No user returned and no error');
        setError('Login failed - please try again');
      }
    } catch (err) {
      console.error('💥 Login exception:', err);
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              href="/auth/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
                  {error}
                  {showResendOption && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleResendEmail}
                        disabled={resendingEmail}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50"
                      >
                        {resendingEmail ? 'Sending...' : 'Resend Confirmation Email'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {successMessage && (
                <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded">
                  {successMessage}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex items-center justify-between">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
