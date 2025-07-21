'use client';

import { forwardRef } from 'react';

interface BillItem {
  cropName: string;
  action: 'buy' | 'sell';
  quantity: number;
  rate: number;
  subtotal: number;
}

interface BillData {
  billNumber: string;
  partyName: string;
  date: Date;
  items: BillItem[];
  buyTotal: number;
  sellTotal: number;
  grossTotal: number;
  netAmount: number;
  taxPercentage: number;
  taxAmount: number;
  discountAmount: number;
  finalAmount: number;
  transactionType: 'buy' | 'sell' | 'mixed';
  paymentMethod: string;
  notes?: string;
}

interface BillPrintProps {
  billData: BillData;
}

export const BillPrint = forwardRef<HTMLDivElement, BillPrintProps>(({ billData }, ref) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
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

  const invoiceNumber = billData.billNumber && billData.billNumber !== `BULK-${Date.now()}` 
    ? billData.billNumber 
    : generateInvoiceNumber();

  return (
    <>
      {/* Preview Info - Only visible on screen */}
      <div className="text-center mb-4 p-2 bg-blue-50 border border-blue-200 rounded mx-auto" style={{ maxWidth: '300px' }}>
        <p className="text-sm font-medium text-blue-800">🧾 58mm Thermal Receipt Preview</p>
        <p className="text-xs text-blue-600">
          Width: 58mm (standard thermal paper) | Auto-height based on content
        </p>
        <p className="text-xs text-gray-500">
          Press Ctrl+P to see actual print preview | Optimized for thermal printers
        </p>
      </div>
      
      <div ref={ref} className="mx-auto bg-white text-black font-mono border border-gray-300 shadow-lg" 
           style={{ 
             width: '58mm', 
             maxWidth: '58mm', 
             minHeight: 'auto',
             padding: '2mm',
             margin: '0 auto',
             fontSize: '9px',
             lineHeight: '1.2'
           }}>
      {/* Shop Header */}
      <div className="text-center border-b border-dashed border-gray-400" style={{ paddingBottom: '1mm', marginBottom: '2mm' }}>
        <h1 style={{ fontSize: '11px', fontWeight: 'bold', margin: '0', lineHeight: '1.1' }}>NAEEM & CO</h1>
        <p style={{ fontSize: '8px', margin: '0.5mm 0', lineHeight: '1.1' }}>Agricultural Products Trading</p>
        <p style={{ fontSize: '8px', margin: '0.5mm 0', lineHeight: '1.1' }}>NBP Bank, Kheror Pakka Road</p>
        <p style={{ fontSize: '8px', margin: '0.5mm 0', lineHeight: '1.1' }}>📞 +92 300 7373952</p>
      </div>

      {/* Bill Info */}
      <div className="text-center" style={{ marginBottom: '2mm' }}>
        <h2 style={{ fontSize: '10px', fontWeight: 'bold', margin: '0' }}>
          {billData.transactionType === 'buy' ? 'PURCHASE RECEIPT' : 
           billData.transactionType === 'sell' ? 'SALES RECEIPT' : 
           'TRANSACTION RECEIPT'}
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', margin: '1mm 0' }}>
          <span>#{invoiceNumber.slice(-6)}</span>
          <span>{formatDate(billData.date).slice(0, 16)}</span>
        </div>
        <div style={{ fontSize: '8px', margin: '1mm 0' }}>
          <strong>Party: {billData.partyName}</strong>
        </div>
      </div>

      {/* Items */}
      <div className="border-b border-dashed border-gray-400" style={{ paddingBottom: '1mm', marginBottom: '2mm' }}>
        {billData.items.map((item, index) => (
          <div key={index} style={{ marginBottom: '1.5mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', fontWeight: '500', maxWidth: '35mm', wordWrap: 'break-word' }}>
                {item.cropName}
              </span>
              <span style={{ 
                fontSize: '7px', 
                padding: '0.5mm 1mm', 
                borderRadius: '1mm',
                backgroundColor: item.action === 'buy' ? '#fecaca' : '#bbf7d0',
                color: item.action === 'buy' ? '#991b1b' : '#166534'
              }}>
                {item.action.toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7px', color: '#666', margin: '0.5mm 0' }}>
              <span>{formatCurrency(item.quantity)}kg x Rs.{formatCurrency(item.rate)}/40kg</span>
              <span style={{ fontWeight: '500' }}>
                {item.action === 'buy' ? '-' : '+'} Rs.{formatCurrency(item.subtotal)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div style={{ fontSize: '8px', lineHeight: '1.3' }}>
        {billData.transactionType === 'mixed' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5mm 0' }}>
              <span>Purchase Total:</span>
              <span style={{ color: '#dc2626' }}>- Rs.{formatCurrency(billData.buyTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5mm 0' }}>
              <span>Sales Total:</span>
              <span style={{ color: '#16a34a' }}>+ Rs.{formatCurrency(billData.sellTotal)}</span>
            </div>
            <div style={{ 
              borderTop: '1px dashed #9ca3af', 
              paddingTop: '1mm', 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontWeight: '500',
              margin: '1mm 0'
            }}>
              <span>Net Amount:</span>
              <span style={{ color: billData.netAmount >= 0 ? '#16a34a' : '#dc2626' }}>
                {billData.netAmount >= 0 ? '+' : ''} Rs.{formatCurrency(Math.abs(billData.netAmount))}
              </span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5mm 0' }}>
            <span>{billData.transactionType === 'buy' ? 'Purchase Total:' : 'Sales Total:'}</span>
            <span style={{ color: billData.transactionType === 'buy' ? '#dc2626' : '#16a34a' }}>
              {billData.transactionType === 'buy' ? '-' : '+'} Rs.{formatCurrency(billData.grossTotal)}
            </span>
          </div>
        )}

        {billData.taxAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5mm 0' }}>
            <span>Tax ({billData.taxPercentage}%):</span>
            <span>Rs.{formatCurrency(billData.taxAmount)}</span>
          </div>
        )}

        {billData.discountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5mm 0' }}>
            <span>Discount:</span>
            <span style={{ color: '#dc2626' }}>- Rs.{formatCurrency(billData.discountAmount)}</span>
          </div>
        )}

        <div style={{ borderTop: '1px dashed #9ca3af', paddingTop: '1mm', marginTop: '1mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '9px' }}>
            <span>{billData.finalAmount >= 0 ? 'Amount Received:' : 'Amount Paid:'}</span>
            <span style={{ color: billData.finalAmount >= 0 ? '#166534' : '#991b1b' }}>
              Rs.{formatCurrency(Math.abs(billData.finalAmount))}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div style={{ 
        borderTop: '1px dashed #9ca3af', 
        paddingTop: '1mm', 
        marginTop: '2mm', 
        fontSize: '8px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5mm 0' }}>
          <span>Payment:</span>
          <span style={{ fontWeight: '500' }}>{billData.paymentMethod.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5mm 0' }}>
          <span>Cash Flow:</span>
          <span style={{ 
            fontWeight: '500', 
            color: billData.finalAmount >= 0 ? '#16a34a' : '#dc2626' 
          }}>
            {billData.finalAmount >= 0 ? 'Money In' : 'Money Out'}
          </span>
        </div>
      </div>

      {/* Notes */}
      {billData.notes && (
        <div style={{ 
          borderTop: '1px dashed #9ca3af', 
          paddingTop: '1mm', 
          marginTop: '2mm', 
          fontSize: '8px' 
        }}>
          <div style={{ fontWeight: 'bold' }}>Notes:</div>
          <div style={{ color: '#666', marginTop: '0.5mm' }}>{billData.notes}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ 
        borderTop: '1px dashed #9ca3af', 
        paddingTop: '1mm', 
        marginTop: '2mm', 
        textAlign: 'center', 
        fontSize: '8px' 
      }}>
        <p style={{ color: '#666', margin: '0.5mm 0' }}>Thank you for your business!</p>
        <p style={{ color: '#888', fontSize: '7px', margin: '0.5mm 0' }}>*** Computer Generated Receipt ***</p>
        <p style={{ color: '#aaa', fontSize: '7px', margin: '0.5mm 0' }}>For queries: +92 300 7373952</p>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media screen {
          /* Screen preview styles - keep the receipt contained */
          div[ref] {
            background: #f9f9f9;
            border: 2px dashed #ccc;
            margin: 20px auto;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            max-width: 300px;
          }
          div[ref]::before {
            content: "📄 58mm Thermal Receipt Preview";
            display: block;
            text-align: center;
            background: #e3f2fd;
            color: #1976d2;
            padding: 2px;
            font-size: 10px;
            margin: -2mm -2mm 2mm -2mm;
            border-radius: 2px 2px 0 0;
          }
        }
        
        @media print {
          /* Hide everything first */
          * {
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          /* Show only our receipt */
          div[ref], div[ref] * {
            visibility: visible;
          }
          
          /* Page setup for 58mm thermal paper */
          @page {
            size: 58mm auto;
            margin: 0;
            padding: 0;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 58mm !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          /* Receipt container */
          div[ref] {
            position: static !important;
            width: 54mm !important;
            max-width: 54mm !important;
            min-width: 54mm !important;
            margin: 2mm auto !important;
            padding: 2mm !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            font-family: 'Courier New', monospace !important;
            font-size: 8px !important;
            line-height: 1.2 !important;
            color: black !important;
            height: auto !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            transform: none !important;
            left: auto !important;
            top: auto !important;
          }
          
          /* Remove preview banner */
          div[ref]::before {
            display: none !important;
          }
          
          /* Typography optimization */
          h1 {
            font-size: 11px !important;
            font-weight: bold !important;
            margin: 0 !important;
            line-height: 1.1 !important;
          }
          
          h2 {
            font-size: 10px !important;
            font-weight: bold !important;
            margin: 0 !important;
            line-height: 1.1 !important;
          }
          
          p, span, div {
            font-size: 8px !important;
            line-height: 1.2 !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          
          /* Small text */
          .small-text {
            font-size: 7px !important;
            line-height: 1.1 !important;
          }
          
          /* Spacing */
          .section-spacing {
            margin: 1.5mm 0 !important;
          }
          
          .item-spacing {
            margin: 1mm 0 !important;
          }
          
          /* Borders */
          .border-dashed {
            border-style: dashed !important;
            border-width: 0.5px !important;
            border-color: #666 !important;
          }
          
          /* Flex layouts */
          div[style*="display: flex"] {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
          }
          
          /* Text alignment */
          .text-center {
            text-align: center !important;
          }
          
          /* Ensure proper width usage */
          * {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          
          /* Force proper dimensions */
          @media print and (max-width: 58mm) {
            div[ref] {
              width: 54mm !important;
              max-width: 54mm !important;
              padding: 2mm !important;
            }
          }
          
          /* Prevent page breaks within items */
          .item-container {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
    </>
  );
});

BillPrint.displayName = 'BillPrint';
