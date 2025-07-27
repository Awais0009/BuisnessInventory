-- =============================================
-- PAYMENT MANAGEMENT SYSTEM - USAGE EXAMPLES
-- How to handle the scenario you described
-- =============================================

-- SCENARIO: Customer has 4 transactions of 10,000 each (40,000 total)
-- Customer pays 10,000 today and promises 30,000 next day

-- =============================================
-- STEP 1: CREATE SAMPLE DATA FOR TESTING
-- =============================================

-- Assume we have a customer party already created
-- Let's say party_id = 'customer-uuid-123'
-- profile_id = 'profile-uuid-456'

-- Sample transactions that customer owes (4 transactions of 10,000 each)
/*
INSERT INTO public.transactions (
    reference_number, party_id, party_name, crop_id, crop_name,
    transaction_type, quantity, rate_per_unit, total_amount, final_amount,
    due_amount, payment_status, profile_id, created_by_user_id
) VALUES 
('TXN-001', 'customer-uuid-123', 'Ahmed Customer', 'crop-uuid-1', 'Wheat',
 'buy', 400, 25, 10000, 10000, 10000, 'pending', 'profile-uuid-456', 'user-uuid-789'),
('TXN-002', 'customer-uuid-123', 'Ahmed Customer', 'crop-uuid-2', 'Rice', 
 'buy', 285, 35, 10000, 10000, 10000, 'pending', 'profile-uuid-456', 'user-uuid-789'),
('TXN-003', 'customer-uuid-123', 'Ahmed Customer', 'crop-uuid-3', 'Corn',
 'buy', 555, 18, 10000, 10000, 10000, 'pending', 'profile-uuid-456', 'user-uuid-789'),
('TXN-004', 'customer-uuid-123', 'Ahmed Customer', 'crop-uuid-1', 'Wheat',
 'buy', 400, 25, 10000, 10000, 10000, 'pending', 'profile-uuid-456', 'user-uuid-789');
*/

-- =============================================
-- STEP 2: CUSTOMER MAKES FIRST PAYMENT (10,000)
-- =============================================

-- Create payment record for 10,000 received today
SELECT public.create_payment_record(
    jsonb_build_object(
        'party_id', 'customer-uuid-123',
        'party_name', 'Ahmed Customer',
        'payment_amount', 10000,
        'payment_date', CURRENT_DATE,
        'payment_method', 'cash',
        'notes', 'Partial payment - 10,000 received today, 30,000 promised tomorrow',
        'profile_id', 'profile-uuid-456',
        'created_by_user_id', 'user-uuid-789'
    )
);

-- This returns payment_id, let's say 'payment-uuid-abc'

-- =============================================
-- STEP 3: ALLOCATE THE 10,000 PAYMENT
-- =============================================

-- Option A: Auto-allocate to oldest transactions first
SELECT public.auto_allocate_payment(
    'payment-uuid-abc',  -- payment_record_id
    'user-uuid-789'      -- created_by_user_id
);

-- OR Option B: Manually allocate to specific transaction
SELECT public.allocate_payment_to_transaction(
    'payment-uuid-abc',  -- payment_record_id
    'txn-uuid-001',      -- transaction_id (first transaction)
    10000,               -- allocation_amount
    'user-uuid-789'      -- created_by_user_id
);

-- =============================================
-- STEP 4: NEXT DAY - CUSTOMER BRINGS 30,000
-- =============================================

-- Create payment record for 30,000 received next day
SELECT public.create_payment_record(
    jsonb_build_object(
        'party_id', 'customer-uuid-123',
        'party_name', 'Ahmed Customer',
        'payment_amount', 30000,
        'payment_date', CURRENT_DATE + 1,
        'payment_method', 'cash',
        'notes', 'Remaining payment as promised - 30,000',
        'profile_id', 'profile-uuid-456',
        'created_by_user_id', 'user-uuid-789'
    )
);

-- Auto-allocate the remaining 30,000 to pending transactions
SELECT public.auto_allocate_payment(
    'payment-uuid-def',  -- new payment_record_id
    'user-uuid-789'      -- created_by_user_id
);

-- =============================================
-- STEP 5: QUERY CURRENT STATUS
-- =============================================

-- View customer's overall financial status
SELECT * FROM public.customer_financial_summary_view 
WHERE party_id = 'customer-uuid-123';

-- View individual transaction payment status
SELECT 
    transaction_id,
    reference_number,
    party_name,
    crop_name,
    final_amount,
    paid_amount,
    due_amount,
    detailed_payment_status,
    payment_allocation_count,
    latest_payment_date
FROM public.transaction_payment_view 
WHERE party_id = 'customer-uuid-123'
ORDER BY transaction_date;

-- View payment records and their allocations
SELECT 
    payment_reference,
    payment_amount,
    allocated_amount,
    remaining_amount,
    allocation_status,
    allocation_percentage,
    total_allocations,
    transactions_affected
FROM public.payment_allocation_view 
WHERE party_id = 'customer-uuid-123'
ORDER BY payment_date;

