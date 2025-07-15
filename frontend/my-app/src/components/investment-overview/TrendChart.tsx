import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, BarChart, Bar } from 'recharts';

export interface Transaction {
  cropName: string;
  action: 'buy' | 'sell';
  quantity: number;
  total: number;
  date: Date;
}

export interface TrendChartProps {
  crops: string[];
  transactions: Transaction[];
  dateRange: { start: Date|null; end: Date|null };
  transactionType: 'both' | 'buy' | 'sell';
  moneyType: 'invested' | 'profit';
}

interface ChartDataPoint {
  period: string;
  value: number;
  buyTotal: number;
  sellTotal: number;
  profit: number;
  isProfit: boolean;
  date?: Date;
  weekNum?: number;
  year?: number;
}

interface WeekData {
  period: string;
  buyTotal: number;
  sellTotal: number;
  weekNum: number;
  year: number;
}

interface MonthData {
  period: string;
  buyTotal: number;
  sellTotal: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  label?: string;
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}

// Helper functions for date operations
function getDateDiffInDays(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function getMonthKey(date: Date): string {
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getWeekLabel(weekNum: number): string {
  return `Week ${weekNum}`;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  crops,
  transactions,
  dateRange,
  transactionType,
  moneyType,
}) => {
  const [selectedCrop, setSelectedCrop] = useState<string>('All');
  const [showComparison, setShowComparison] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<ChartDataPoint | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Determine aggregation type based on date range
  const aggregationType = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return 'day';
    const daysDiff = getDateDiffInDays(dateRange.start, dateRange.end);
    if (daysDiff <= 7) return 'day';
    if (daysDiff <= 60) return 'week';
    return 'month';
  }, [dateRange]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (dateRange.start && t.date < dateRange.start) return false;
      if (dateRange.end && t.date > dateRange.end) return false;
      if (transactionType !== 'both' && t.action !== transactionType) return false;
      if (selectedCrop !== 'All' && t.cropName !== selectedCrop) return false;
      return true;
    });
  }, [transactions, dateRange, transactionType, selectedCrop]);

  // Calculate profit/loss for each transaction period
  const chartData = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];

    const data: ChartDataPoint[] = [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    if (aggregationType === 'day') {
      // Day-wise aggregation
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        const dayTransactions = filteredTransactions.filter(t => 
          t.date.toISOString().split('T')[0] === dateKey
        );

        const buyTotal = dayTransactions.filter(t => t.action === 'buy').reduce((sum, t) => sum + t.total, 0);
        const sellTotal = dayTransactions.filter(t => t.action === 'sell').reduce((sum, t) => sum + t.total, 0);
        
        let value = 0;
        if (moneyType === 'invested') {
          value = transactionType === 'both' ? buyTotal : (transactionType === 'buy' ? buyTotal : sellTotal);
        } else {
          value = sellTotal - buyTotal; // Profit = Sales - Investment
        }

        data.push({
          period: formatDateLabel(new Date(d)),
          value,
          buyTotal,
          sellTotal,
          profit: sellTotal - buyTotal,
          isProfit: (sellTotal - buyTotal) >= 0,
          date: new Date(d)
        });
      }
    } else if (aggregationType === 'week') {
      // Week-wise aggregation
      const weekData: { [key: string]: WeekData } = {};
      
      filteredTransactions.forEach(t => {
        const weekNum = getWeekNumber(t.date);
        const weekKey = `${t.date.getFullYear()}-W${weekNum}`;
        
        if (!weekData[weekKey]) {
          weekData[weekKey] = {
            period: getWeekLabel(weekNum),
            buyTotal: 0,
            sellTotal: 0,
            weekNum,
            year: t.date.getFullYear()
          };
        }
        
        if (t.action === 'buy') weekData[weekKey].buyTotal += t.total;
        else weekData[weekKey].sellTotal += t.total;
      });

      Object.values(weekData).forEach((week: WeekData) => {
        let value = 0;
        if (moneyType === 'invested') {
          value = transactionType === 'both' ? week.buyTotal : (transactionType === 'buy' ? week.buyTotal : week.sellTotal);
        } else {
          value = week.sellTotal - week.buyTotal;
        }

        data.push({
          period: week.period,
          value,
          buyTotal: week.buyTotal,
          sellTotal: week.sellTotal,
          profit: week.sellTotal - week.buyTotal,
          isProfit: (week.sellTotal - week.buyTotal) >= 0,
          weekNum: week.weekNum,
          year: week.year
        });
      });
    } else {
      // Month-wise aggregation
      const monthData: { [key: string]: MonthData } = {};
      
      filteredTransactions.forEach(t => {
        const monthKey = getMonthKey(t.date);
        
        if (!monthData[monthKey]) {
          monthData[monthKey] = {
            period: monthKey,
            buyTotal: 0,
            sellTotal: 0
          };
        }
        
        if (t.action === 'buy') monthData[monthKey].buyTotal += t.total;
        else monthData[monthKey].sellTotal += t.total;
      });

      Object.values(monthData).forEach((month: MonthData) => {
        let value = 0;
        if (moneyType === 'invested') {
          value = transactionType === 'both' ? month.buyTotal : (transactionType === 'buy' ? month.buyTotal : month.sellTotal);
        } else {
          value = month.sellTotal - month.buyTotal;
        }

        data.push({
          period: month.period,
          value,
          buyTotal: month.buyTotal,
          sellTotal: month.sellTotal,
          profit: month.sellTotal - month.buyTotal,
          isProfit: (month.sellTotal - month.buyTotal) >= 0
        });
      });
    }

    return data;
  }, [filteredTransactions, dateRange, aggregationType, moneyType, transactionType]);

  // Crop-wise comparison data
  const comparisonData = useMemo(() => {
    if (!showComparison) return [];
    
    return crops.map(crop => {
      const cropTransactions = filteredTransactions.filter(t => t.cropName === crop);
      const buyTotal = cropTransactions.filter(t => t.action === 'buy').reduce((sum, t) => sum + t.total, 0);
      const sellTotal = cropTransactions.filter(t => t.action === 'sell').reduce((sum, t) => sum + t.total, 0);
      const profit = sellTotal - buyTotal;
      
      return {
        crop,
        buyTotal,
        sellTotal,
        profit,
        isProfit: profit >= 0
      };
    }).filter(item => item.buyTotal > 0 || item.sellTotal > 0);
  }, [crops, filteredTransactions, showComparison]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border rounded shadow-lg">
        <p className="font-semibold">{label}</p>
        {transactionType === 'both' ? (
          <>
            <p className="text-blue-600">Investment: Rs. {data.buyTotal?.toLocaleString() || 0}</p>
            <p className="text-green-600">Sales: Rs. {data.sellTotal?.toLocaleString() || 0}</p>
            <p className={`font-semibold ${data.isProfit ? 'text-green-600' : 'text-red-600'}`}>
              Profit/Loss: Rs. {data.profit?.toLocaleString() || 0}
            </p>
          </>
        ) : (
          <p className={moneyType === 'profit' ? (data.isProfit ? 'text-green-600' : 'text-red-600') : 'text-blue-600'}>
            {moneyType === 'invested' ? 'Amount' : 'Profit/Loss'}: Rs. {data.value?.toLocaleString() || 0}
          </p>
        )}
      </div>
    );
  };

  const CustomDot = (props: DotProps) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;
    const isProfit = payload.isProfit;
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={4} 
        fill={moneyType === 'profit' ? (isProfit ? '#22c55e' : '#ef4444') : '#3b82f6'}
        stroke="#fff"
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={() => {
          setSelectedDataPoint(payload);
          setShowModal(true);
        }}
      />
    );
  };

  const DetailModal = () => {
    if (!showModal || !selectedDataPoint) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Transaction Details</h3>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Period:</span>
              <span className="text-gray-800">{selectedDataPoint.period}</span>
            </div>
            
            {transactionType === 'both' && (
              <>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-600">Investment:</span>
                  <span className="text-blue-800">Rs. {selectedDataPoint.buyTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-green-600">Sales:</span>
                  <span className="text-green-800">Rs. {selectedDataPoint.sellTotal.toLocaleString()}</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                {moneyType === 'invested' ? 'Total Amount:' : 'Profit/Loss:'}
              </span>
              <span className={moneyType === 'profit' ? 
                (selectedDataPoint.isProfit ? 'text-green-800 font-semibold' : 'text-red-800 font-semibold') : 
                'text-blue-800 font-semibold'
              }>
                Rs. {selectedDataPoint.value.toLocaleString()}
              </span>
            </div>
            
            {moneyType === 'invested' && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Profit/Loss:</span>
                <span className={selectedDataPoint.isProfit ? 'text-green-800 font-semibold' : 'text-red-800 font-semibold'}>
                  Rs. {selectedDataPoint.profit.toLocaleString()}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crop Filter</label>
            <select 
              value={selectedCrop} 
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Crops</option>
              {crops.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showComparison"
              checked={showComparison}
              onChange={(e) => setShowComparison(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="showComparison" className="text-sm font-medium text-gray-700">
              Show Crop Comparison
            </label>
          </div>
        </div>
      </div>

      {/* Main Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {moneyType === 'invested' ? 'Investment' : 'Profit/Loss'} Trend 
          {selectedCrop !== 'All' && ` - ${selectedCrop}`}
          <span className="text-sm font-normal text-gray-600 ml-2">
            ({aggregationType === 'day' ? 'Daily' : aggregationType === 'week' ? 'Weekly' : 'Monthly'} View)
          </span>
        </h3>
        
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={aggregationType === 'day' ? -45 : 0}
                textAnchor={aggregationType === 'day' ? 'end' : 'middle'}
                height={aggregationType === 'day' ? 60 : 30}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={moneyType === 'profit' ? '#22c55e' : '#3b82f6'}
                strokeWidth={3}
                dot={<CustomDot />}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-500 py-20">
            No data available for the selected filters and date range.
          </div>
        )}
      </div>

      {/* Crop Comparison Chart */}
      {showComparison && comparisonData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Crop-wise Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="crop" tick={{ fontSize: 12 }} />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `Rs. ${value.toLocaleString()}`, 
                  name === 'profit' ? 'Profit/Loss' : name === 'buyTotal' ? 'Investment' : 'Sales'
                ]}
                labelStyle={{ color: '#374151' }}
              />
              <Legend />
              {transactionType !== 'sell' && (
                <Bar dataKey="buyTotal" name="Investment" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              )}
              {transactionType !== 'buy' && (
                <Bar dataKey="sellTotal" name="Sales" fill="#22c55e" radius={[4, 4, 0, 0]} />
              )}
              <Bar 
                dataKey="profit" 
                name="Profit/Loss" 
                fill="#f59e0b" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal />
    </div>
  );
}; 