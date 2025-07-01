'use client';

import { useState } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { Crop } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Package, DollarSign, Scale } from 'lucide-react';

export function AddCropModal() {
  const { state, dispatch } = useInventory();
  const [formData, setFormData] = useState({
    name: '',
    stock: '',
    pricePerUnit: '',
  });

  const isOpen = state.isAddCropModalOpen;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const name = formData.name.trim();
    const stock = parseFloat(formData.stock);
    const pricePerUnit = parseFloat(formData.pricePerUnit);
    
    if (!name || isNaN(stock) || isNaN(pricePerUnit)) {
      toast.error('Please fill in all fields with valid values');
      return;
    }

    if (stock < 0 || pricePerUnit < 0) {
      toast.error('Stock and price must be positive numbers');
      return;
    }

    // Check if crop already exists
    const cropExists = state.crops.some(
      crop => crop.name.toLowerCase() === name.toLowerCase()
    );

    if (cropExists) {
      toast.error('A crop with this name already exists');
      return;
    }

    const newCrop: Crop = {
      id: Date.now().toString(),
      name,
      stock,
      unit: 'kg',
      pricePerUnit,
    };

    dispatch({ type: 'ADD_CROP', payload: newCrop });

    // Reset form
    setFormData({
      name: '',
      stock: '',
      pricePerUnit: '',
    });

    toast.success(`Added ${name} to inventory`);
  };

  const handleClose = () => {
    dispatch({ type: 'SET_ADD_CROP_MODAL_OPEN', payload: false });
    setFormData({
      name: '',
      stock: '',
      pricePerUnit: '',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-green-600" />
            <span>Add New Crop</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Crop Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <Package className="w-4 h-4 mr-1" />
              Crop Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter crop name (e.g., Wheat, Rice)"
              required
            />
          </div>

          {/* Initial Stock */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <Scale className="w-4 h-4 mr-1" />
              Initial Stock (kg)
            </label>
            <Input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
              placeholder="Enter initial stock in kg"
              required
            />
          </div>

          {/* Price per 40kg */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <DollarSign className="w-4 h-4 mr-1" />
              Price per 40kg (Rs.)
            </label>
            <Input
              type="number"
              value={formData.pricePerUnit}
              onChange={(e) => setFormData(prev => ({ ...prev, pricePerUnit: e.target.value }))}
              placeholder="Enter price per 40kg"
              required
            />
          </div>

          {/* Info Card */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-gray-600 space-y-1">
                <p>• The crop will be added to your inventory</p>
                <p>• It will appear in the dashboard if there's space</p>
                <p>• All crops remain searchable regardless of visibility</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-1" />
              Add Crop
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 