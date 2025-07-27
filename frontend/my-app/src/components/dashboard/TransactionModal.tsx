'use client';

import { useState, useEffect } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { Transaction, TransactionStatus, PaymentMethod } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete';
import { toast } from 'sonner';
import { Calculator, User, FileText, Printer } from 'lucide-react';

export function TransactionModal() {
  const { state, dispatch } = useInventory();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    // Basic transaction fields
    quantity: '',
    rate: '',
    notes: '',
    
    // New database fields
    status: 'confirmed' as TransactionStatus,
    paymentMethod: 'cash' as PaymentMethod,
    referenceNumber: '',
    batchNumber: '',
    taxPercentage: '',
    discountAmount: '',
    qualityGrade: '',
    qualityNotes: '',
    vehicleNumber: '',
    driverName: '',
    deliveryAddress: '',
    dueDate: '',
  });

  // Customer data state
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    address: '',
    customerId: undefined as string | undefined,
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
    const taxPercentage = parseFloat(formData.taxPercentage) || 0;
    const discountAmount = parseFloat(formData.discountAmount) || 0;
    
    const subtotal = (quantity * rate) / 40; // Total = (qty * rate) / 40kg
    const taxAmount = (subtotal * taxPercentage) / 100;
    const finalAmount = subtotal + taxAmount - discountAmount;
    
    return {
      subtotal,
      taxAmount,
      finalAmount: Math.max(0, finalAmount)
    };
  };

  // Generate invoice number for single transaction
  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `NC${year}${month}${day}${random}`;
  };

  // Print transaction receipt
  const handlePrintTransaction = (transaction: Transaction) => {
    const subtotal = Math.abs(transaction.total);
    const taxAmount = transaction.taxAmount || 0;
    const discountAmount = transaction.discountAmount || 0;
    const finalAmount = transaction.finalAmount || subtotal;
    
    // Create a temporary print container
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print the receipt');
      return;
    }

    // Create a minimal HTML structure for printing
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${transaction.cropName}</title>
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
            .receipt-type { text-align: center; font-size: 10px; font-weight: bold; margin-bottom: 2mm; }
            .info-row { display: flex; justify-content: space-between; margin: 1mm 0; }
            .item { margin: 2mm 0; padding: 1mm 0; border-bottom: 1px dashed #ccc; }
            .item-name { font-weight: bold; margin-bottom: 0.5mm; }
            .item-details { display: flex; justify-content: space-between; font-size: 7px; color: #666; }
            .total-section { border-top: 1px dashed #666; padding-top: 2mm; margin-top: 2mm; }
            .total-row { display: flex; justify-content: space-between; margin: 0.5mm 0; }
            .final-total { font-weight: bold; font-size: 9px; border-top: 1px dashed #666; padding-top: 1mm; margin-top: 1mm; }
            .footer { text-align: center; border-top: 1px dashed #666; padding-top: 2mm; margin-top: 2mm; font-size: 7px; color: #666; }
            .buy { color: #dc2626; }
            .sell { color: #16a34a; }
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
            <p>NBP Bank, Kheror Pakka Road</p>
            <p>📞 +92 300 7373952</p>
          </div>
          
          <div class="receipt-type">
            ${transaction.action === 'buy' ? 'PURCHASE RECEIPT' : 'SALES RECEIPT'}
          </div>
          
          <div class="info-row">
            <span>#${(transaction.referenceNumber || generateInvoiceNumber()).slice(-6)}</span>
            <span>${new Date(transaction.date).toLocaleDateString()} ${new Date(transaction.date).toLocaleTimeString().slice(0,5)}</span>
          </div>
          
          <div class="info-row">
            <strong>Party: ${transaction.partyName}</strong>
          </div>
          
          <div class="item">
            <div class="item-name">
              ${transaction.cropName}
              <span style="float: right; font-size: 7px; background: ${transaction.action === 'buy' ? '#fecaca' : '#bbf7d0'}; 
                     color: ${transaction.action === 'buy' ? '#991b1b' : '#166534'}; padding: 1px 3px; border-radius: 2px;">
                ${transaction.action.toUpperCase()}
              </span>
            </div>
            <div class="item-details">
              <span>${transaction.quantity}kg x Rs.${transaction.rate}/40kg</span>
              <span class="${transaction.action}">
                ${transaction.action === 'buy' ? '-' : '+'} Rs.${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          <div class="total-section">
            <div class="total-row">
              <span>${transaction.action === 'buy' ? 'Purchase Total:' : 'Sales Total:'}</span>
              <span class="${transaction.action}">
                ${transaction.action === 'buy' ? '-' : '+'} Rs.${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            
            ${taxAmount > 0 ? `
              <div class="total-row">
                <span>Tax (${transaction.taxPercentage || 0}%):</span>
                <span>Rs.${taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            
            ${discountAmount > 0 ? `
              <div class="total-row">
                <span>Discount:</span>
                <span class="buy">- Rs.${discountAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            
            <div class="final-total">
              <div class="total-row">
                <span>${finalAmount >= 0 ? 'Amount Received:' : 'Amount Paid:'}</span>
                <span class="${finalAmount >= 0 ? 'sell' : 'buy'}">
                  Rs.${Math.abs(finalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            
            <div class="total-row" style="margin-top: 2mm;">
              <span>Payment:</span>
              <span>${transaction.paymentMethod?.toUpperCase() || 'CASH'}</span>
            </div>
            
            <div class="total-row">
              <span>Cash Flow:</span>
              <span class="${finalAmount >= 0 ? 'sell' : 'buy'}">
                ${finalAmount >= 0 ? 'Money In' : 'Money Out'}
              </span>
            </div>
          </div>
          
          ${transaction.notes ? `
            <div class="total-section">
              <div><strong>Notes:</strong></div>
              <div style="color: #666; margin-top: 0.5mm;">${transaction.notes}</div>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p style="margin-top: 1mm;">*** Computer Generated Receipt ***</p>
            <p>For queries: +92 300 7373952</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Add event listeners to detect print completion/cancellation
    const beforePrint = () => {
      // Print dialog opened
    };
    
    const afterPrint = () => {
      // Print dialog closed (either printed or cancelled)
      printWindow.removeEventListener('beforeprint', beforePrint);
      printWindow.removeEventListener('afterprint', afterPrint);
      printWindow.close();
      
      toast.dismiss();
      toast.success(`Receipt operation completed for ${transaction.cropName} transaction!`);
    };
    
    // Add event listeners to print window
    printWindow.addEventListener('beforeprint', beforePrint);
    printWindow.addEventListener('afterprint', afterPrint);
    
    // Wait a moment for content to load, then print
    setTimeout(() => {
      try {
        printWindow.print();
        
        // Fallback: close window after 5 seconds if events don't fire
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.removeEventListener('beforeprint', beforePrint);
            printWindow.removeEventListener('afterprint', afterPrint);
            printWindow.close();
            toast.dismiss();
            toast.success(`Receipt operation completed for ${transaction.cropName} transaction!`);
          }
        }, 5000);
        
      } catch (error) {
        console.error('Print error:', error);
        printWindow.close();
        toast.dismiss();
        toast.error('Failed to print receipt. Please try again.');
      }
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCrop || !actionType) return;

    const quantity = parseFloat(formData.quantity);
    const rate = parseFloat(formData.rate);
    
    if (!quantity || !rate || !customerData.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (actionType === 'sell' && quantity > selectedCrop.stock) {
      toast.error('Insufficient stock for this transaction');
      return;
    }

    const totalCalc = calculateTotal();
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      cropId: selectedCrop.id,
      cropName: selectedCrop.name,
      action: actionType,
      quantity,
      rate,
      total: actionType === 'buy' ? -totalCalc.finalAmount : totalCalc.finalAmount, // Negative for purchases, positive for sales
      partyName: customerData.name,
      customerId: customerData.customerId,
      notes: formData.notes || undefined,
      date: new Date(),
      
      // New required fields
      status: formData.status,
      paymentMethod: formData.paymentMethod,
      
      // Optional fields
      referenceNumber: formData.referenceNumber || undefined,
      batchNumber: formData.batchNumber || undefined,
      taxPercentage: parseFloat(formData.taxPercentage) || undefined,
      taxAmount: totalCalc.taxAmount,
      discountAmount: parseFloat(formData.discountAmount) || undefined,
      finalAmount: totalCalc.finalAmount,
      qualityGrade: formData.qualityGrade || undefined,
      qualityNotes: formData.qualityNotes || undefined,
      vehicleNumber: formData.vehicleNumber || undefined,
      driverName: formData.driverName || undefined,
      deliveryAddress: formData.deliveryAddress || undefined,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
    };

    // Store the transaction for the confirmation dialog
    setPendingTransaction(newTransaction);
    
    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const processTransaction = (transaction: Transaction, shouldPrint: boolean = false) => {
    // Add transaction and update stock
    dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
    dispatch({
      type: 'UPDATE_CROP_STOCK',
      payload: { cropId: transaction.cropId, quantity: transaction.quantity, action: transaction.action },
    });

    // Show success toast
    const actionText = transaction.action === 'buy' ? 'Bought' : 'Sold';
    toast.dismiss();
    toast.success(
      `${actionText} ${transaction.quantity}kg ${transaction.cropName} - Rs. ${transaction.finalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    );

    // Handle printing if requested
    if (shouldPrint && transaction) {
      setTimeout(() => {
        handlePrintTransaction(transaction);
      }, 100);
    }
    
    // Close modal and reset
    setTimeout(() => {
      handleClose();
    }, shouldPrint ? 500 : 2000);
  };

  const handleConfirmPrint = () => {
    setShowConfirmDialog(false);
    if (pendingTransaction) {
      processTransaction(pendingTransaction, true);
    }
  };

  const handleConfirmNoPrint = () => {
    setShowConfirmDialog(false);
    if (pendingTransaction) {
      processTransaction(pendingTransaction, false);
    }
  };

  const handleClose = () => {
    setPendingTransaction(null);
    dispatch({ type: 'SET_TRANSACTION_MODAL_OPEN', payload: false });
    setFormData({
      quantity: '',
      rate: '',
      notes: '',
      status: 'confirmed',
      paymentMethod: 'cash',
      referenceNumber: '',
      batchNumber: '',
      taxPercentage: '',
      discountAmount: '',
      qualityGrade: '',
      qualityNotes: '',
      vehicleNumber: '',
      driverName: '',
      deliveryAddress: '',
      dueDate: '',
    });
    setCustomerData({
      name: '',
      phone: '',
      address: '',
      customerId: undefined,
    });
  };

  if (!selectedCrop || !actionType) return null;

  const totalCalc = calculateTotal();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        // Allow closing with X button or clicking outside
        if (!open) {
          handleClose();
        }
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

            {/* Customer Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <User className="w-4 h-4 mr-1" />
                {actionType === 'buy' ? 'Seller' : 'Buyer'} Information
              </label>
              <CustomerAutocomplete
                value={customerData}
                onChange={(customer) => setCustomerData({
                  name: customer.name,
                  phone: customer.phone || '',
                  address: customer.address || '',
                  customerId: customer.customerId,
                })}
                placeholder={`Search ${actionType === 'buy' ? 'seller' : 'buyer'} or add new...`}
                required
                actionType={actionType}
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

            {/* Transaction Status & Payment Method */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Transaction Status */}
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value: TransactionStatus) =>
                    setFormData(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value: PaymentMethod) =>
                    setFormData(prev => ({ ...prev, paymentMethod: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
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

            {/* Total Calculation - Moved to before action buttons */}
            <Card className={`${actionType === 'buy' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>Rs. {totalCalc.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  {totalCalc.taxAmount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Tax:</span>
                      <span>Rs. {totalCalc.taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {parseFloat(formData.discountAmount) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Discount:</span>
                      <span className="text-red-600">- Rs. {parseFloat(formData.discountAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <hr className={`${actionType === 'buy' ? 'border-red-300' : 'border-green-300'}`} />
                  <div className="flex justify-between items-center">
                    <span className="font-medium flex items-center">
                      <Calculator className="w-4 h-4 mr-1" />
                      {actionType === 'buy' ? 'Money Paid:' : 'Money Received:'}
                    </span>
                    <span className={`font-bold text-lg ${actionType === 'buy' ? 'text-red-700' : 'text-green-700'}`}>
                      {actionType === 'buy' ? '- ' : '+ '}Rs. {totalCalc.finalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  {/* Cash flow indicator */}
                  <div className="text-center mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      actionType === 'buy' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {actionType === 'buy' ? '💸 Cash Outflow' : '💰 Cash Inflow'}
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
                {actionType === 'buy' ? 'Buy' : 'Sell'} Crop
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Print Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Print Receipt Confirmation
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-gray-600 mb-4">
              Transaction will be processed successfully!
            </p>
            <p className="text-sm text-gray-500">
              Do you want to print the receipt after processing the transaction?
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={handleConfirmNoPrint}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Complete Only
            </Button>
            <Button 
              onClick={handleConfirmPrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="w-4 h-4" />
              Complete & Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}