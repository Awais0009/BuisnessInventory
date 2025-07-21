'use client';

import { useState, useEffect } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { Crop } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Edit, Package, DollarSign, Hash } from 'lucide-react';

interface EditCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  crop: Crop | null;
}

export function EditCropModal({ isOpen, onClose, crop }: EditCropModalProps) {
  const { state, dispatch } = useInventory();
  
  const [formData, setFormData] = useState({
    name: '',
    stock: '',
    pricePerUnit: '',
    unit: 'kg',
  });

  // Update form data when crop changes
  useEffect(() => {
    if (crop) {
      setFormData({
        name: crop.name,
        stock: crop.stock.toString(),
        pricePerUnit: crop.pricePerUnit.toString(),
        unit: crop.unit || 'kg',
      });
    }
  }, [crop]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!crop) return;

    const name = formData.name.trim();
    const stock = parseFloat(formData.stock);
    const pricePerUnit = parseFloat(formData.pricePerUnit);

    // Validation
    if (!name) {
      toast.error('Please enter crop name');
      return;
    }

    if (isNaN(stock) || stock < 0) {
      toast.error('Please enter a valid stock amount');
      return;
    }

    if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
      toast.error('Please enter a valid price per unit');
      return;
    }

    // Check if name already exists (excluding current crop)
    const existingCrop = state.crops.find(c => 
      c.name.toLowerCase() === name.toLowerCase() && c.id !== crop.id
    );
    
    if (existingCrop) {
      toast.error('A crop with this name already exists');
      return;
    }

    const updatedCrop: Partial<Crop> = {
      name,
      stock,
      pricePerUnit,
      unit: formData.unit,
      lastTradedAt: new Date(), // Update last traded time
    };

    // Update crop
    dispatch({ 
      type: 'UPDATE_CROP', 
      payload: { id: crop.id, updates: updatedCrop } 
    });

    toast.success(`${name} updated successfully!`);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      stock: '',
      pricePerUnit: '',
      unit: 'kg',
    });
    onClose();
  };

  if (!crop) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="w-5 h-5" />
            <span>Edit Crop Details</span>
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
              placeholder="Enter crop name"
              required
            />
          </div>

          {/* Current Stock */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <Hash className="w-4 h-4 mr-1" />
              Current Stock (kg)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
              placeholder="Enter current stock"
              required
            />
          </div>

          {/* Price Per Unit */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <DollarSign className="w-4 h-4 mr-1" />
              Rate per 40kg (Rs.)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.pricePerUnit}
              onChange={(e) => setFormData(prev => ({ ...prev, pricePerUnit: e.target.value }))}
              placeholder="Enter rate per 40kg"
              required
            />
          </div>

          {/* Unit (Read-only for now) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Unit</label>
            <Input
              value={formData.unit}
              disabled
              className="bg-gray-50"
            />
          </div>

          {/* Current Values Display */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Current Values</h4>
            <div className="space-y-1 text-sm text-blue-700">
              <div className="flex justify-between">
                <span>Name:</span>
                <span>{crop.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Stock:</span>
                <span>{crop.stock}kg</span>
              </div>
              <div className="flex justify-between">
                <span>Rate:</span>
                <span>Rs. {crop.pricePerUnit.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Update Crop
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
