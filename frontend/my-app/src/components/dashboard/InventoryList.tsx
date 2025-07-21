'use client';

import { useState } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { Crop } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EditCropModal } from '@/components/dashboard/EditCropModal';
import { Search, Package, TrendingUp, TrendingDown, Plus, Edit2, Printer } from 'lucide-react';
import { toast } from 'sonner';

export function InventoryList() {
  const { state, dispatch } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Always search all crops, not just visible
  const searchResults = state.crops.filter(crop =>
    crop.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // If searching, show search results; otherwise, show visible crops
  const filteredCrops = searchTerm.trim().length > 0 ? searchResults : state.visibleCrops;

  const cropExists = state.crops.some(crop => crop.name.toLowerCase() === searchTerm.trim().toLowerCase());
  const showAddCropButton = searchTerm.trim().length > 0 && !cropExists;

  const handleAction = (crop: Crop, action: 'buy' | 'sell') => {
    dispatch({ type: 'SET_SELECTED_CROP', payload: crop });
    dispatch({ type: 'SET_ACTION_TYPE', payload: action });
    dispatch({ type: 'SET_TRANSACTION_MODAL_OPEN', payload: true });
  };

  const handleEditCrop = (crop: Crop) => {
    setEditingCrop(crop);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCrop(null);
  };

  // Print crop transaction history
  const handlePrintCropHistory = (crop: Crop) => {
    // Get all transactions for this crop
    const cropTransactions = state.transactions.filter(t => t.cropId === crop.id);
    
    if (cropTransactions.length === 0) {
      toast.error(`No transactions found for ${crop.name}`);
      return;
    }

    // Sort transactions by date (newest first)
    const sortedTransactions = cropTransactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Create print window
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print the crop history');
      return;
    }

    // Calculate totals
    const totalBought = sortedTransactions
      .filter(t => t.action === 'buy')
      .reduce((sum, t) => sum + t.quantity, 0);
    
    const totalSold = sortedTransactions
      .filter(t => t.action === 'sell')
      .reduce((sum, t) => sum + t.quantity, 0);

    const totalValue = sortedTransactions.reduce((sum, t) => sum + t.total, 0);

    // Create HTML for printing
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Crop History - ${crop.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 8px; 
              line-height: 1.2; 
              width: 58mm; 
              margin: 0 auto; 
              padding: 2mm;
            }
            .header { text-align: center; border-bottom: 1px dashed #666; padding-bottom: 2mm; margin-bottom: 2mm; }
            .header h1 { font-size: 11px; font-weight: bold; margin-bottom: 1mm; }
            .header p { font-size: 8px; margin: 0.5mm 0; }
            .crop-title { text-align: center; font-size: 10px; font-weight: bold; margin-bottom: 2mm; }
            .info-row { display: flex; justify-content: space-between; margin: 1mm 0; }
            .summary { background: #f5f5f5; padding: 2mm; margin: 2mm 0; border: 1px solid #ddd; }
            .transaction { margin: 2mm 0; padding: 1mm 0; border-bottom: 1px dashed #ccc; }
            .tx-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 0.5mm; }
            .tx-details { font-size: 7px; color: #666; margin: 0.5mm 0; }
            .buy { color: #dc2626; }
            .sell { color: #16a34a; }
            .footer { text-align: center; border-top: 1px dashed #666; padding-top: 2mm; margin-top: 2mm; font-size: 7px; color: #666; }
            @media print {
              @page { size: 58mm auto; margin: 0; }
              body { width: 54mm; margin: 2mm auto; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>NAEEM & CO</h1>
            <p>Agricultural Products Trading</p>
            <p>📞 +92 300 7373952</p>
          </div>
          
          <div class="crop-title">
            ${crop.name.toUpperCase()} HISTORY
          </div>
          
          <div class="summary">
            <div class="info-row">
              <span>Current Stock:</span>
              <span><strong>${crop.stock}kg</strong></span>
            </div>
            <div class="info-row">
              <span>Current Rate:</span>
              <span><strong>Rs.${crop.pricePerUnit}/40kg</strong></span>
            </div>
            <div class="info-row">
              <span>Total Bought:</span>
              <span class="buy">${totalBought}kg</span>
            </div>
            <div class="info-row">
              <span>Total Sold:</span>
              <span class="sell">${totalSold}kg</span>
            </div>
            <div class="info-row">
              <span>Net Value:</span>
              <span class="${totalValue >= 0 ? 'sell' : 'buy'}">
                Rs.${Math.abs(totalValue).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          <div style="margin: 2mm 0; font-weight: bold; font-size: 9px;">
            TRANSACTION HISTORY (${sortedTransactions.length})
          </div>
          
          ${sortedTransactions.map(transaction => `
            <div class="transaction">
              <div class="tx-header">
                <span class="${transaction.action}">
                  ${transaction.action.toUpperCase()} - ${transaction.quantity}kg
                </span>
                <span class="${transaction.action}">
                  ${transaction.action === 'buy' ? '-' : '+'} Rs.${Math.abs(transaction.total).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div class="tx-details">
                <div>Party: ${transaction.partyName}</div>
                <div>Rate: Rs.${transaction.rate}/40kg</div>
                <div>Date: ${new Date(transaction.date).toLocaleDateString()} ${new Date(transaction.date).toLocaleTimeString().slice(0,5)}</div>
                ${transaction.notes ? `<div>Notes: ${transaction.notes}</div>` : ''}
              </div>
            </div>
          `).join('')}
          
          <div class="footer">
            <p>Report Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString().slice(0,5)}</p>
            <p style="margin-top: 1mm;">*** Computer Generated Report ***</p>
            <p>For queries: +92 300 7373952</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Print and close
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      toast.success(`Transaction history printed for ${crop.name}!`);
    }, 500);
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCrop(crop)}
                      className="ml-2 h-6 w-6 p-0 hover:bg-gray-100"
                    >
                      <Edit2 className="w-3 h-3 text-gray-500" />
                    </Button>
                  </CardTitle>
                  <Badge variant={stockStatus.color as 'default' | 'secondary' | 'destructive'}>
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

                {/* Print History Button */}
                <div className="pt-2">
                  <Button
                    onClick={() => handlePrintCropHistory(crop)}
                    variant="ghost"
                    size="sm"
                    className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    Print History
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

      {/* Edit Crop Modal */}
      <EditCropModal 
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        crop={editingCrop}
      />
    </div>
  );
} 