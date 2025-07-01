'use client';

import { SummaryMetrics } from './SummaryMetrics';
import { FilterControls } from './FilterControls';
import { TrendChart } from './TrendChart';
import { useInventory } from '@/context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  CartesianGrid
} from 'recharts';
import { useState, useMemo } from 'react';
import dayjs from 'dayjs';

export function InvestmentOverview() {
  const { state } = useInventory();

  // Filter state
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState('1month');
  const [actionTypeFilter, setActionTypeFilter] = useState<'both' | 'buy' | 'sell'>('both');

  // Date filter logic
  const getDateLimit = () => {
    const now = new Date();
    if (dateFilter === '1month') {
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (dateFilter === '2months') {
      return new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
    } else if (dateFilter === '1year') {
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }
    return null; // custom or all
  };
  const dateLimit = getDateLimit();

  // Only one crop selected for graph (for best UX)
  const selectedCrop = selectedCrops.length === 1 ? selectedCrops[0] : null;

  // Group transactions by month (or day if single day selected)
  const groupedData = useMemo(() => {
    if (!selectedCrop) return [];
    let cropTransactions = state.transactions.filter(t => t.cropName === selectedCrop);
    if (dateLimit) {
      cropTransactions = cropTransactions.filter(t => new Date(t.date) >= dateLimit);
    }
    if (actionTypeFilter !== 'both') {
      cropTransactions = cropTransactions.filter(t => t.action === actionTypeFilter);
    }
    // Group by month (or by day if only one day in range)
    const groupBy = (dateFilter === 'custom' && dateLimit && dateLimit.toDateString() === new Date().toDateString()) ? 'day' : 'month';
    const groups: Record<string, { totalQty: number; totalAmount: number; weightedAvg: number; period: string; transactions: typeof cropTransactions }> = {};
    cropTransactions.forEach(t => {
      const key = groupBy === 'month' ? dayjs(t.date).format('YYYY-MM') : dayjs(t.date).format('YYYY-MM-DD');
      if (!groups[key]) {
        groups[key] = { totalQty: 0, totalAmount: 0, weightedAvg: 0, period: key, transactions: [] };
      }
      groups[key].totalQty += t.quantity;
      groups[key].totalAmount += t.total;
      groups[key].transactions.push(t);
    });
    // Calculate weighted average for each group
    Object.values(groups).forEach(g => {
      g.weightedAvg = g.totalQty > 0 ? g.totalAmount / g.totalQty : 0;
    });
    // Sort by period
    return Object.values(groups).sort((a, b) => a.period.localeCompare(b.period));
  }, [selectedCrop, state.transactions, dateLimit, actionTypeFilter, dateFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Investment & Sales Overview
          </h1>
          <p className="text-gray-600">
            Track your investments, sales, and profitability across all crops
          </p>
        </div>

        {/* Summary Metrics */}
        <SummaryMetrics />

        {/* Filter Controls */}
        <FilterControls
          selectedCrops={selectedCrops}
          setSelectedCrops={setSelectedCrops}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          actionTypeFilter={actionTypeFilter}
          setActionTypeFilter={setActionTypeFilter}
        />

        {/* Crop-wise Analytics Bar Chart (Recharts) */}
        {selectedCrop && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {selectedCrop} Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupedData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No transaction data available</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: 400, overflowX: 'auto' }}>
                  <ResponsiveContainer width={Math.max(400, groupedData.length * 120)} height="100%">
                    <BarChart
                      data={groupedData}
                      margin={{ top: 20, right: 40, left: 0, bottom: 20 }}
                      barCategoryGap={24}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tick={{ fontSize: 14 }} />
                      <YAxis tick={{ fontSize: 14 }} label={{ value: 'Quantity (kg)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip
                        formatter={(_, __, props) => {
                          const d = props.payload;
                          return [
                            `Crop: ${selectedCrop}`,
                            `Period: ${d.period}`,
                            `Type: ${actionTypeFilter}`,
                            `Total Qty: ${d.totalQty} kg`,
                            `Total Amount: Rs. ${d.totalAmount.toLocaleString()}`,
                            `Avg Rate: Rs. ${d.weightedAvg.toFixed(2)}/kg`
                          ];
                        }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="totalQty" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Quantity">
                        <LabelList dataKey="weightedAvg" position="top" formatter={(v: number) => v > 0 ? `Avg: Rs. ${v.toFixed(2)}/kg` : ''} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Trend Chart */}
        <TrendChart />
      </div>
    </div>
  );
} 