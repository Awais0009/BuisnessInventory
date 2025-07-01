'use client';

import { useInventory } from '@/context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

interface CropAnalytics {
  cropName: string;
  totalBuyAmount: number;
  totalSellAmount: number;
  totalBuyQty: number;
  totalSellQty: number;
  avgBuyRate: number;
  avgSellRate: number;
  currentStock: number;
}

export function AnalyticsTable() {
  const { state } = useInventory();

  // Calculate analytics for each crop
  const cropAnalytics: CropAnalytics[] = state.crops.map(crop => {
    const cropTransactions = state.transactions.filter(t => t.cropId === crop.id);
    
    const buyTransactions = cropTransactions.filter(t => t.action === 'buy');
    const sellTransactions = cropTransactions.filter(t => t.action === 'sell');
    
    const totalBuyAmount = buyTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalSellAmount = sellTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalBuyQty = buyTransactions.reduce((sum, t) => sum + t.quantity, 0);
    const totalSellQty = sellTransactions.reduce((sum, t) => sum + t.quantity, 0);
    
    const avgBuyRate = totalBuyQty > 0 ? totalBuyAmount / totalBuyQty * 40 : 0; // Convert to per 40kg
    const avgSellRate = totalSellQty > 0 ? totalSellAmount / totalSellQty * 40 : 0;
    
    const currentStock = totalBuyQty - totalSellQty;
    
    return {
      cropName: crop.name,
      totalBuyAmount,
      totalSellAmount,
      totalBuyQty,
      totalSellQty,
      avgBuyRate,
      avgSellRate,
      currentStock,
    };
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Crop-wise Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Crop</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Total Buy Amt</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Total Sell Amt</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Buy Qty (kg)</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Sell Qty (kg)</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Current Stock (kg)</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Avg Buy Rate</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Avg Sell Rate</th>
              </tr>
            </thead>
            <tbody>
              {cropAnalytics.map((analytics, index) => (
                <tr key={analytics.cropName} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}>
                  <td className="py-3 px-4 font-medium">{analytics.cropName}</td>
                  <td className="text-right py-3 px-4 text-blue-600">
                    Rs. {analytics.totalBuyAmount.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4 text-green-600">
                    Rs. {analytics.totalSellAmount.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-600">
                    {analytics.totalBuyQty.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-600">
                    {analytics.totalSellQty.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-600 font-bold">
                    {analytics.currentStock.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-600">
                    Rs. {analytics.avgBuyRate.toFixed(0)}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-600">
                    Rs. {analytics.avgSellRate.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cropAnalytics.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No transaction data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 