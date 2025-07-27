// =============================================
// TYPESCRIPT INTERFACES FOR BULK TRANSACTIONS
// Use these in your Node.js backend
// =============================================

export interface IndividualTransaction {
  crop_id: string;
  crop_name?: string; // Optional, will be fetched from crops table
  action: 'buy' | 'sell';
  quantity: number; // in kg
  rate: number; // per 40kg
  total: number; // calculated total
  quality_grade?: string;
  batch_number?: string;
  notes?: string;
  tax_percentage?: number;
  tax_amount?: number;
  discount_amount?: number;
  final_amount?: number;
  paid_amount?: number;
}

export interface BulkTransactionData {
  reference_number: string;
  party_id?: string; // Optional - can be null for cash transactions
  party_name: string;
  transaction_date?: string; // ISO string, defaults to NOW()
  payment_method?: 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'other';
  payment_status?: string; // 'paid', 'partial', 'pending'
  paid_amount?: number;
  due_amount?: number;
  due_date?: string; // YYYY-MM-DD format
  payment_date?: string; // YYYY-MM-DD format
  vehicle_number?: string;
  driver_name?: string;
  delivery_address?: string;
  notes?: string;
  profile_id: string; // Required
  created_by_user_id: string; // Required
  status?: 'pending' | 'confirmed' | 'cancelled';
  tax_amount?: number;
  discount_amount?: number;
  transactions: IndividualTransaction[]; // Array of individual transactions
}

export interface BulkTransactionResult {
  bulk_id: string;
  reference_number: string;
  party_name: string;
  transaction_date: string;
  transaction_type: 'buy' | 'sell' | 'mixed';
  buy_total: number;
  sell_total: number;
  net_amount: number;
  payment_status: string;
  vehicle_number?: string;
  driver_name?: string;
  individual_transactions: IndividualTransactionResult[];
}

export interface IndividualTransactionResult {
  id: string;
  crop_id: string;
  crop_name: string;
  action: 'buy' | 'sell';
  quantity: number;
  rate: number;
  total: number;
  quality_grade?: string;
  batch_number?: string;
  notes?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
}

// =============================================
// SERVICE CLASS FOR BULK TRANSACTIONS
// =============================================

export class BulkTransactionService {
  private db: any; // Your database connection

  constructor(database: any) {
    this.db = database;
  }

  /**
   * Validate bulk transaction data before processing
   */
  async validateBulkTransaction(data: BulkTransactionData): Promise<ValidationResult> {
    try {
      const result = await this.db.query(
        'SELECT public.validate_bulk_transaction_data($1) as validation',
        [JSON.stringify(data)]
      );
      
      return result.rows[0].validation;
    } catch (error) {
      console.error('Validation error:', error);
      return {
        is_valid: false,
        errors: ['Database validation failed']
      };
    }
  }

  /**
   * Process bulk transaction and create individual transactions
   */
  async processBulkTransaction(data: BulkTransactionData): Promise<string> {
    try {
      // First validate the data
      const validation = await this.validateBulkTransaction(data);
      
      if (!validation.is_valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Process the bulk transaction
      const result = await this.db.query(
        'SELECT public.process_bulk_transaction($1) as bulk_id',
        [JSON.stringify(data)]
      );

      return result.rows[0].bulk_id;
    } catch (error) {
      console.error('Bulk transaction processing error:', error);
      throw error;
    }
  }

  /**
   * Get bulk transaction details with all individual transactions
   */
  async getBulkTransactionDetails(bulkTransactionId: string): Promise<BulkTransactionResult> {
    try {
      const result = await this.db.query(
        'SELECT * FROM public.get_bulk_transaction_details($1)',
        [bulkTransactionId]
      );

      if (result.rows.length === 0) {
        throw new Error('Bulk transaction not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching bulk transaction details:', error);
      throw error;
    }
  }

  /**
   * Generate reference number for bulk transaction
   */
  generateReferenceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-4);
    
    return `BT-${year}${month}${day}-${timestamp}`;
  }

  /**
   * Calculate transaction total based on quantity and rate
   */
  calculateTransactionTotal(quantity: number, rate: number): number {
    // Rate is per 40kg, so calculate based on actual quantity
    return (quantity * rate) / 40;
  }

