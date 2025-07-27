'use client';

import { useState, useRef } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { Transaction, TransactionStatus, PaymentMethod } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calculator, Plus, Trash2, ShoppingCart, User, FileText, Printer } from 'lucide-react';
import { BillPrint } from '@/components/bill/BillPrint';
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete';

interface BulkTransactionItem {
  id: string;
  cropName: string;
  action: 'buy' | 'sell';
  quantity: string;
  rate: string;
  subtotal: number;
}

interface BulkTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkTransactionModal({ isOpen, onClose }: BulkTransactionModalProps) {
  const { state, dispatch } = useInventory();
  const billPrintRef = useRef<HTMLDivElement>(null);
  
  const [transactionItems, setTransactionItems] = useState<BulkTransactionItem[]>([
    { id: '1', cropName: '', action: 'buy', quantity: '', rate: '', subtotal: 0 }
  ]);
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    notes: '',
    status: 'confirmed' as TransactionStatus,
    paymentMethod: 'cash' as PaymentMethod,
    taxPercentage: '',
    discountAmount: '',
    referenceNumber: '',
  });

  // Customer data state
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    address: '',
    customerId: undefined as string | undefined,
  });
  
  const [lastProcessedTransaction, setLastProcessedTransaction] = useState<{
    items: BulkTransactionItem[],
    totals: ReturnType<typeof calculateTotals>,
    partyName: string,
    date: Date,
    referenceNumber?: string
  } | null>(null);

  const availableCrops = state.crops.map(crop => crop.name);

  const addNewItem = () => {
    const newItem: BulkTransactionItem = {
      id: Date.now().toString(),
      cropName: '',
      action: 'buy',
      quantity: '',
      rate: '',
      subtotal: 0
    };
    setTransactionItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    if (transactionItems.length > 1) {
      setTransactionItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BulkTransactionItem, value: string | number) => {
    setTransactionItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Calculate subtotal when quantity or rate changes
        if (field === 'quantity' || field === 'rate') {
          const quantity = parseFloat(String(field === 'quantity' ? value : updated.quantity)) || 0;
          const rate = parseFloat(String(field === 'rate' ? value : updated.rate)) || 0;
          updated.subtotal = (quantity * rate) / 40; // Same calculation as single transaction
        }
        
        return updated;
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    // Separate buy and sell totals
    let buyTotal = 0;
    let sellTotal = 0;
    
    transactionItems.forEach(item => {
      if (item.action === 'buy') {
        buyTotal += item.subtotal;
      } else if (item.action === 'sell') {
        sellTotal += item.subtotal;
      }
    });
    
    const grossTotal = buyTotal + sellTotal; // For tax calculation
    const netAmount = sellTotal - buyTotal; // Net cash flow (positive = money in, negative = money out)
    
    const taxPercentage = parseFloat(formData.taxPercentage) || 0;
    const discountAmount = parseFloat(formData.discountAmount) || 0;
    
    // Apply tax to gross total, then adjust for net flow
    const taxAmount = (grossTotal * taxPercentage) / 100;
    
    // Final calculation based on transaction type
    let finalAmount;
    if (buyTotal > 0 && sellTotal > 0) {
      // Mixed transaction: net amount with tax and discount
      finalAmount = netAmount + (netAmount > 0 ? taxAmount : -taxAmount) - discountAmount;
    } else if (buyTotal > 0) {
      // Only buying: money going out (negative)
      finalAmount = -(buyTotal + taxAmount - discountAmount);
    } else {
      // Only selling: money coming in (positive)
      finalAmount = sellTotal + taxAmount - discountAmount;
    }
    
    return {
      buyTotal,
      sellTotal,
      grossTotal,
      netAmount,
      taxAmount,
      finalAmount: finalAmount,
      itemCount: transactionItems.length,
      transactionType: buyTotal > 0 && sellTotal > 0 ? 'mixed' : buyTotal > 0 ? 'buy' : 'sell'
    };
  };

  const validateTransaction = () => {
    // Check if all items have required fields
    for (const item of transactionItems) {
      if (!item.cropName || !item.quantity || !item.rate) {
        toast.error('Please fill all crop details');
        return false;
      }
      
      // Check if crop exists in inventory
      const crop = state.crops.find(c => c.name.toLowerCase() === item.cropName.toLowerCase());
      if (!crop) {
        toast.error(`Crop "${item.cropName}" not found in inventory`);
        return false;
      }
      
      // Check stock for sell transactions
      if (item.action === 'sell') {
        const quantity = parseFloat(item.quantity);
        if (quantity > crop.stock) {
          toast.error(`Insufficient stock for ${item.cropName}. Available: ${crop.stock}kg`);
          return false;
        }
      }
    }
    
    if (!customerData.name) {
      toast.error('Please enter customer name');
      return false;
    }
    
    return true;
  };

  // Generate invoice number automatically
  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `NC${year}${month}${day}${random}`;
  };

  const processTransactions = (shouldPrint: boolean = false) => {
    const totals = calculateTotals();
    const timestamp = new Date();
    const bulkId = `bulk-${Date.now()}`;
    
    // Generate invoice number if not provided
    const invoiceNumber = formData.referenceNumber || generateInvoiceNumber();
    
    // Process all transactions first (save to state)
    transactionItems.forEach((item, index) => {
      const crop = state.crops.find(c => c.name.toLowerCase() === item.cropName.toLowerCase());
      if (!crop) return;
      
      const quantity = parseFloat(item.quantity);
      const rate = parseFloat(item.rate);
      
      const newTransaction: Transaction = {
        id: `${Date.now()}-${index}`,
        cropId: crop.id,
        cropName: crop.name,
        action: item.action,
        quantity,
        rate,
        total: item.action === 'buy' ? -item.subtotal : item.subtotal, // Negative for purchases, positive for sales
        partyName: customerData.name,
        customerId: customerData.customerId,
        notes: formData.notes || undefined,
        date: timestamp,
        status: formData.status,
        paymentMethod: formData.paymentMethod,
        referenceNumber: invoiceNumber,
        taxPercentage: parseFloat(formData.taxPercentage) || undefined,
        taxAmount: (item.subtotal * (parseFloat(formData.taxPercentage) || 0)) / 100,
        discountAmount: index === 0 ? parseFloat(formData.discountAmount) || undefined : undefined, // Apply discount only to first item
        finalAmount: index === transactionItems.length - 1 ? totals.finalAmount : (item.action === 'buy' ? -item.subtotal : item.subtotal), // Final amount only on last item
        bulkTransactionId: bulkId, // Group identifier for bulk transactions
      };
      
      // Add transaction and update stock immediately
      dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
      dispatch({
        type: 'UPDATE_CROP_STOCK',
        payload: { cropId: crop.id, quantity, action: item.action },
      });
    });
    
    // Prepare transaction data for printing
    const transactionData = {
      items: [...transactionItems],
      totals,
      partyName: customerData.name,
      date: timestamp,
      referenceNumber: invoiceNumber
    };
    
    // Show success toast
    const cashFlowText = totals.finalAmount >= 0 
      ? `Money received: Rs. ${Math.abs(totals.finalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
      : `Money paid: Rs. ${Math.abs(totals.finalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    
    toast.dismiss();
    toast.success(
      `Bulk transaction completed! ${totals.itemCount} items - ${cashFlowText}`
    );
    
    // Handle printing if requested
    if (shouldPrint) {
      setTimeout(() => {
        handlePrintTransaction(transactionData);
      }, 100);
    } else {
      // Close modal immediately if not printing
      setTimeout(() => {
        handleClose();
      }, 1500); // Give time to see the success toast
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateTransaction()) return;
    
    // Show custom confirmation dialog for printing
    setShowConfirmDialog(true);
  };

  // Print transaction bill
  const handlePrintTransaction = (transactionData: {
    items: BulkTransactionItem[],
    totals: ReturnType<typeof calculateTotals>,
    partyName: string,
    date: Date,
    referenceNumber: string
  }) => {
    // Create popup window for printing - centered and properly sized
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const windowWidth = 500;
    const windowHeight = 700;
    const left = (screenWidth - windowWidth) / 2;
    const top = (screenHeight - windowHeight) / 2;
    
    const printWindow = window.open(
      '', 
      '_blank', 
      `width=${windowWidth},height=${windowHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
    if (!printWindow) {
      toast.error('Please allow popups to print the bill');
      return;
    }

    // Generate the bill HTML directly
    const billHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill - ${transactionData.referenceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 10px; 
              line-height: 1.3; 
              width: 80mm; 
              margin: 0 auto; 
              padding: 3mm;
            }
            .header { text-align: center; border-bottom: 1px dashed #666; padding-bottom: 3mm; margin-bottom: 3mm; }
            .header h1 { font-size: 14px; font-weight: bold; margin-bottom: 2mm; }
            .header p { font-size: 9px; margin: 0.5mm 0; }
            .bill-type { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 3mm; }
            .info-row { display: flex; justify-content: space-between; margin: 1mm 0; }
            .items-header { font-weight: bold; border-bottom: 1px solid #666; padding: 1mm 0; margin: 2mm 0; }
            .item { margin: 1.5mm 0; padding: 1mm 0; border-bottom: 1px dashed #ccc; }
            .item-header { font-weight: bold; margin-bottom: 0.5mm; }
            .item-details { font-size: 8px; color: #666; margin: 0.5mm 0; }
            .total-section { border-top: 1px dashed #666; padding-top: 2mm; margin-top: 3mm; }
            .total-row { display: flex; justify-content: space-between; margin: 0.5mm 0; }
            .final-total { font-weight: bold; font-size: 11px; border-top: 1px dashed #666; padding-top: 2mm; margin-top: 2mm; }
            .footer { text-align: center; border-top: 1px dashed #666; padding-top: 3mm; margin-top: 3mm; font-size: 8px; color: #666; }
            .buy { color: #dc2626; }
            .sell { color: #16a34a; }
            @media print {
              @page { size: 80mm auto; margin: 0; }
              body { width: 76mm; margin: 2mm auto; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>NAEEM & CO</h1>
            <p>Agricultural Products Trading</p>
            <p>NBP Bank, Kheror Pakka Road</p>
            <p>Phone: +92 300 7373952</p>
          </div>
          
          <div class="bill-type">
            ${transactionData.totals.transactionType === 'mixed' ? 'MIXED TRANSACTION BILL' : 
              transactionData.totals.transactionType === 'buy' ? 'PURCHASE BILL' : 'SALES BILL'}
          </div>
          
          <div class="info-row">
            <span>#${transactionData.referenceNumber}</span>
            <span>${new Date(transactionData.date).toLocaleDateString()} ${new Date(transactionData.date).toLocaleTimeString().slice(0,5)}</span>
          </div>
          
          <div class="info-row">
            <strong>Party: ${transactionData.partyName}</strong>
          </div>
          
          <div class="items-header">
            TRANSACTION ITEMS (${transactionData.items.length})
          </div>
          
          ${transactionData.items.map(item => `
            <div class="item">
              <div class="item-header">
                ${item.cropName}
                <span style="float: right; font-size: 8px; background: ${item.action === 'buy' ? '#fecaca' : '#bbf7d0'}; 
                       color: ${item.action === 'buy' ? '#991b1b' : '#166534'}; padding: 1px 4px; border-radius: 2px;">
                  ${item.action.toUpperCase()}
                </span>
              </div>
              <div class="item-details">
                <div>${item.quantity}kg x Rs.${item.rate}/40kg</div>
                <div style="float: right; font-weight: bold;" class="${item.action}">
                  ${item.action === 'buy' ? '-' : '+'} Rs.${item.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          `).join('')}
          
          <div class="total-section">
            ${transactionData.totals.transactionType === 'mixed' ? `
              <div class="total-row">
                <span>Purchase Total:</span>
                <span class="buy">- Rs.${transactionData.totals.buyTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div class="total-row">
                <span>Sales Total:</span>
                <span class="sell">+ Rs.${transactionData.totals.sellTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div class="total-row">
                <span>Net Amount:</span>
                <span class="${transactionData.totals.netAmount >= 0 ? 'sell' : 'buy'}">
                  ${transactionData.totals.netAmount >= 0 ? '+' : ''} Rs.${Math.abs(transactionData.totals.netAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            ` : `
              <div class="total-row">
                <span>${transactionData.totals.transactionType === 'buy' ? 'Purchase Total:' : 'Sales Total:'}</span>
                <span class="${transactionData.totals.transactionType}">
                  ${transactionData.totals.transactionType === 'buy' ? '-' : '+'} Rs.${transactionData.totals.grossTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            `}
            
            ${transactionData.totals.taxAmount > 0 ? `
              <div class="total-row">
                <span>Tax:</span>
                <span>Rs.${transactionData.totals.taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            
            ${parseFloat(formData.discountAmount) > 0 ? `
              <div class="total-row">
                <span>Discount:</span>
                <span class="buy">- Rs.${parseFloat(formData.discountAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            
            <div class="final-total">
              <div class="total-row">
                <span>${transactionData.totals.finalAmount >= 0 ? 'Amount Received:' : 'Amount Paid:'}</span>
                <span class="${transactionData.totals.finalAmount >= 0 ? 'sell' : 'buy'}">
                  Rs.${Math.abs(transactionData.totals.finalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            
            <div class="total-row" style="margin-top: 2mm;">
              <span>Payment:</span>
              <span>${formData.paymentMethod.toUpperCase()}</span>
            </div>
            
            <div class="total-row">
              <span>Cash Flow:</span>
              <span class="${transactionData.totals.finalAmount >= 0 ? 'sell' : 'buy'}">
                ${transactionData.totals.finalAmount >= 0 ? 'Money In' : 'Money Out'}
              </span>
            </div>
          </div>
          
          ${formData.notes ? `
            <div class="total-section">
              <div><strong>Notes:</strong></div>
              <div style="color: #666; margin-top: 1mm;">${formData.notes}</div>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p style="margin-top: 1mm;">*** Computer Generated Bill ***</p>
            <p>For queries: +92 300 7373952</p>
          </div>
        </body>
      </html>
    `;

    // Write HTML to print window
    printWindow.document.write(billHTML);
    printWindow.document.close();

    // Add event listeners for print completion/cancellation
    const afterPrint = () => {
      printWindow.removeEventListener('afterprint', afterPrint);
      printWindow.close();
      
      // Close the modal after print operation
      setTimeout(() => {
        handleClose();
      }, 500);
    };

    printWindow.addEventListener('afterprint', afterPrint);

    // Wait for content to load, then print
    setTimeout(() => {
      try {
        printWindow.print();
        
        // Fallback: if afterprint doesn't fire within 5 seconds
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.removeEventListener('afterprint', afterPrint);
            printWindow.close();
            setTimeout(() => {
              handleClose();
            }, 500);
          }
        }, 5000);
        
      } catch (error) {
        console.error('Print error:', error);
        printWindow.close();
        toast.dismiss();
        toast.error('Failed to print bill. Please try again.');
        setTimeout(() => {
          handleClose();
        }, 1000);
      }
    }, 500);
  };

  const handleConfirmPrint = () => {
    setShowConfirmDialog(false);
    processTransactions(true);
  };

  const handleConfirmNoPrint = () => {
    setShowConfirmDialog(false);
    processTransactions(false);
  };

  const handleClose = () => {
    setTransactionItems([
      { id: '1', cropName: '', action: 'buy', quantity: '', rate: '', subtotal: 0 }
    ]);
    setFormData({
      notes: '',
      status: 'confirmed',
      paymentMethod: 'cash',
      taxPercentage: '',
      discountAmount: '',
      referenceNumber: '',
    });
    setCustomerData({
      name: '',
      phone: '',
      address: '',
      customerId: undefined,
    });
    setLastProcessedTransaction(null);
    onClose();
  };

  const totals = calculateTotals();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Bulk Transaction</span>
              <Badge variant="outline">{totals.itemCount} items</Badge>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Items */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Items</h3>
              <Button type="button" onClick={addNewItem} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>
            
            {transactionItems.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                  {/* Crop Name */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Crop</label>
                    <Select
                      value={item.cropName}
                      onValueChange={(value) => updateItem(item.id, 'cropName', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select crop" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCrops.map(cropName => (
                          <SelectItem key={cropName} value={cropName}>
                            {cropName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Action */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Action</label>
                    <Select
                      value={item.action}
                      onValueChange={(value: 'buy' | 'sell') => updateItem(item.id, 'action', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Quantity */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Qty (kg)</label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  
                  {/* Rate */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Rate/40kg</label>
                    <Input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  
                  {/* Subtotal */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Subtotal</label>
                    <div className="p-2 bg-gray-50 rounded text-sm font-medium">
                      Rs. {item.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  {/* Remove Button */}
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      disabled={transactionItems.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Party Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <User className="w-4 h-4 mr-2" />
                Party Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer Information</label>
                  <CustomerAutocomplete
                    value={customerData}
                    onChange={(customer) => setCustomerData({
                      name: customer.name,
                      phone: customer.phone || '',
                      address: customer.address || '',
                      customerId: customer.customerId,
                    })}
                    placeholder="Search customer or add new..."
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice Number (Optional)</label>
                  <Input
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    placeholder="Auto-generated if empty (NCyymmddxxxx)"
                  />
                  <p className="text-xs text-gray-500">Leave empty to auto-generate invoice number</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: TransactionStatus) =>
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value: PaymentMethod) =>
                      setFormData(prev => ({ ...prev, paymentMethod: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax % (Optional)</label>
                  <Input
                    type="number"
                    value={formData.taxPercentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxPercentage: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount Amount (Optional)</label>
                  <Input
                    type="number"
                    value={formData.discountAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountAmount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

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
            </CardContent>
          </Card>

          {/* Total Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="space-y-2">
                {/* Show breakdown for mixed transactions */}
                {totals.transactionType === 'mixed' && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Purchase Total (Money Out):</span>
                      <span className="text-red-600">- Rs. {totals.buyTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Sales Total (Money In):</span>
                      <span className="text-green-600">+ Rs. {totals.sellTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Net Amount:</span>
                      <span className={totals.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {totals.netAmount >= 0 ? '+' : ''} Rs. {totals.netAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}
                
                {/* Show simple total for single transaction type */}
                {totals.transactionType !== 'mixed' && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      {totals.transactionType === 'buy' ? 'Purchase Total:' : 'Sales Total:'} ({totals.itemCount} items)
                    </span>
                    <span className={totals.transactionType === 'buy' ? 'text-red-600' : 'text-green-600'}>
                      {totals.transactionType === 'buy' ? '- ' : '+ '}Rs. {totals.grossTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {totals.taxAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span>Rs. {totals.taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {parseFloat(formData.discountAmount) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="text-red-600">- Rs. {parseFloat(formData.discountAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <hr className="border-blue-300" />
                <div className="flex justify-between items-center">
                  <span className="font-medium flex items-center">
                    <Calculator className="w-4 h-4 mr-1" />
                    {totals.finalAmount >= 0 ? 'Money Received:' : 'Money Paid:'}
                  </span>
                  <span className={`font-bold text-lg ${totals.finalAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {totals.finalAmount >= 0 ? '+' : ''} Rs. {Math.abs(totals.finalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                {/* Cash flow indicator */}
                <div className="text-center mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    totals.finalAmount >= 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {totals.finalAmount >= 0 ? '💰 Cash Inflow' : '💸 Cash Outflow'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Process Bulk Transaction
            </Button>
          </div>
        </form>

        {/* Hidden Print Component */}
        {lastProcessedTransaction && (
          <div className="hidden">
            <BillPrint
              ref={billPrintRef}
              billData={{
                billNumber: lastProcessedTransaction.referenceNumber || `BULK-${Date.now()}`,
                partyName: lastProcessedTransaction.partyName,
                date: lastProcessedTransaction.date,
                items: lastProcessedTransaction.items.map(item => ({
                  cropName: item.cropName,
                  action: item.action,
                  quantity: parseFloat(item.quantity),
                  rate: parseFloat(item.rate),
                  subtotal: item.subtotal
                })),
                buyTotal: lastProcessedTransaction.totals.buyTotal,
                sellTotal: lastProcessedTransaction.totals.sellTotal,
                grossTotal: lastProcessedTransaction.totals.grossTotal,
                netAmount: lastProcessedTransaction.totals.netAmount,
                taxPercentage: parseFloat(formData.taxPercentage) || 0,
                taxAmount: lastProcessedTransaction.totals.taxAmount,
                discountAmount: parseFloat(formData.discountAmount) || 0,
                finalAmount: lastProcessedTransaction.totals.finalAmount,
                transactionType: lastProcessedTransaction.totals.transactionType as 'buy' | 'sell' | 'mixed',
                paymentMethod: formData.paymentMethod,
                notes: formData.notes
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Print Confirmation Dialog */}
    <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Print Bill Confirmation
          </DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <p className="text-gray-600 mb-4">
            Transaction will be processed successfully!
          </p>
          <p className="text-sm text-gray-500">
            Do you want to print the bill after processing the transaction?
          </p>
        </div>
        <div className="flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={handleConfirmNoPrint}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Process Only
          </Button>
          <Button 
            onClick={handleConfirmPrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" />
            Process & Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
