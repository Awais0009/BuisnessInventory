'use client';

import { useInventory } from '@/context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';

export function SummaryMetrics() {
  const { state } = useInventory();

  // Calculate metrics from transactions
  const totalInvestment = state.transactions
    .filter(t => t.action === 'buy')
    .reduce((sum, t) => sum + t.total, 0);

  const totalSales = state.transactions
    .filter(t => t.action === 'sell')
    .reduce((sum, t) => sum + t.total, 0);

  const netProfit = totalSales - totalInvestment;
  const isProfit = netProfit >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Investment */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">Total Investment</CardTitle>
          <TrendingDown className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900">
            Rs. {totalInvestment.toLocaleString()}
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Total amount spent on buying crops
          </p>
        </CardContent>
      </Card>

      {/* Total Sales */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-700">Total Sales</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-900">
            Rs. {totalSales.toLocaleString()}
          </div>
          <p className="text-xs text-green-600 mt-1">
            Total amount earned from selling crops
          </p>
        </CardContent>
      </Card>

      {/* Net Profit/Loss */}
      <Card className={`bg-gradient-to-br ${isProfit ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className={`text-sm font-medium ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
            Net {isProfit ? 'Profit' : 'Loss'}
          </CardTitle>
          <DollarSign className={`h-4 w-4 ${isProfit ? 'text-green-600' : 'text-red-600'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isProfit ? 'text-green-900' : 'text-red-900'}`}>
            Rs. {Math.abs(netProfit).toLocaleString()}
          </div>
          <p className={`text-xs mt-1 ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
            {isProfit ? 'Profit earned' : 'Loss incurred'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 