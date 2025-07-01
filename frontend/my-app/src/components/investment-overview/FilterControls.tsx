'use client';

import { useState } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, Calendar, Shuffle } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function FilterControls({
  selectedCrops,
  setSelectedCrops,
  dateFilter,
  setDateFilter,
  actionTypeFilter,
  setActionTypeFilter,
}: {
  selectedCrops: string[];
  setSelectedCrops: React.Dispatch<React.SetStateAction<string[]>>;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  actionTypeFilter: 'both' | 'buy' | 'sell';
  setActionTypeFilter: (type: 'both' | 'buy' | 'sell') => void;
}) {
  const { state } = useInventory();
  const allCrops = state.crops.map(crop => crop.name);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCrops = allCrops.filter(cropName => cropName.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleCrop = (cropName: string) => {
    setSelectedCrops((prev: string[]) =>
      prev.includes(cropName)
        ? prev.filter((c: string) => c !== cropName)
        : [...prev, cropName]
    );
  };

  const clearFilters = () => {
    setSelectedCrops([]);
    setDateFilter('1month');
    setActionTypeFilter('both');
    setSearchTerm('');
  };

  const datePresets = [
    { value: '1month', label: '1 Month' },
    { value: '2months', label: '2 Months' },
    { value: '1year', label: '1 Year' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        {/* Crop Search Bar */}
        <div className="mb-2">
          <Input
            type="text"
            placeholder="Search crops..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        {/* Crop Filter */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-600" />
            <h3 className="font-medium text-gray-900">Filter by Crop</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredCrops.map(cropName => (
              <Badge
                key={cropName}
                variant={selectedCrops.includes(cropName) ? 'default' : 'outline'}
                className={`cursor-pointer hover:bg-green-100 ${
                  selectedCrops.includes(cropName) ? 'bg-green-600 text-white' : ''
                }`}
                onClick={() => toggleCrop(cropName)}
              >
                {cropName}
              </Badge>
            ))}
          </div>
        </div>

        {/* Date Filter */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-600" />
            <h3 className="font-medium text-gray-900">Date Range</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {datePresets.map(preset => (
              <Button
                key={preset.value}
                variant={dateFilter === preset.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter(preset.value)}
                className={dateFilter === preset.value ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Buy/Sell/Both Filter */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Shuffle className="w-4 h-4 text-gray-600" />
            <h3 className="font-medium text-gray-900">Transaction Type</h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant={actionTypeFilter === 'both' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActionTypeFilter('both')}
              className={actionTypeFilter === 'both' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              Both
            </Button>
            <Button
              variant={actionTypeFilter === 'buy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActionTypeFilter('buy')}
              className={actionTypeFilter === 'buy' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
            >
              Buy
            </Button>
            <Button
              variant={actionTypeFilter === 'sell' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActionTypeFilter('sell')}
              className={actionTypeFilter === 'sell' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
            >
              Sell
            </Button>
          </div>
        </div>

        {/* Clear Filters */}
        {(selectedCrops.length > 0 || dateFilter !== '1month' || actionTypeFilter !== 'both' || searchTerm) && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 