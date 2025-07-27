-- =============================================
-- BULK TRANSACTION PROCESSING EXAMPLE
-- How to handle multiple crops in single transaction
-- =============================================

-- Example: Processing a bulk transaction with mixed buy/sell of multiple crops
-- Scenario: A trader buys wheat and rice, then sells some of each

-- Step 1: Prepare the bulk transaction data (JSON format)
-- This would typically be sent from your frontend/API

SELECT public.process_bulk_transaction(
    '{
        "reference_number": "BT-2025-001",
        "party_id": "party-uuid-here",
        "party_name": "Ahmed Trader",
        "transaction_date": "2025-01-23T10:30:00Z",
        "payment_method": "cash",
        "payment_status": "partial",
        "paid_amount": 15000.00,
        "due_amount": 5000.00,
        "due_date": "2025-02-15",
        "vehicle_number": "ABC-123",
        "driver_name": "Hassan Ali",
        "delivery_address": "Main Market, City",
        "notes": "Mixed transaction - bulk purchase and sales",
        "profile_id": "profile-uuid-here",
        "created_by_user_id": "user-uuid-here",
        "status": "confirmed",
        "tax_amount": 1000.00,
        "discount_amount": 500.00,
        "transactions": [
            {
                "crop_id": "wheat-crop-uuid",
                "crop_name": "Wheat",
                "action": "buy",
                "quantity": 100.0,
                "rate": 2200.00,
                "total": 5500.00,
                "quality_grade": "A",
                "batch_number": "W-2025-001",
                "notes": "Premium quality wheat"
            },
            {
                "crop_id": "rice-crop-uuid", 
                "crop_name": "Rice",
                "action": "buy",
                "quantity": 50.0,
                "rate": 3500.00,
                "total": 4375.00,
                "quality_grade": "A+",
                "batch_number": "R-2025-001",
                "notes": "Basmati rice"
            },
            {
                "crop_id": "wheat-crop-uuid",
                "crop_name": "Wheat", 
                "action": "sell",
                "quantity": 80.0,
                "rate": 2300.00,
                "total": 4600.00,
                "quality_grade": "A",
                "batch_number": "W-2025-002",
                "notes": "Selling wheat at profit"
            },
            {
                "crop_id": "rice-crop-uuid",
                "crop_name": "Rice",
                "action": "sell", 
                "quantity": 30.0,
                "rate": 3600.00,
                "total": 2700.00,
                "quality_grade": "A+",
                "batch_number": "R-2025-002",
                "notes": "Selling rice at premium"
            }
        ]
    }'::jsonb
) AS bulk_transaction_id;

-- =============================================
-- WHAT HAPPENS DURING PROCESSING:
-- =============================================

/*
1. BULK TRANSACTION CREATED:
   - ID: Generated UUID
   - Reference: BT-2025-001
   - Party: Ahmed Trader
   - Type: "mixed" (both buy and sell)
   - Buy Total: 9,875.00 (5,500 + 4,375)
   - Sell Total: 7,300.00 (4,600 + 2,700)
   - Net Amount: -2,575.00 (more bought than sold)
   - Final Amount: 10,375.00 (gross + tax - discount)

2. INDIVIDUAL TRANSACTIONS CREATED:
   Transaction 1: Buy 100kg Wheat at 2200/40kg = 5,500
   Transaction 2: Buy 50kg Rice at 3500/40kg = 4,375  
   Transaction 3: Sell 80kg Wheat at 2300/40kg = 4,600
   Transaction 4: Sell 30kg Rice at 3600/40kg = 2,700

3. STOCK UPDATES (via triggers):
   - Wheat stock: +100kg then -80kg = net +20kg
   - Rice stock: +50kg then -30kg = net +20kg

4. CUSTOMER BALANCES UPDATED:
   - Ahmed Trader's balance updated with all 4 transactions
   - Crop-wise balances updated for wheat and rice

5. STOCK MOVEMENTS RECORDED:
   - 4 stock movement records created
   - Each linked to respective transaction
*/