  /**
   * Build bulk transaction data from frontend input
   */
  buildBulkTransactionData(
    frontendData: any,
    profileId: string,
    userId: string
  ): BulkTransactionData {
    // Calculate totals for each transaction
    const transactions: IndividualTransaction[] = frontendData.items.map((item: any) => ({
      crop_id: item.cropId,
      action: item.action,
      quantity: item.quantity,
      rate: item.rate,
      total: this.calculateTransactionTotal(item.quantity, item.rate),
      quality_grade: item.qualityGrade,
      batch_number: item.batchNumber,
      notes: item.notes
    }));

    return {
      reference_number: frontendData.referenceNumber || this.generateReferenceNumber(),
      party_id: frontendData.partyId,
      party_name: frontendData.partyName,
      transaction_date: frontendData.transactionDate,
      payment_method: frontendData.paymentMethod || 'cash',
      payment_status: frontendData.paymentStatus || 'pending',
      paid_amount: frontendData.paidAmount || 0,
      due_amount: frontendData.dueAmount || 0,
      due_date: frontendData.dueDate,
      vehicle_number: frontendData.vehicleNumber,
      driver_name: frontendData.driverName,
      delivery_address: frontendData.deliveryAddress,
      notes: frontendData.notes,
      profile_id: profileId,
      created_by_user_id: userId,
      status: frontendData.status || 'pending',
      tax_amount: frontendData.taxAmount || 0,
      discount_amount: frontendData.discountAmount || 0,
      transactions
    };
  }
}

// =============================================
// CONTROLLER EXAMPLE
// =============================================

export class BulkTransactionController {
  private bulkTransactionService: BulkTransactionService;

  constructor(bulkTransactionService: BulkTransactionService) {
    this.bulkTransactionService = bulkTransactionService;
  }

  /**
   * POST /api/bulk-transactions
   */
  async createBulkTransaction(req: any, res: any) {
    try {
      const { profileId, userId } = req.user; // From authentication middleware
      
      // Build bulk transaction data
      const bulkTransactionData = this.bulkTransactionService.buildBulkTransactionData(
        req.body,
        profileId,
        userId
      );

      // Process the bulk transaction
      const bulkTransactionId = await this.bulkTransactionService.processBulkTransaction(
        bulkTransactionData
      );

      // Get the processed transaction details
      const transactionDetails = await this.bulkTransactionService.getBulkTransactionDetails(
        bulkTransactionId
      );

      res.status(201).json({
        success: true,
        message: 'Bulk transaction processed successfully',
        data: {
          bulk_transaction_id: bulkTransactionId,
          reference_number: transactionDetails.reference_number,
          summary: {
            total_items: transactionDetails.individual_transactions.length,
            buy_total: transactionDetails.buy_total,
            sell_total: transactionDetails.sell_total,
            net_amount: transactionDetails.net_amount,
            transaction_type: transactionDetails.transaction_type
          }
        }
      });
    } catch (error) {
      console.error('Bulk transaction creation error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to process bulk transaction',
        errors: error.message ? [error.message] : ['Unknown error occurred']
      });
    }
  }

  /**
   * GET /api/bulk-transactions/:id
   */
  async getBulkTransaction(req: any, res: any) {
    try {
      const { id } = req.params;
      
      const transactionDetails = await this.bulkTransactionService.getBulkTransactionDetails(id);
      
      res.json({
        success: true,
        data: transactionDetails
      });
    } catch (error) {
      console.error('Error fetching bulk transaction:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Bulk transaction not found'
      });
    }
  }
}

// =============================================
// USAGE EXAMPLE IN YOUR ROUTES
// =============================================

/*
// routes/bulkTransactions.ts
import { BulkTransactionService, BulkTransactionController } from './bulk-transaction.service';

const bulkTransactionService = new BulkTransactionService(db);
const bulkTransactionController = new BulkTransactionController(bulkTransactionService);

router.post('/bulk-transactions', 
  authenticateUser, // Your auth middleware
  bulkTransactionController.createBulkTransaction.bind(bulkTransactionController)
);

router.get('/bulk-transactions/:id',
  authenticateUser,
  bulkTransactionController.getBulkTransaction.bind(bulkTransactionController)
);

// FRONTEND REQUEST EXAMPLE:
POST /api/bulk-transactions
Content-Type: application/json

{
  "partyId": "party-uuid-here",
  "partyName": "Ahmed Trader",
  "paymentMethod": "cash",
  "paymentStatus": "partial",
  "paidAmount": 15000,
  "dueAmount": 5000,
  "dueDate": "2025-02-15",
  "vehicleNumber": "ABC-123",
  "driverName": "Hassan Ali",
  "notes": "Mixed bulk transaction",
  "items": [
    {
      "cropId": "wheat-crop-uuid",
      "action": "buy",
      "quantity": 100,
      "rate": 2200,
      "qualityGrade": "A",
      "batchNumber": "W-2025-001"
    },
    {
      "cropId": "rice-crop-uuid",
      "action": "sell", 
      "quantity": 30,
      "rate": 3600,
      "qualityGrade": "A+",
      "batchNumber": "R-2025-001"
    }
  ]
}
*/
