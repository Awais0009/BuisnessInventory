'use client';

import { useState } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, User, TrendingUp, TrendingDown, DollarSign, Calculator } from 'lucide-react';

interface PersonSummary {
  totalTraded: number;
  totalGiven: number;
  totalReceived: number;
  netBalance: number;
}

export function TransactionLedger() {
  const { state } = useInventory();
  const [searchPerson, setSearchPerson] = useState('');

  // Get unique people from transactions
  const allPeople = Array.from(new Set(
    state.transactions.map(t => t.partyName)
  )).sort();

  // Filter people based on search
  const filteredPeople = allPeople.filter(person =>
    person.toLowerCase().includes(searchPerson.toLowerCase())
  );

  // Calculate summary for a person
  const getPersonSummary = (personName: string): PersonSummary => {
    const personTransactions = state.transactions.filter(t => t.partyName === personName);
    
    const buyTransactions = personTransactions.filter(t => t.action === 'buy');
    const sellTransactions = personTransactions.filter(t => t.action === 'sell');
    
    const totalGiven = buyTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalReceived = sellTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTraded = totalGiven + totalReceived;
    const netBalance = totalReceived - totalGiven;
    
    return {
      totalTraded,
      totalGiven,
      totalReceived,
      netBalance,
    };
  };

  const selectedPerson = filteredPeople[0] || '';
  const personSummary = selectedPerson ? getPersonSummary(selectedPerson) : null;
  const personTransactions = selectedPerson 
    ? state.transactions.filter(t => t.partyName === selectedPerson)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            1-to-1 Transaction Ledger
          </h1>
          <p className="text-gray-600">
            Track individual buyer/seller transactions and balances
          </p>
        </div>

        {/* Person Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Person
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search for buyer/seller name..."
                value={searchPerson}
                onChange={(e) => setSearchPerson(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* People List */}
            {searchPerson && filteredPeople.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600">Select a person:</p>
                <div className="flex flex-wrap gap-2">
                  {filteredPeople.map(person => (
                    <Badge
                      key={person}
                      variant={person === selectedPerson ? 'default' : 'outline'}
                      className={`cursor-pointer hover:bg-green-100 ${
                        person === selectedPerson ? 'bg-green-600 text-white' : ''
                      }`}
                      onClick={() => setSearchPerson(person)}
                    >
                      {person}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Header */}
        {personSummary && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Summary for {selectedPerson}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    Rs. {personSummary.totalTraded.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Traded</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    Rs. {personSummary.totalGiven.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Given</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    Rs. {personSummary.totalReceived.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Received</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${personSummary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Rs. {Math.abs(personSummary.netBalance).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    Net {personSummary.netBalance >= 0 ? 'Balance' : 'Due'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction History Table */}
        {personTransactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Crop</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Action</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">Qty (kg)</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">Rate</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">Amount</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personTransactions.map((transaction, index) => (
                      <tr key={transaction.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}>
                        <td className="py-3 px-4 font-medium">{transaction.cropName}</td>
                        <td className="text-center py-3 px-4">
                          <Badge 
                            variant={transaction.action === 'buy' ? 'default' : 'secondary'}
                            className={transaction.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                          >
                            {transaction.action.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4 text-gray-600">
                          {transaction.quantity.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-600">
                          Rs. {transaction.rate.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 font-semibold">
                          Rs. {transaction.total.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-600">
                          {new Date(transaction.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!selectedPerson && (
          <Card>
            <CardContent className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No person selected</h3>
              <p className="text-gray-500">
                Search for a buyer or seller to view their transaction history
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 