'use client';

import { useState } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

type TimeRange = '1M' | '3M' | '6M' | '1Y';
type MetricType = 'amount' | 'quantity';

interface MonthlyData {
  month: string;
  buyAmount: number;
  sellAmount: number;
  buyQuantity: number;
  sellQuantity: number;
}

export function TrendChart() {
  const { state } = useInventory();
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [metricType, setMetricType] = useState<MetricType>('amount');
  const [selectedCrop, setSelectedCrop] = useState<string>('all');

  // Get unique crops for filter
  const crops = Array.from(new Set(state.transactions.map(t => t.cropName))).sort();

  // Get number of months based on time range
  const getMonthsCount = (range: TimeRange) => {
    switch (range) {
      case '1M': return 1;
      case '3M': return 3;
      case '6M': return 6;
      case '1Y': return 12;
    }
  };

  // Group transactions by month
  const getMonthlyData = (): MonthlyData[] => {
    const months: MonthlyData[] = [];
    const now = new Date();
    const monthsCount = getMonthsCount(timeRange);
    
    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      let monthTransactions = state.transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === date.getMonth() && 
               transactionDate.getFullYear() === date.getFullYear();
      });

      // Filter by crop if selected
      if (selectedCrop !== 'all') {
        monthTransactions = monthTransactions.filter(t => t.cropName === selectedCrop);
      }
      
      const buyTransactions = monthTransactions.filter(t => t.action === 'buy');
      const sellTransactions = monthTransactions.filter(t => t.action === 'sell');
      
      const buyAmount = buyTransactions.reduce((sum, t) => sum + t.total, 0);
      const sellAmount = sellTransactions.reduce((sum, t) => sum + t.total, 0);
      const buyQuantity = buyTransactions.reduce((sum, t) => sum + t.quantity, 0);
      const sellQuantity = sellTransactions.reduce((sum, t) => sum + t.quantity, 0);
      
      months.push({
        month: monthName,
        buyAmount,
        sellAmount,
        buyQuantity,
        sellQuantity
      });
    }
    
    return months;
  };

  const monthlyData = getMonthlyData();
  const maxValue = Math.max(...monthlyData.map(d => 
    metricType === 'amount' 
      ? Math.max(d.buyAmount, d.sellAmount)
      : Math.max(d.buyQuantity, d.sellQuantity)
  ));

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Transaction Trends
          </CardTitle>
          <div className="flex gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="1M">Last Month</option>
              <option value="3M">Last 3 Months</option>
              <option value="6M">Last 6 Months</option>
              <option value="1Y">Last Year</option>
            </select>
            <select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value as MetricType)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="amount">Amount (Rs.)</option>
              <option value="quantity">Quantity (kg)</option>
            </select>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Crops</option>
              {crops.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Buy {metricType === 'amount' ? 'Amount' : 'Quantity'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Sell {metricType === 'amount' ? 'Amount' : 'Quantity'}</span>
            </div>
          </div>

          {/* Chart */}
          <div className="space-y-6">
            {monthlyData.map((data, index) => (
              <div key={data.month} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium w-16">{data.month}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-blue-600 font-medium">
                      Buy: {metricType === 'amount' 
                        ? `Rs. ${data.buyAmount.toLocaleString()}`
                        : `${data.buyQuantity.toLocaleString()} kg`}
                    </span>
                    <span className="text-green-600 font-medium">
                      Sell: {metricType === 'amount'
                        ? `Rs. ${data.sellAmount.toLocaleString()}`
                        : `${data.sellQuantity.toLocaleString()} kg`}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* Buy Bar */}
                  <div className="h-10 bg-gray-100 rounded-md overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-md transition-all duration-300"
                      style={{ 
                        width: `${((metricType === 'amount' ? data.buyAmount : data.buyQuantity) / maxValue) * 100}%`
                      }}
                    ></div>
                  </div>
                  
                  {/* Sell Bar */}
                  <div className="h-10 bg-gray-100 rounded-md overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-md transition-all duration-300"
                      style={{ 
                        width: `${((metricType === 'amount' ? data.sellAmount : data.sellQuantity) / maxValue) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {metricType === 'amount' ? (
                    <>Rs. {monthlyData.reduce((sum, d) => sum + d.buyAmount, 0).toLocaleString()}</>
                  ) : (
                    <>{monthlyData.reduce((sum, d) => sum + d.buyQuantity, 0).toLocaleString()} kg</>
                  )}
                </div>
                <div className="text-sm text-blue-600 font-medium mt-1">Total Buy ({timeRange})</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {metricType === 'amount' ? (
                    <>Rs. {monthlyData.reduce((sum, d) => sum + d.sellAmount, 0).toLocaleString()}</>
                  ) : (
                    <>{monthlyData.reduce((sum, d) => sum + d.sellQuantity, 0).toLocaleString()} kg</>
                  )}
                </div>
                <div className="text-sm text-green-600 font-medium mt-1">Total Sell ({timeRange})</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 