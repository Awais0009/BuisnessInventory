'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signUp, resendConfirmationEmail } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    business_name: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [emailResent, setEmailResent] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleResendEmail = async () => {
    setResendingEmail(true)
    setEmailResent(false)
    
    try {
      const { error } = await resendConfirmationEmail(formData.email)
      if (error) {
        setError(error.message)
      } else {
        setEmailResent(true)
      }
    } catch {
      setError('Failed to resend confirmation email')
    } finally {
      setResendingEmail(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (!formData.email.trim()) {
      setError('Email is required')
      setLoading(false)
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (!formData.full_name.trim()) {
      setError('Full name is required')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      console.log('🔄 Starting registration process...');
      const { user, error } = await signUp({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        business_name: formData.business_name
      })
      
      console.log('📊 Registration result:', { user: !!user, error: error?.message });
      
      if (error) {
        console.log('❌ Registration error:', error.message);
        setError(error.message)
      } else if (user) {
        console.log('✅ Registration successful, user created:', user.email);
        setSuccess(true)
        // Don't redirect automatically, let user see success message
      } else {
        console.log('⚠️ Registration: No user returned and no error');
        setError('Registration failed - no user data returned')
      }
    } catch (err) {
      console.error('💥 Registration exception:', err);
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
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
                Account created successfully!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We&apos;ve sent a confirmation email to <strong>{formData.email}</strong>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Please check your email and click the confirmation link to activate your account.
              </p>
              
              {emailResent && (
                <div className="mt-3 bg-green-50 border border-green-300 text-green-700 px-3 py-2 rounded text-sm">
                  Confirmation email resent successfully!
                </div>
              )}
              
              <div className="mt-6 space-y-3">
                <Link
                  href="/auth/login"
                  className="block w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 text-center"
                >
                  Go to Login
                </Link>
                
                <button
                  onClick={handleResendEmail}
                  disabled={resendingEmail}
                  className="block w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {resendingEmail ? 'Resending...' : 'Resend Confirmation Email'}
                </button>
                
                <button
                  onClick={() => {
                    setSuccess(false)
                    setEmailResent(false)
                    setFormData({
                      email: '',
                      password: '',
                      confirmPassword: '',
                      full_name: '',
                      business_name: ''
                    })
                  }}
                  className="text-sm text-gray-600 hover:text-gray-500"
                >
                  Register another account
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>
              Create your business inventory account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="mt-1"
                  placeholder="Enter your full name"
                />
              </div>

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
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="business_name" className="block text-sm font-medium text-gray-700">
                  Business Name (Optional)
                </label>
                <Input
                  id="business_name"
                  name="business_name"
                  type="text"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  className="mt-1"
                  placeholder="Enter your business/company name"
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
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="mt-1"
                  placeholder="Create a password (min. 6 characters)"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="mt-1"
                  placeholder="Confirm your password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
