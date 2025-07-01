'use client';

import { useState } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Package, TrendingUp, TrendingDown, Plus } from 'lucide-react';

export function InventoryList() {
  const { state, dispatch } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');

  // Always search all crops, not just visible
  const searchResults = state.crops.filter(crop =>
    crop.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // If searching, show search results; otherwise, show visible crops
  const filteredCrops = searchTerm.trim().length > 0 ? searchResults : state.visibleCrops;

  const cropExists = state.crops.some(crop => crop.name.toLowerCase() === searchTerm.trim().toLowerCase());
  const showAddCropButton = searchTerm.trim().length > 0 && !cropExists;

  const handleAction = (crop: any, action: 'buy' | 'sell') => {
    dispatch({ type: 'SET_SELECTED_CROP', payload: crop });
    dispatch({ type: 'SET_ACTION_TYPE', payload: action });
    dispatch({ type: 'SET_TRANSACTION_MODAL_OPEN', payload: true });
  };

  const handleAddCrop = () => {
    dispatch({ type: 'SET_ADD_CROP_MODAL_OPEN', payload: true });
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: 'destructive', text: 'Out of Stock' };
    if (stock < 100) return { color: 'secondary', text: 'Low Stock' };
    return { color: 'default', text: 'In Stock' };
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search crops..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-32 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Button
            variant="outline"
            size="sm"
            className={`flex items-center gap-1 ${showAddCropButton ? '' : 'opacity-50 pointer-events-none'}`}
            onClick={handleAddCrop}
            tabIndex={showAddCropButton ? 0 : -1}
          >
            <Plus className="w-4 h-4" />
            Add Crop
          </Button>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCrops.map((crop) => {
          const stockStatus = getStockStatus(crop.stock);
          
          return (
            <Card key={crop.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Package className="w-5 h-5 mr-2 text-green-600" />
                    {crop.name}
                  </CardTitle>
                  <Badge variant={stockStatus.color as any}>
                    {stockStatus.text}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Stock Info */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Current Stock:</span>
                  <span className="font-semibold text-lg">{crop.stock}kg</span>
                </div>

                {/* Price Info */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rate per 40kg:</span>
                  <span className="font-semibold">Rs. {crop.pricePerUnit.toLocaleString()}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <Button
                    onClick={() => handleAction(crop, 'buy')}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Buy
                  </Button>
                  <Button
                    onClick={() => handleAction(crop, 'sell')}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                    disabled={crop.stock === 0}
                  >
                    <TrendingDown className="w-4 h-4 mr-1" />
                    Sell
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCrops.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No crops found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms or add a new crop.' : 'No crops available in inventory.'}
          </p>
        </div>
      )}
    </div>
  );
} 