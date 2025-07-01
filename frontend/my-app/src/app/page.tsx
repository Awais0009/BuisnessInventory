'use client';

import { Navbar } from '@/components/dashboard/Navbar';
import { InventoryList } from '@/components/dashboard/InventoryList';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { TransactionModal } from '@/components/dashboard/TransactionModal';
import { AddCropModal } from '@/components/AddCropModal';
import { Toaster } from 'sonner';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Navbar />
      <Toaster position="top-right" richColors />
      <AddCropModal />
      <main className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Crop Inventory Dashboard
            </h1>
            <p className="text-gray-600">
              Manage your crop inventory, track transactions, and monitor stock levels
            </p>
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
    </div>
  );
}