-- View detailed payment allocations
SELECT 
    pr.payment_reference,
    pr.payment_amount,
    pr.payment_date,
    t.reference_number as transaction_ref,
    pa.allocated_amount,
    pa.transaction_due_before,
    pa.transaction_due_after,
    pa.allocation_date
FROM public.payment_allocations pa
JOIN public.payment_records pr ON pa.payment_record_id = pr.id
JOIN public.transactions t ON pa.transaction_id = t.id
WHERE pr.party_id = 'customer-uuid-123'
ORDER BY pr.payment_date, pa.allocation_date;

-- =============================================
-- STEP 6: FRONTEND DISPLAY LOGIC
-- =============================================

-- For frontend dashboard, you can show:

-- 1. INDIVIDUAL TRANSACTIONS TABLE
SELECT 
    reference_number,
    crop_name,
    transaction_type,
    final_amount,
    paid_amount,
    due_amount,
    CASE 
        WHEN due_amount = 0 THEN '✅ Paid'
        WHEN paid_amount > 0 THEN '🟡 Partial'
        ELSE '🔴 Pending'
    END as status_icon,
    detailed_payment_status
FROM public.transaction_payment_view 
WHERE party_id = 'customer-uuid-123';

-- 2. PAYMENT HISTORY TABLE
SELECT 
    payment_reference,
    payment_date,
    payment_amount,
    payment_method,
    allocated_amount,
    remaining_amount,
    transactions_affected as "Transactions Paid"
FROM public.payment_allocation_view 
WHERE party_id = 'customer-uuid-123';

-- 3. SUMMARY CARD
SELECT 
    party_name,
    total_transaction_amount as "Total Purchases",
    total_payments_received as "Total Payments",
    total_outstanding_due as "Amount Due",
    current_credit_balance as "Credit Available",
    net_outstanding as "Net Balance",
    payment_status
FROM public.customer_financial_summary_view 
WHERE party_id = 'customer-uuid-123';

-- =============================================
-- STEP 7: ADMIN FUNCTIONS FOR PAYMENT UPDATES
-- =============================================

-- If admin needs to adjust a payment allocation:

-- 1. Reverse an allocation (mark as reversed)
UPDATE public.payment_allocations 
SET allocation_status = 'reversed'
WHERE id = 'allocation-uuid-to-reverse';

-- 2. Create adjustment allocation
SELECT public.allocate_payment_to_transaction(
    'payment-uuid-abc',
    'different-transaction-uuid',
    5000,  -- reallocate 5000 to different transaction
    'user-uuid-789'
);

-- 3. Add discount or adjustment to transaction
UPDATE public.transactions 
SET 
    discount_amount = discount_amount + 1000,
    final_amount = total_amount + tax_amount - (discount_amount + 1000),
    due_amount = GREATEST(0, final_amount - paid_amount)
WHERE id = 'transaction-uuid-to-adjust';

-- 4. Update payment status manually if needed
UPDATE public.payment_records 
SET payment_status = 'confirmed'
WHERE id = 'payment-uuid-abc';

-- =============================================
-- BENEFITS OF THIS SYSTEM:
-- =============================================

/*
1. COMPLETE AUDIT TRAIL:
   - Every payment is recorded with reference
   - Every allocation is tracked individually
   - Can see exactly how much of each payment went to which transaction

2. FLEXIBLE PAYMENT HANDLING:
   - Partial payments supported
   - Credit balance tracking
   - Multiple payment methods
   - Auto-allocation or manual allocation

3. REAL-TIME BALANCE TRACKING:
   - Customer balances updated automatically
   - Outstanding amounts calculated in real-time
   - Credit balances tracked separately

4. FRONTEND FRIENDLY:
   - Pre-built views for common queries
   - Clear status indicators
   - Easy to display payment history

5. ADMIN CONTROL:
   - Can reverse allocations
   - Can reallocate payments
   - Can apply discounts
   - Can track payment promises

6. BUSINESS INTELLIGENCE:
   - Payment patterns analysis
   - Customer credit worthiness
   - Aging reports
   - Collection efficiency
*/

-- =============================================
-- EXAMPLE QUERIES FOR YOUR FRONTEND:
-- =============================================

-- Dashboard Summary for Customer
WITH customer_summary AS (
    SELECT 
        party_name,
        total_transaction_amount,
        total_payments_received,
        total_outstanding_due,
        current_credit_balance,
        payment_status
    FROM public.customer_financial_summary_view 
    WHERE party_id = 'customer-uuid-123'
)
SELECT 
    party_name as "Customer",
    '₹' || total_transaction_amount as "Total Purchases",
    '₹' || total_payments_received as "Payments Made", 
    '₹' || total_outstanding_due as "Amount Due",
    CASE 
        WHEN current_credit_balance > 0 THEN '₹' || current_credit_balance || ' Credit'
        ELSE 'No Credit'
    END as "Credit Balance",
    payment_status as "Status"
FROM customer_summary;
