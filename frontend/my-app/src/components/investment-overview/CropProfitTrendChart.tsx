import React, { useState, useMemo } from 'react';
import { TrendChart } from './TrendChart';

export interface Transaction {
  cropName: string;
  action: 'buy' | 'sell';
  quantity: number;
  total: number;
  date: Date;
}

export interface CropProfitTrendChartProps {
  crops: string[];
  transactions: Transaction[];
  dateRange: { start: Date|null; end: Date|null };
  transactionType: 'both' | 'buy' | 'sell';
}

export const CropProfitTrendChart: React.FC<CropProfitTrendChartProps> = ({ 
  crops, 
  transactions, 
  dateRange, 
  transactionType 
}) => {
  // Local state for filters
  const [selectedCrops, setSelectedCrops] = useState<string[]>(crops);
  const [localDateRange, setLocalDateRange] = useState<{ start: string; end: string }>({
    start: dateRange.start?.toISOString().split('T')[0] || '',
    end: dateRange.end?.toISOString().split('T')[0] || '',
  });
  const [localTransactionType, setLocalTransactionType] = useState<'both' | 'buy' | 'sell'>(transactionType);
  const [moneyType, setMoneyType] = useState<'invested' | 'profit'>('profit');

  // Convert local filters to proper format
  const processedDateRange = useMemo(() => ({
    start: localDateRange.start ? new Date(localDateRange.start) : null,
    end: localDateRange.end ? new Date(localDateRange.end) : null,
  }), [localDateRange]);

  const handleCropToggle = (crop: string) => {
    setSelectedCrops(prev => 
      prev.includes(crop) 
        ? prev.filter(c => c !== crop)
        : [...prev, crop]
    );
  };

  const handleSelectAllCrops = () => {
    setSelectedCrops(crops);
  };

  const handleClearAllCrops = () => {
    setSelectedCrops([]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Crop Investment & Profit Analysis</h2>
        
        {/* Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Crop Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Crop Selection</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllCrops}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAllCrops}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Clear All
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                {crops.map(crop => (
                  <label key={crop} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCrops.includes(crop)}
                      onChange={() => handleCropToggle(crop)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{crop}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Transaction Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
            <select 
              value={localTransactionType} 
              onChange={(e) => setLocalTransactionType(e.target.value as 'both' | 'buy' | 'sell')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="both">Both (Buy & Sell)</option>
              <option value="buy">Only Buy</option>
              <option value="sell">Only Sell</option>
            </select>
          </div>

          {/* Date Range Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="space-y-2">
              <input
                type="date"
                value={localDateRange.start}
                onChange={(e) => setLocalDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={localDateRange.end}
                onChange={(e) => setLocalDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Money Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Type</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="invested"
                  checked={moneyType === 'invested'}
                  onChange={(e) => setMoneyType(e.target.value as 'invested' | 'profit')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Invested Money</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="profit"
                  checked={moneyType === 'profit'}
                  onChange={(e) => setMoneyType(e.target.value as 'invested' | 'profit')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Profit from Sales</span>
              </label>
            </div>
          </div>
        </div>

        {/* Selected Crops Display */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {selectedCrops.map(crop => (
              <span 
                key={crop} 
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {crop}
                <button
                  onClick={() => handleCropToggle(crop)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
            {selectedCrops.length === 0 && (
              <span className="text-gray-500 text-sm italic">No crops selected</span>
            )}
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      {selectedCrops.length > 0 ? (
        <TrendChart
          crops={selectedCrops}
          transactions={transactions}
          dateRange={processedDateRange}
          transactionType={localTransactionType}
          moneyType={moneyType}
        />
      ) : (
        <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Crops Selected</h3>
            <p className="text-gray-500">Please select at least one crop to view the trend analysis.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CropProfitTrendChart; 