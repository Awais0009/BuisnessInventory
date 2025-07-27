'use client';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, User, LogIn, LogOut, BarChart3, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/30 backdrop-blur-md shadow-md border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">🌾</span>
            </div>
            <span className="text-lg font-semibold text-gray-800 dark:text-white">
              Crop Inventory
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/">
              <Button variant="ghost" className="flex items-center space-x-2 hover:bg-white/20">
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Button>
            </Link>
            
            <Link href="/investment-overview">
              <Button variant="ghost" className="flex items-center space-x-2 hover:bg-white/20">
                <BarChart3 className="w-4 h-4" />
                <span>Investment Overview</span>
              </Button>
            </Link>
            
            <Link href="/transaction-ledger">
              <Button variant="ghost" className="flex items-center space-x-2 hover:bg-white/20">
                <FileText className="w-4 h-4" />
                <span>Transaction Ledger</span>
              </Button>
            </Link>
            
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {user?.full_name || user?.email}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
} 