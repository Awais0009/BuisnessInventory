'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { Navbar } from '@/components/dashboard/Navbar';
import { InventoryList } from '@/components/dashboard/InventoryList';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { TransactionModal } from '@/components/dashboard/TransactionModal';
import { BulkTransactionModal } from '@/components/dashboard/BulkTransactionModal';
import { AddCropModal } from '@/components/AddCropModal';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { Toaster } from 'sonner';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { state, dispatch } = useInventory();
  const router = useRouter();

  useEffect(() => {
    // If not loading and no user, redirect to landing page
    if (!loading && !user) {
      router.push('/landing');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Navbar />
      <Toaster position="top-right" richColors />
      <AddCropModal />
      <main className="pt-20 pb-8">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Crop Inventory Dashboard
                </h1>
                <p className="text-gray-600">
                  Manage your crop inventory, track transactions, and monitor stock levels
                </p>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={() => dispatch({ type: 'SET_BULK_TRANSACTION_MODAL_OPEN', payload: true })}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Bulk Transaction</span>
                </Button>
              </div>
            </div>
          </div>
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Inventory List - Takes 2/3 of the space */}
            <div className="lg:col-span-2">
              <InventoryList />
            </div>
            {/* Recent Transactions - Takes 1/3 of the space */}
            <div className="lg:col-span-1">
              <RecentTransactions />
            </div>
          </div>
        </div>
      </main>
      <TransactionModal />
      <BulkTransactionModal 
        isOpen={state.isBulkTransactionModalOpen}
        onClose={() => dispatch({ type: 'SET_BULK_TRANSACTION_MODAL_OPEN', payload: false })}
      />
    </div>
  );
}