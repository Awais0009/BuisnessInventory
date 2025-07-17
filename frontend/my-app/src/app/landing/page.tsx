'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Business Inventory
              </h1>
            </div>
            <div className="flex space-x-4">
              <Link href="/auth/login">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Modern Business</span>
            <span className="block text-green-600">Inventory Management</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Streamline your business operations with our comprehensive inventory management system.
            Track products, manage transactions, and analyze your business performance all in one place.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">    
            <div className="rounded-md shadow">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full">
                  Start Your Free Trial
                </Button>
              </Link>
            </div>
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
              <Link href="/auth/login">
                <Button variant="outline" size="lg" className="w-full">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">       
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    📦
                  </div>
                  Inventory Tracking
                </CardTitle>
                <CardDescription>
                  Monitor stock levels, track product movements, and get real-time updates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    💼
                  </div>
                  Transaction Management
                </CardTitle>
                <CardDescription>
                  Record and track all business transactions with detailed reporting   
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="bg-purple-100 p-2 rounded-lg mr-3">
                    📊
                  </div>
                  Analytics & Reports
                </CardTitle>
                <CardDescription>
                  Get insights into your business performance with comprehensive analytics
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="bg-yellow-100 p-2 rounded-lg mr-3">
                    🔒
                  </div>
                  Secure & Reliable
                </CardTitle>
                <CardDescription>
                  Your data is protected with enterprise-grade security and regular backups
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="bg-red-100 p-2 rounded-lg mr-3">
                    👥
                  </div>
                  Multi-User Access
                </CardTitle>
                <CardDescription>
                  Collaborate with your team with role-based access control
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                    📱
                  </div>
                  Mobile Responsive
                </CardTitle>
                <CardDescription>
                  Access your inventory from anywhere with our responsive design       
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Join thousands of businesses already using our platform to manage their inventory.
          </p>
          <div className="mt-8">
            <Link href="/auth/signup">
              <Button size="lg">
                Create Your Account
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2024 Business Inventory Management. All rights reserved.</p>     
          </div>
        </div>
      </footer>
    </div>
  )
}