-- =============================================
-- QUERYING BULK TRANSACTION RESULTS
-- =============================================

-- Get full bulk transaction details with all individual transactions
SELECT * FROM public.get_bulk_transaction_details('bulk-transaction-uuid-here');

-- Get all transactions for a specific bulk transaction
SELECT 
    t.id,
    t.crop_name,
    t.action,
    t.quantity,
    t.rate,
    t.total,
    t.quality_grade
FROM public.transactions t
WHERE t.bulk_transaction_id = 'bulk-transaction-uuid-here'
ORDER BY t.created_at;

-- Get updated crop stocks after bulk transaction
SELECT 
    c.name,
    c.current_stock,
    c.last_traded_at
FROM public.crops c
WHERE c.id IN ('wheat-crop-uuid', 'rice-crop-uuid');

-- Get customer balance summary
SELECT * FROM public.get_customer_financial_summary('party-uuid-here');

-- =============================================
-- VALIDATION BEFORE PROCESSING
-- =============================================

-- Always validate data before processing
SELECT public.validate_bulk_transaction_data(
    '{
        "reference_number": "BT-2025-002",
        "profile_id": "profile-uuid-here",
        "created_by_user_id": "user-uuid-here",
        "transactions": [
            {
                "crop_id": "invalid-crop-id",
                "action": "buy",
                "quantity": -10,
                "rate": 0,
                "total": 0
            }
        ]
    }'::jsonb
) AS validation_result;

-- Expected result:
-- {
--   "is_valid": false,
--   "errors": [
--     "Crop with ID invalid-crop-id not found",
--     "Valid quantity (> 0) is required",
--     "Valid rate (> 0) is required", 
--     "Valid total (> 0) is required"
--   ]
-- }

-- =============================================
-- BULK TRANSACTION WORKFLOW IN APPLICATION
-- =============================================

/*
RECOMMENDED WORKFLOW:

1. FRONTEND PREPARATION:
   - User selects multiple crops and actions
   - Calculate totals for each transaction
   - Prepare JSON structure as shown above

2. BACKEND VALIDATION:
   - Call validate_bulk_transaction_data() first
   - Check if all crops exist and belong to user's profile
   - Validate quantities against available stock (for sells)

3. PROCESSING:
   - If validation passes, call process_bulk_transaction()
   - Function handles all database operations atomically
   - Returns bulk transaction ID for reference

4. RESPONSE:
   - Return bulk transaction ID to frontend
   - Optionally return updated crop stocks
   - Show transaction summary to user

5. ERROR HANDLING:
   - If processing fails, entire transaction is rolled back
   - No partial updates occur
   - User gets clear error message

EXAMPLE API ENDPOINT:
POST /api/bulk-transactions
{
    "reference_number": "BT-2025-001",
    "party_id": "uuid",
    "transactions": [...]
}

RESPONSE:
{
    "success": true,
    "bulk_transaction_id": "uuid",
    "summary": {
        "total_items": 4,
        "buy_total": 9875.00,
        "sell_total": 7300.00,
        "net_amount": -2575.00
    }
}
*/

-- =============================================
-- PERFORMANCE CONSIDERATIONS
-- =============================================

/*
INDEXES FOR BULK TRANSACTIONS:
- bulk_transactions.reference_number (unique lookups)
- transactions.bulk_transaction_id (joining individual transactions)
- transactions.crop_id (stock updates)
- transactions.party_id (customer balance updates)

BATCH SIZE RECOMMENDATIONS:
- Keep individual transactions per bulk under 50 items
- For larger transactions, split into multiple bulk transactions
- Monitor database performance with large batches

CONCURRENT PROCESSING:
- Use database transactions to prevent conflicts
- Consider row-level locking for high-concurrency scenarios
- Monitor for deadlocks with multiple simultaneous bulk transactions
*/
