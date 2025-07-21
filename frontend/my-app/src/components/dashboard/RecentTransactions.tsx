'use client';

import { useInventory } from '@/context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, TrendingUp, TrendingDown, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Transaction } from '@/types';

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

  // Generate invoice number for single transaction
  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `NC${year}${month}${day}${random}`;
  };

  // Convert single transaction to bill format
  const convertTransactionToBill = (transaction: Transaction) => {
    const subtotal = Math.abs(transaction.total);
    const taxAmount = transaction.taxAmount || 0;
    const discountAmount = transaction.discountAmount || 0;
    const finalAmount = transaction.finalAmount || subtotal;
    
    return {
      billNumber: transaction.referenceNumber || generateInvoiceNumber(),
      partyName: transaction.partyName,
      date: new Date(transaction.date),
      items: [{
        cropName: transaction.cropName,
        action: transaction.action,
        quantity: transaction.quantity,
        rate: transaction.rate,
        subtotal: subtotal
      }],
      buyTotal: transaction.action === 'buy' ? subtotal : 0,
      sellTotal: transaction.action === 'sell' ? subtotal : 0,
      grossTotal: subtotal,
      netAmount: transaction.action === 'sell' ? subtotal : -subtotal,
      taxPercentage: transaction.taxPercentage || 0,
      taxAmount: taxAmount,
      discountAmount: discountAmount,
      finalAmount: transaction.action === 'sell' ? finalAmount : -finalAmount,
      transactionType: transaction.action as 'buy' | 'sell',
      paymentMethod: transaction.paymentMethod || 'cash',
      notes: transaction.notes
    };
  };

  const handlePrintTransaction = (transaction: Transaction) => {
    const billData = convertTransactionToBill(transaction);
    
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
            ${billData.transactionType === 'buy' ? 'PURCHASE RECEIPT' : 'SALES RECEIPT'}
          </div>
          
          <div class="info-row">
            <span>#${billData.billNumber.slice(-6)}</span>
            <span>${new Date(billData.date).toLocaleDateString()} ${new Date(billData.date).toLocaleTimeString().slice(0,5)}</span>
          </div>
          
          <div class="info-row">
            <strong>Party: ${billData.partyName}</strong>
          </div>
          
          <div class="item">
            <div class="item-name">
              ${billData.items[0].cropName}
              <span style="float: right; font-size: 7px; background: ${billData.items[0].action === 'buy' ? '#fecaca' : '#bbf7d0'}; 
                     color: ${billData.items[0].action === 'buy' ? '#991b1b' : '#166534'}; padding: 1px 3px; border-radius: 2px;">
                ${billData.items[0].action.toUpperCase()}
              </span>
            </div>
            <div class="item-details">
              <span>${billData.items[0].quantity}kg x Rs.${billData.items[0].rate}/40kg</span>
              <span class="${billData.items[0].action}">
                ${billData.items[0].action === 'buy' ? '-' : '+'} Rs.${billData.items[0].subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          <div class="total-section">
            <div class="total-row">
              <span>${billData.transactionType === 'buy' ? 'Purchase Total:' : 'Sales Total:'}</span>
              <span class="${billData.transactionType}">
                ${billData.transactionType === 'buy' ? '-' : '+'} Rs.${billData.grossTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            
            ${billData.taxAmount > 0 ? `
              <div class="total-row">
                <span>Tax (${billData.taxPercentage}%):</span>
                <span>Rs.${billData.taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            
            ${billData.discountAmount > 0 ? `
              <div class="total-row">
                <span>Discount:</span>
                <span class="buy">- Rs.${billData.discountAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            
            <div class="final-total">
              <div class="total-row">
                <span>${billData.finalAmount >= 0 ? 'Amount Received:' : 'Amount Paid:'}</span>
                <span class="${billData.finalAmount >= 0 ? 'sell' : 'buy'}">
                  Rs.${Math.abs(billData.finalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            
            <div class="total-row" style="margin-top: 2mm;">
              <span>Payment:</span>
              <span>${billData.paymentMethod.toUpperCase()}</span>
            </div>
            
            <div class="total-row">
              <span>Cash Flow:</span>
              <span class="${billData.finalAmount >= 0 ? 'sell' : 'buy'}">
                ${billData.finalAmount >= 0 ? 'Money In' : 'Money Out'}
              </span>
            </div>
          </div>
          
          ${billData.notes ? `
            <div class="total-section">
              <div><strong>Notes:</strong></div>
              <div style="color: #666; margin-top: 0.5mm;">${billData.notes}</div>
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
    
    // Wait a moment for content to load, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      toast.dismiss();
      toast.success(`Receipt printed for ${transaction.cropName} transaction!`);
    }, 500);
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
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center space-x-3 flex-1">
                  {getActionIcon(transaction.action)}
                  <div className="flex-1">
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
                
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className={`font-semibold ${transaction.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.total >= 0 ? '+' : ''} Rs. {Math.abs(transaction.total).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(transaction.date)}
                    </div>
                  </div>
                  
                  {/* Print Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePrintTransaction(transaction)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Print Receipt"
                  >
                    <Printer className="w-3 h-3" />
                  </Button>
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