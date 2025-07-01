'use client';

import { useInventory } from '@/context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';

export function RecentTransactions() {
  const { state } = useInventory();
  
  const recentTransactions = state.transactions.slice(0, 5);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getActionIcon = (action: 'buy' | 'sell') => {
    return action === 'buy' ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Recent Transactions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {getActionIcon(transaction.action)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{transaction.cropName}</span>
                      <Badge variant={transaction.action === 'buy' ? 'default' : 'secondary'}>
                        {transaction.action.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {transaction.quantity}kg • {transaction.partyName}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold">
                    Rs. {transaction.total.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(transaction.date)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {state.transactions.length > 5 && (
          <div className="mt-4 text-center">
            <button className="text-sm text-green-600 hover:text-green-700 font-medium">
              View All Transactions
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 