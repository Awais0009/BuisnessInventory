import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell } from 'recharts';

export interface Transaction {
  cropName: string;
  action: 'buy' | 'sell';
  quantity: number;
  total: number;
  date: Date;
}

export interface CropAnalyticsBarChartProps {
  crops: string[];
  transactions: Transaction[];
  dateRange: { start: Date|null; end: Date|null };
  transactionType: 'both' | 'buy' | 'sell';
  minQuantity: number|null;
  maxQuantity: number|null;
  minAmount: number|null;
  maxAmount: number|null;
}

export const CropAnalyticsBarChart: React.FC<CropAnalyticsBarChartProps> = ({
  crops,
  transactions,
  dateRange,
  transactionType,
  minQuantity,
  maxQuantity,
  minAmount,
  maxAmount,
}) => {
  // Filter transactions by date, type, qty, amount
  const filteredTx = transactions.filter(t => {
    const txDate = t.date;
    if (dateRange.start && txDate < dateRange.start) return false;
    if (dateRange.end && txDate > dateRange.end) return false;
    if (transactionType !== 'both' && t.action !== transactionType) return false;
    if (minQuantity !== null && t.quantity < minQuantity) return false;
    if (maxQuantity !== null && t.quantity > maxQuantity) return false;
    if (minAmount !== null && t.total < minAmount) return false;
    if (maxAmount !== null && t.total > maxAmount) return false;
    return true;
  });

  // Transform data: each bar is a crop+type (e.g., 'Wheat Buy', 'Wheat Sell')
  let chartData: { label: string; crop: string; type: 'Buy' | 'Sell'; quantity: number; amount: number; avgRate: number; currentStock: number; fill: string; }[] = [];
  crops.forEach(crop => {
    // Buy
    const buyTx = filteredTx.filter(t => t.cropName === crop && t.action === 'buy');
    const buyQty = buyTx.reduce((sum, t) => sum + t.quantity, 0);
    const buyAmount = buyTx.reduce((sum, t) => sum + t.total, 0);
    const avgBuyRate = buyQty > 0 ? (buyAmount / buyQty) * 40 : 0;
    const sellTx = filteredTx.filter(t => t.cropName === crop && t.action === 'sell');
    const sellQty = sellTx.reduce((sum, t) => sum + t.quantity, 0);
    const sellAmount = sellTx.reduce((sum, t) => sum + t.total, 0);
    const avgSellRate = sellQty > 0 ? (sellAmount / sellQty) * 40 : 0;
    const currentStock = buyQty - sellQty;
    chartData.push({
      label: `${crop} Buy`,
      crop,
      type: 'Buy',
      quantity: buyQty,
      amount: buyAmount,
      avgRate: avgBuyRate,
      currentStock,
      fill: '#3b82f6',
    });
    chartData.push({
      label: `${crop} Sell`,
      crop,
      type: 'Sell',
      quantity: sellQty,
      amount: sellAmount,
      avgRate: avgSellRate,
      currentStock,
      fill: '#22c55e',
    });
  });

  // Custom X-axis tick to reduce space between Buy/Sell of same crop
  const renderCustomTick = (props: any) => {
    const { x, y, payload } = props;
    const [crop, type] = payload.value.split(' ');
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fontSize={13} fill="#666">
          {type === 'Buy' ? crop : ''}
        </text>
        <text x={0} y={0} dy={30} textAnchor="middle" fontSize={11} fill={type === 'Buy' ? '#3b82f6' : '#22c55e'}>
          {type}
        </text>
      </g>
    );
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded shadow text-sm border border-gray-200">
        <div><b>Crop:</b> {d.crop}</div>
        <div><b>Type:</b> {d.type}</div>
        <div><b>Quantity:</b> {d.quantity} kg</div>
        <div><b>Amount:</b> Rs. {d.amount.toLocaleString()}</div>
        <div><b>Avg Rate:</b> Rs. {d.avgRate.toFixed(2)}/40kg</div>
        <div><b>Current Stock:</b> {d.currentStock} kg</div>
      </div>
    );
  };

  // Add a gap between crops
  const barGap = 8; // small gap between Buy/Sell
  const groupGap = 32; // larger gap between crops

  const hasData = chartData.some(d => d.quantity > 0);

  return (
    <div className="w-full h-[400px] bg-white rounded shadow p-4 mb-8">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 40, left: 0, bottom: 40 }}
            barCategoryGap={barGap}
            barGap={groupGap - barGap}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={renderCustomTick}
              interval={0}
              height={50}
            />
            <YAxis tick={{ fontSize: 14 }} label={{ value: 'Quantity (kg)', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} payload={[
              { value: 'Buy', type: 'square', color: '#3b82f6' },
              { value: 'Sell', type: 'square', color: '#22c55e' },
            ]} />
            <Bar dataKey="quantity" name="Quantity" fill="#8884d8" barSize={40} radius={[4, 4, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center text-gray-500 py-20">No transaction data available for selected filters.</div>
      )}
    </div>
  );
}; 