'use client';

import { useState, useEffect } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { Transaction, ActionType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { X, Calculator, User, FileText } from 'lucide-react';

export function TransactionModal() {
  const { state, dispatch } = useInventory();
  const [formData, setFormData] = useState({
    quantity: '',
    rate: '',
    partyName: '',
    notes: '',
  });

  const isOpen = state.isTransactionModalOpen;
  const selectedCrop = state.selectedCrop;
  const actionType = state.actionType;

  useEffect(() => {
    if (selectedCrop && actionType) {
      setFormData(prev => ({
        ...prev,
        rate: selectedCrop.pricePerUnit.toString(),
      }));
    }
  }, [selectedCrop, actionType]);

  const calculateTotal = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const rate = parseFloat(formData.rate) || 0;
    return (quantity * rate) / 40; // Total = (qty * rate) / 40kg
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCrop || !actionType) return;

    const quantity = parseFloat(formData.quantity);
    const rate = parseFloat(formData.rate);
    
    if (!quantity || !rate || !formData.partyName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (actionType === 'sell' && quantity > selectedCrop.stock) {
      toast.error('Insufficient stock for this transaction');
      return;
    }

    const total = calculateTotal();
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      cropId: selectedCrop.id,
      cropName: selectedCrop.name,
      action: actionType,
      quantity,
      rate,
      total,
      partyName: formData.partyName,
      notes: formData.notes || undefined,
      date: new Date(),
    };

    // Add transaction and update stock
    dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
    dispatch({
      type: 'UPDATE_CROP_STOCK',
      payload: { cropId: selectedCrop.id, quantity, action: actionType },
    });

    // Reset form
    setFormData({
      quantity: '',
      rate: '',
      partyName: '',
      notes: '',
    });

    // Show success toast
    const actionText = actionType === 'buy' ? 'Bought' : 'Sold';
    toast.success(
      `${actionText} ${quantity}kg ${selectedCrop.name} - Rs. ${total.toLocaleString()}`
    );
  };

  const handleClose = () => {
    dispatch({ type: 'SET_TRANSACTION_MODAL_OPEN', payload: false });
    setFormData({
      quantity: '',
      rate: '',
      partyName: '',
      notes: '',
    });
  };

  if (!selectedCrop || !actionType) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Badge variant={actionType === 'buy' ? 'default' : 'secondary'}>
              {actionType.toUpperCase()}
            </Badge>
            <span>{selectedCrop.name}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Crop Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Stock:</span>
                <span className="font-semibold">{selectedCrop.stock}kg</span>
              </div>
            </CardContent>
          </Card>

          {/* Quantity */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity (kg)</label>
            <Input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
              placeholder="Enter quantity in kg"
              required
            />
          </div>

          {/* Rate */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rate per 40kg (Rs.)</label>
            <Input
              type="number"
              value={formData.rate}
              onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
              placeholder="Enter rate per 40kg"
              required
            />
          </div>

          {/* Total Calculation */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center">
                  <Calculator className="w-4 h-4 mr-1" />
                  Total:
                </span>
                <span className="font-bold text-lg">
                  Rs. {calculateTotal().toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Party Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <User className="w-4 h-4 mr-1" />
              {actionType === 'buy' ? 'Seller' : 'Buyer'} Name
            </label>
            <Input
              value={formData.partyName}
              onChange={(e) => setFormData(prev => ({ ...prev, partyName: e.target.value }))}
              placeholder={`Enter ${actionType === 'buy' ? 'seller' : 'buyer'} name`}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <FileText className="w-4 h-4 mr-1" />
              Notes (Optional)
            </label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {actionType === 'buy' ? 'Buy' : 'Sell'} Crop
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 