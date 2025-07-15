import React, { useState } from 'react';
import { CropAnalyticsFilters } from './CropAnalyticsFilters';
import { CropAnalyticsBarChart } from './CropAnalyticsBarChart';
import { CropProfitTrendChart } from './CropProfitTrendChart';
import { useInventory } from '@/context/InventoryContext';

export default function CropAnalyticsDashboard() {
  const { state } = useInventory();
  const allCrops = state.crops.map(c => c.name);

  // Find min and max transaction dates
  const transactionDates = state.transactions.map(t => t.date).sort((a, b) => a.getTime() - b.getTime());
  const minDate = transactionDates.length ? transactionDates[0] : new Date();
  const maxDate = transactionDates.length ? transactionDates[transactionDates.length - 1] : new Date();

  // Filter state
  const [selectedCrops, setSelectedCrops] = useState<string[]>(allCrops);
  const [dateRange, setDateRange] = useState<{ start: Date|null; end: Date|null }>({ start: minDate, end: maxDate });
  const [transactionType, setTransactionType] = useState<'both' | 'buy' | 'sell'>('both');
  const [cropSearch, setCropSearch] = useState('');

  // Clear all filters
  const clearAll = () => {
    setSelectedCrops(allCrops);
    setDateRange({ start: minDate, end: maxDate });
    setTransactionType('both');
    setCropSearch('');
  };

  const currencyFormatter = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 });
  const totalInvested = state.transactions.filter(t => t.action === 'buy').reduce((sum, t) => sum + t.total, 0);
  const totalReturns = state.transactions.filter(t => t.action === 'sell').reduce((sum, t) => sum + t.total, 0);
  const netAmount = totalReturns - totalInvested;

  if (!state.crops || state.crops.length === 0) {
    return <div className="text-center text-red-500 py-20">No crops available in inventory.</div>;
  }
  if (!state.transactions || state.transactions.length === 0) {
    return <div className="text-center text-red-500 py-20">No transactions available in inventory.</div>;
  }

  // Debug log for props passed to CropProfitTrendChart
  console.log('DASHBOARD: Passing to CropProfitTrendChart', { selectedCrops, transactions: state.transactions, dateRange, transactionType });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Navbar */}
      <nav className="bg-white shadow px-6 py-4 flex items-center justify-between">
        <div className="text-xl font-bold text-green-700">Business Inventory Dashboard</div>
        <div className="flex gap-6">
          {/* Placeholder for nav links */}
          <a href="#" className="text-gray-600 hover:text-green-700 font-medium">Home</a>
          <a href="#" className="text-gray-600 hover:text-green-700 font-medium">Analytics</a>
          <a href="#" className="text-gray-600 hover:text-green-700 font-medium">Inventory</a>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto py-8 px-2">
        <h1 className="text-2xl font-bold mb-4">Crop-wise Analytics Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded shadow flex flex-col items-start">
            <div className="text-xs text-blue-700 font-semibold mb-1">Total Invested Money</div>
            <div className="text-2xl font-bold text-blue-900">{currencyFormatter.format(totalInvested)}</div>
          </div>
          <div className="bg-green-100 border-l-4 border-green-500 p-4 rounded shadow flex flex-col items-start">
            <div className="text-xs text-green-700 font-semibold mb-1">Total Returns</div>
            <div className="text-2xl font-bold text-green-900">{currencyFormatter.format(totalReturns)}</div>
          </div>
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded shadow flex flex-col items-start">
            <div className="text-xs text-yellow-700 font-semibold mb-1">Net Amount Remaining or Gain</div>
            <div className="text-2xl font-bold text-yellow-900">{currencyFormatter.format(netAmount)}</div>
          </div>
        </div>
        <CropAnalyticsFilters
          crops={allCrops}
          selectedCrops={selectedCrops}
          onCropsChange={setSelectedCrops}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          transactionType={transactionType}
          onTransactionTypeChange={setTransactionType}
          cropSearch={cropSearch}
          onCropSearchChange={setCropSearch}
          onClear={clearAll}
        />
        <h2 className="text-lg font-semibold text-blue-600 mb-2">Crop-wise Buy and Sell Quantities</h2>
        <CropAnalyticsBarChart
          crops={selectedCrops}
          transactions={state.transactions}
          dateRange={dateRange}
          transactionType={transactionType}
          minQuantity={null}
          maxQuantity={null}
          minAmount={null}
          maxAmount={null}
        />
        {/* Trend chart for profit/loss below the bar chart */}
        <div className="mt-8">
          <CropProfitTrendChart
            crops={selectedCrops}
            transactions={state.transactions}
            dateRange={dateRange}
            transactionType={transactionType}
          />
        </div>
      </div>
    </div>
  );
} 