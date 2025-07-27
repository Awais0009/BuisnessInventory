-- =============================================
-- COMPLETE POSTGRESQL DATABASE SCHEMA
-- Business Inventory Management System
-- Streamlined Bulk Transaction Flow
-- =============================================

-- =============================================
-- PGADMIN EXECUTION INSTRUCTIONS
-- =============================================
/*
IMPORTANT: Execute this schema in pgAdmin step by step in the following order:

PREREQUISITE:
- Fresh PostgreSQL database
- Admin access to the database
- No existing tables (this will create everything including auth)

EXECUTION ORDER:

STEP 1: AUTH SYSTEM & PROFILES (Lines 65-150)
- Execute auth users table and profiles setup first
- This replaces Supabase auth with PostgreSQL auth

STEP 2: ENUMS (Lines 152-172)
- Execute all CREATE TYPE statements
- These define the data types used throughout the schema

STEP 3: CORE TABLES (Lines 174-450)
- Execute in this exact order:
  1. parties table (Lines 174-195) - Customers/Suppliers
  2. crops table (Lines 197-235) - Products/Inventory
  3. bulk_transactions table (Lines 237-285) - Grouped transactions
  4. transactions table (Lines 287-350) - Individual sub-transactions

STEP 4: ADDITIONAL TRACKING TABLES (Lines 790-890)
- Execute in this order:
  1. stock_movements table (Lines 790-805)
  2. customer_balances table (Lines 807-835)
  3. crop_customer_balances table (Lines 837-870)

STEP 5: ROW LEVEL SECURITY (Lines 352-450)
- Execute all ENABLE ROW LEVEL SECURITY statements
- Then execute all CREATE POLICY statements
- RLS protects data access per profile

STEP 6: FUNCTIONS AND TRIGGERS (Lines 452-750)
- Execute all functions and triggers for automation

STEP 7: INDEXES (Lines 752-800)
- Execute all CREATE INDEX statements for performance

STEP 8: VIEWS (Lines 890-990)
- Execute all CREATE VIEW statements for easy querying

STEP 9: STORED PROCEDURES (Lines 992-1200)
- Execute all analytical functions for reporting

STEP 10: COMPLETION MESSAGE (Lines 1202-1230)
- Execute the final completion message

FLOW EXPLANATION:
- Parties (customers/suppliers) buy/sell crops
- Single Transaction: Party → Transaction (direct)
- Bulk Transaction: Party → Bulk Transaction → Sub-transactions → Individual Transactions
- Each sub-transaction in bulk automatically creates individual transaction records
- Crop stock updates happen at transaction level (not bulk level)
- Financial calculations flow: Sub-transaction totals → Bulk transaction totals

TROUBLESHOOTING:
- If you get "type does not exist" errors, ensure Step 2 (enums) was completed
- If you get "table does not exist" errors, ensure tables are created in order
- If you get "function does not exist" errors, ensure functions are created before triggers
- If RLS policies fail, ensure tables exist before applying policies

TESTING:
After completion, test with:
SELECT 'Schema setup complete!' as status;
\dt public.*  -- List all tables
\dy public.*  -- List all types
*/

-- Drop existing types and tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.crop_customer_balances CASCADE;
DROP TABLE IF EXISTS public.customer_balances CASCADE;
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.bulk_transactions CASCADE;
DROP TABLE IF EXISTS public.crops CASCADE;
DROP TABLE IF EXISTS public.parties CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.auth_users CASCADE;

-- Drop existing enums
DROP TYPE IF EXISTS stock_movement_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS transaction_action CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS party_type CASCADE;
DROP TYPE IF EXISTS bulk_transaction_type CASCADE;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255),
    business_name VARCHAR(255), -- company name
    email VARCHAR(255) UNIQUE NOT NULL,
    encrypted_password VARCHAR(255) NOT NULL,
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmation_token VARCHAR(255),
    confirmation_sent_at TIMESTAMP WITH TIME ZONE,
    recovery_token VARCHAR(255),
    recovery_sent_at TIMESTAMP WITH TIME ZONE,
    email_change_token_new VARCHAR(255),
    email_change VARCHAR(255),
    email_change_sent_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    raw_app_meta_data JSONB,
    raw_user_meta_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);-- =============================================
-- STEP 1: AUTH SYSTEM & PROFILES (Execute First)
-- Execute lines 65-150 - Authentication and user management
-- =============================================

-- Create auth schema for user management
CREATE SCHEMA IF NOT EXISTS auth;

-- Create users table (replaces Supabase auth.users)


-- Create user_role enum type first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user', 'viewer');
    END IF;
END $$;

-- Create profiles table (FIRST TABLE TO CREATE) - Separate PK and FK
CREATE TABLE IF NOT EXISTS public.profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Separate Primary Key
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- Foreign Key to user
    avatar_url TEXT,
    role user_role DEFAULT 'admin',
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one profile per user
    CONSTRAINT unique_user_profile UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (user_id = current_user_id());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (user_id = current_user_id());

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (user_id = current_user_id());

-- Function to get current user ID (replaces auth.uid())
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    -- In a real implementation, this would get the current authenticated user
    -- For now, we'll use a session variable or similar mechanism
    RETURN COALESCE(
        NULLIF(current_setting('app.current_user_id', true), '')::UUID,
        NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, role, is_active)
    VALUES (NEW.id, 'admin', true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function for updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- STEP 2: CREATE ENUMS (Execute Second)
-- Execute lines 152-180 - All enum types
-- =============================================

-- User role enum (already created above)
-- CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user', 'viewer');

-- Transaction action enum
CREATE TYPE transaction_action AS ENUM ('buy', 'sell');

-- Transaction status enum
CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'cancelled', 'partial');

-- Payment method enum
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'credit_card', 'check', 'other');

-- Party type enum
CREATE TYPE party_type AS ENUM ('buyer', 'seller', 'both');

-- Bulk transaction type enum
CREATE TYPE bulk_transaction_type AS ENUM ('buy', 'sell', 'mixed');

-- Stock movement type enum
CREATE TYPE stock_movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'transfer', 'loss', 'found');

-- Expense category enum
CREATE TYPE expense_category AS ENUM (
    'utilities',        -- Electricity, water, gas bills
    'transportation',   -- Vehicle fuel, maintenance, driver salaries
    'storage',          -- Warehouse rent, storage costs
    'labor',           -- Worker salaries, overtime
    'maintenance',     -- Equipment maintenance, repairs
    'office',          -- Office supplies, stationery
    'legal',           -- Legal fees, documentation
    'marketing',       -- Advertising, promotion costs
    'insurance',       -- Business insurance
    'taxes',           -- Government taxes, fees
    'miscellaneous'    -- Other expenses
);

-- Expense status enum
CREATE TYPE expense_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled', 'partial');

-- =============================================
-- STEP 3A: PARTIES TABLE (Customers/Suppliers) - Linked to Profile
-- Execute lines 182-205 - Customer/Supplier management
-- =============================================
-- done with parties 
CREATE TABLE IF NOT EXISTS public.parties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    party_type party_type DEFAULT 'both',
    profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,  -- Link to profile
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id),  -- Track who created it
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
);

-- =============================================
-- STEP 2D: CROPS TABLE (Inventory Management) - Linked to Profile
-- Execute lines 139-161 - Product/crop definitions
-- =============================================

CREATE TABLE IF NOT EXISTS public.crops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(20) DEFAULT 'kg',
    current_stock DECIMAL(15,3) DEFAULT 0, -- Current stock in kg
    price_per_unit DECIMAL(15,2) NOT NULL, -- Price per 40kg
    profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,  -- Link to profile
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id),  -- Track who created it
    category VARCHAR(100),
    storage_location VARCHAR(255),
    last_traded_at TIMESTAMP WITH TIME ZONE,
    is_visible BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_crop_per_profile UNIQUE(profile_id, name),
    CONSTRAINT positive_stock CHECK (current_stock >= 0),
    CONSTRAINT positive_price CHECK (price_per_unit > 0)
);

-- done with crops 
-- =============================================
-- STEP 3C: BULK TRANSACTIONS TABLE - Parent for grouped transactions
-- Execute lines 235-290 - Grouped transactions management
-- =============================================

CREATE TABLE IF NOT EXISTS public.bulk_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    
    -- Party information
    party_id UUID REFERENCES public.parties(id),
    -- Transaction details
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transaction_type bulk_transaction_type NOT NULL, -- 'buy', 'sell', 'mixed'
    
    -- Financial summary (calculated from sub-transactions)
    total_items INTEGER DEFAULT 0, -- Number of sub-transactions
    buy_total DECIMAL(15,2) DEFAULT 0, -- Sum of all buy sub-transactions
    sell_total DECIMAL(15,2) DEFAULT 0, -- Sum of all sell sub-transactions
    gross_total DECIMAL(15,2) DEFAULT 0, -- buy_total + sell_total
    net_amount DECIMAL(15,2) DEFAULT 0, -- sell_total - buy_total (profit/loss)
    
    -- Additional charges
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    final_amount DECIMAL(15,2) DEFAULT 0, -- gross_total + tax_amount - discount_amount
    
    -- Payment information
    payment_method payment_method DEFAULT 'cash', 
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'partial', 'paid', 'overdue'
    paid_amount DECIMAL(15,2) DEFAULT 0,
    due_amount DECIMAL(15,2) DEFAULT 0,
    due_date DATE,
    payment_date DATE,

    
    notes TEXT,
    is_printed BOOLEAN DEFAULT false,
    
    -- Ownership and tracking
    profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_totals CHECK (buy_total >= 0 AND sell_total >= 0),
    CONSTRAINT valid_payment_amounts CHECK (paid_amount >= 0 AND due_amount >= 0)
);
-- done with bulk transaction 
-- =============================================
-- STEP 3D: TRANSACTIONS TABLE - Individual sub-transactions under bulk transactions
-- Execute lines 355-440 - Individual transaction records
-- =============================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference_number VARCHAR(100) NOT NULL, -- Can be shared across bulk transaction items
    
    -- Parent bulk transaction reference (OPTIONAL - for bulk transactions only)
    bulk_transaction_id UUID REFERENCES public.bulk_transactions(id) ON DELETE CASCADE,
    transaction_index INTEGER DEFAULT 1, -- Order within bulk transaction (1, 2, 3...) - only used if bulk_transaction_id is not null
    
    -- Party information (inherited from bulk transaction but can be overridden)
    party_id UUID REFERENCES public.parties(id),
    
    -- Transaction specifics
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transaction_action transaction_action NOT NULL, -- 'buy' or 'sell' only
    
    -- Crop/item details
    crop_id UUID REFERENCES public.crops(id),
    
    -- Quantity and pricing
    quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    rate_per_unit DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL, -- quantity * rate_per_unit
    
    discount_amount DECIMAL(15,2) DEFAULT 0,
    final_amount DECIMAL(15,2) DEFAULT 0, -- total_amount  - discount_amount
    
    -- Payment tracking (individual level for partial payments)
    payment_method payment_method DEFAULT 'cash',
    payment_status VARCHAR(20) DEFAULT 'pending',
    paid_amount DECIMAL(15,2) DEFAULT 0,
    due_amount DECIMAL(15,2) DEFAULT 0,
    payment_date DATE,
    
    -- Status and metadata
    status transaction_status DEFAULT 'pending',
    notes TEXT,
    
    -- Ownership and tracking
    profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_rate CHECK (rate_per_unit > 0),
    CONSTRAINT positive_amounts CHECK (total_amount >= 0 AND final_amount >= 0),
    CONSTRAINT valid_transaction_index CHECK (transaction_index > 0),
);

-- =============================================
-- STEP 3E: BULK TRANSACTION HELPER FUNCTIONS
-- Execute lines 427-470 - Automatic calculation functions
-- =============================================

-- Function to calculate bulk transaction totals from sub-transactions
CREATE OR REPLACE FUNCTION calculate_bulk_transaction_totals()
RETURNS TRIGGER AS $$
DECLARE
    bulk_id UUID;
BEGIN
    -- Only process if transaction is part of a bulk transaction
    bulk_id := COALESCE(NEW.bulk_transaction_id, OLD.bulk_transaction_id);
    
    IF bulk_id IS NULL THEN
        -- This is a standalone transaction, no bulk calculation needed
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Update the bulk transaction totals when transactions are inserted/updated/deleted
    UPDATE public.bulk_transactions
    SET 
        total_items = (
            SELECT COUNT(*) 
            FROM public.transactions 
            WHERE bulk_transaction_id = bulk_id
        ),
        buy_total = (
            SELECT COALESCE(SUM(final_amount), 0) 
            FROM public.transactions 
            WHERE bulk_transaction_id = bulk_id
              AND transaction_type = 'buy'
        ),
        sell_total = (
            SELECT COALESCE(SUM(final_amount), 0) 
            FROM public.transactions 
            WHERE bulk_transaction_id = bulk_id
              AND transaction_type = 'sell'
        ),
        updated_at = NOW()
    WHERE id = bulk_id;
    
    -- Update calculated fields
    UPDATE public.bulk_transactions
    SET 
        gross_total = buy_total + sell_total,
        net_amount = sell_total - buy_total,
        final_amount = gross_total + tax_amount - discount_amount,
        due_amount = final_amount - paid_amount
    WHERE id = bulk_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate bulk transaction totals
CREATE TRIGGER update_bulk_transaction_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_bulk_transaction_totals();

-- =============================================
-- STEP 3G: TRANSACTION FLOW FUNCTIONS
-- Execute lines 485-580 - Support both standalone and bulk transactions
-- =============================================

-- Create sequence for transaction reference numbers
CREATE SEQUENCE IF NOT EXISTS transaction_ref_seq START 1;

-- Function to create a standalone transaction (most common case)
CREATE OR REPLACE FUNCTION public.create_standalone_transaction(
    transaction_data JSONB
)
RETURNS UUID AS $$
DECLARE
    transaction_id UUID;
    crop_record RECORD;
    final_amount_calc DECIMAL;
BEGIN
    -- Validate required fields
    IF transaction_data->>'crop_id' IS NULL THEN
        RAISE EXCEPTION 'Crop ID is required';
    END IF;
    
    IF transaction_data->>'profile_id' IS NULL THEN
        RAISE EXCEPTION 'Profile ID is required';
    END IF;
    
    -- Get crop information
    SELECT * INTO crop_record FROM public.crops WHERE id = (transaction_data->>'crop_id')::UUID;
    
    IF crop_record IS NULL THEN
        RAISE EXCEPTION 'Crop with ID % not found', transaction_data->>'crop_id';
    END IF;
    
    -- Calculate final amount
    final_amount_calc := (transaction_data->>'total_amount')::DECIMAL + 
                        COALESCE((transaction_data->>'tax_amount')::DECIMAL, 0) - 
                        COALESCE((transaction_data->>'discount_amount')::DECIMAL, 0);
    
    -- Create standalone transaction (no bulk_transaction_id)
    INSERT INTO public.transactions (
        reference_number,
        crop_id,
        crop_name,
        transaction_type,
        quantity,
        unit,
        rate_per_unit,
        total_amount,
        party_id,
        party_name,
        transaction_date,
        status,
        payment_method,
        payment_status,
        paid_amount,
        due_amount,
        payment_date,
        quality_grade,
        moisture_percentage,
        tax_percentage,
        tax_amount,
        discount_amount,
        final_amount,
        bags_count,
        weight_per_bag,
        storage_location,
        quality_notes,
        vehicle_number,
        driver_name,
        delivery_address,
        notes,
        profile_id,
        created_by_user_id
        -- bulk_transaction_id is NULL for standalone transactions
        -- transaction_index is NULL for standalone transactions
    ) VALUES (
        COALESCE(transaction_data->>'reference_number', 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('transaction_ref_seq')::TEXT, 4, '0')),
        (transaction_data->>'crop_id')::UUID,
        COALESCE(transaction_data->>'crop_name', crop_record.name),
        (transaction_data->>'transaction_type')::transaction_type,
        (transaction_data->>'quantity')::DECIMAL,
        COALESCE(transaction_data->>'unit', 'kg'),
        (transaction_data->>'rate_per_unit')::DECIMAL,
        (transaction_data->>'total_amount')::DECIMAL,
        (transaction_data->>'party_id')::UUID,
        transaction_data->>'party_name',
        COALESCE((transaction_data->>'transaction_date')::TIMESTAMP WITH TIME ZONE, NOW()),
        COALESCE((transaction_data->>'status')::transaction_status, 'confirmed'),
        COALESCE((transaction_data->>'payment_method')::payment_method, 'cash'),
        COALESCE(transaction_data->>'payment_status', 'paid'),
        COALESCE((transaction_data->>'paid_amount')::DECIMAL, final_amount_calc),
        COALESCE((transaction_data->>'due_amount')::DECIMAL, 0),
        (transaction_data->>'payment_date')::DATE,
        transaction_data->>'quality_grade',
        (transaction_data->>'moisture_percentage')::DECIMAL,
        COALESCE((transaction_data->>'tax_percentage')::DECIMAL, 0),
        COALESCE((transaction_data->>'tax_amount')::DECIMAL, 0),
        COALESCE((transaction_data->>'discount_amount')::DECIMAL, 0),
        final_amount_calc,
        (transaction_data->>'bags_count')::INTEGER,
        (transaction_data->>'weight_per_bag')::DECIMAL,
        transaction_data->>'storage_location',
        transaction_data->>'quality_notes',
        transaction_data->>'vehicle_number',
        transaction_data->>'driver_name',
        transaction_data->>'delivery_address',
        transaction_data->>'notes',
        (transaction_data->>'profile_id')::UUID,
        (transaction_data->>'created_by_user_id')::UUID
    ) RETURNING id INTO transaction_id;
    
    RETURN transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 3H: TRANSACTION FLOW VIEWS
-- Execute lines 585-620 - Views to understand transaction flows
-- =============================================

-- View to differentiate between standalone and bulk transactions
CREATE OR REPLACE VIEW public.transaction_flow_view AS
SELECT 
    t.id,
    t.reference_number,
    t.transaction_date,
    t.crop_name,
    t.party_name,
    t.transaction_action,
    t.quantity,
    t.rate_per_unit,
    t.total_amount,
    t.final_amount,
    
    -- Flow classification
    CASE 
        WHEN t.bulk_transaction_id IS NULL THEN 'standalone'
        ELSE 'bulk_item'
    END as transaction_flow,
    
    -- Bulk transaction details (if applicable)
    t.bulk_transaction_id,
    t.transaction_index,
    bt.reference_number as bulk_reference,
    bt.transaction_type as bulk_type,
    bt.total_items as bulk_total_items,
    
    -- Additional info
    t.status,
    t.payment_status,
    t.profile_id,
    t.created_at
FROM public.transactions t
LEFT JOIN public.bulk_transactions bt ON t.bulk_transaction_id = bt.id
ORDER BY t.transaction_date DESC, t.transaction_index ASC;

-- =============================================
-- STEP 3F: ENABLE ROW LEVEL SECURITY  
-- Execute lines 472-481 - Enable RLS on all tables
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 4: ROW LEVEL SECURITY POLICIES
-- Execute lines 279-377 - Security policies for data access
-- =============================================

-- Profiles policies (already updated above)

-- Parties policies - Profile-based access
CREATE POLICY "Users can view parties in their profile" ON public.parties
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can create parties in their profile" ON public.parties
    FOR INSERT WITH CHECK (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can update parties in their profile" ON public.parties
    FOR UPDATE USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

-- Crops policies - Profile-based access
CREATE POLICY "Users can view crops in their profile" ON public.crops
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can create crops in their profile" ON public.crops
    FOR INSERT WITH CHECK (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can update crops in their profile" ON public.crops
    FOR UPDATE USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

-- Transactions policies - Profile-based access
CREATE POLICY "Users can view transactions in their profile" ON public.transactions
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can create transactions in their profile" ON public.transactions
    FOR INSERT WITH CHECK (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can update transactions in their profile" ON public.transactions
    FOR UPDATE USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

-- Bulk transactions policies - Profile-based access
CREATE POLICY "Users can view bulk transactions in their profile" ON public.bulk_transactions
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can create bulk transactions in their profile" ON public.bulk_transactions
    FOR INSERT WITH CHECK (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can update bulk transactions in their profile" ON public.bulk_transactions
    FOR UPDATE USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

-- =============================================
-- STEP 5A: FUNCTIONS AND TRIGGERS
-- Execute lines 379-675 - Database automation
-- =============================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, role, is_active)
    VALUES (NEW.id, 'admin', true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function for updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at triggers for all tables
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS companies_updated_at ON public.companies;
CREATE TRIGGER companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS parties_updated_at ON public.parties;
CREATE TRIGGER parties_updated_at
    BEFORE UPDATE ON public.parties
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS crops_updated_at ON public.crops;
CREATE TRIGGER crops_updated_at
    BEFORE UPDATE ON public.crops
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS transactions_updated_at ON public.transactions;
CREATE TRIGGER transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS bulk_transactions_updated_at ON public.bulk_transactions;
CREATE TRIGGER bulk_transactions_updated_at
    BEFORE UPDATE ON public.bulk_transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to update crop stock after transaction
CREATE OR REPLACE FUNCTION public.update_crop_stock()
RETURNS TRIGGER AS $$
DECLARE
    old_stock DECIMAL(15,3);
    new_stock DECIMAL(15,3);
    movement_type_val stock_movement_type;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Get current stock before update
        SELECT current_stock INTO old_stock FROM public.crops WHERE id = NEW.crop_id;
        
        -- Update crop stock based on transaction action
        IF NEW.action = 'buy' THEN
            UPDATE public.crops 
            SET current_stock = current_stock + NEW.quantity,
                last_traded_at = NEW.transaction_date
            WHERE id = NEW.crop_id
            RETURNING current_stock INTO new_stock;
            movement_type_val := 'purchase';
        ELSIF NEW.action = 'sell' THEN
            UPDATE public.crops 
            SET current_stock = current_stock - NEW.quantity,
                last_traded_at = NEW.transaction_date
            WHERE id = NEW.crop_id
            RETURNING current_stock INTO new_stock;
            movement_type_val := 'sale';
        END IF;
        
        -- Record stock movement
        INSERT INTO public.stock_movements (
            crop_id, transaction_id, movement_type, quantity, 
            previous_stock, new_stock, reason, company_id, created_by
        ) VALUES (
            NEW.crop_id, NEW.id, movement_type_val, NEW.quantity,
            old_stock, new_stock, 
            'Transaction: ' || NEW.action || ' to/from ' || NEW.party_name,
            NEW.company_id, NEW.created_by
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle stock adjustment if quantity or action changed
        IF OLD.quantity != NEW.quantity OR OLD.action != NEW.action THEN
            -- Get current stock
            SELECT current_stock INTO old_stock FROM public.crops WHERE id = NEW.crop_id;
            
            -- Reverse old transaction effect
            IF OLD.action = 'buy' THEN
                UPDATE public.crops 
                SET current_stock = current_stock - OLD.quantity
                WHERE id = OLD.crop_id;
            ELSIF OLD.action = 'sell' THEN
                UPDATE public.crops 
                SET current_stock = current_stock + OLD.quantity
                WHERE id = OLD.crop_id;
            END IF;
            
            -- Apply new transaction effect
            IF NEW.action = 'buy' THEN
                UPDATE public.crops 
                SET current_stock = current_stock + NEW.quantity,
                    last_traded_at = NEW.transaction_date
                WHERE id = NEW.crop_id
                RETURNING current_stock INTO new_stock;
                movement_type_val := 'purchase';
            ELSIF NEW.action = 'sell' THEN
                UPDATE public.crops 
                SET current_stock = current_stock - NEW.quantity,
                    last_traded_at = NEW.transaction_date
                WHERE id = NEW.crop_id
                RETURNING current_stock INTO new_stock;
                movement_type_val := 'sale';
            END IF;
            
            -- Record stock movement for adjustment
            INSERT INTO public.stock_movements (
                crop_id, transaction_id, movement_type, quantity, 
                previous_stock, new_stock, reason, company_id, created_by
            ) VALUES (
                NEW.crop_id, NEW.id, 'adjustment', ABS(new_stock - old_stock),
                old_stock, new_stock, 
                'Transaction updated: ' || NEW.action || ' to/from ' || NEW.party_name,
                NEW.company_id, NEW.created_by
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Get current stock before reversal
        SELECT current_stock INTO old_stock FROM public.crops WHERE id = OLD.crop_id;
        
        -- Reverse transaction effect
        IF OLD.action = 'buy' THEN
            UPDATE public.crops 
            SET current_stock = current_stock - OLD.quantity
            WHERE id = OLD.crop_id
            RETURNING current_stock INTO new_stock;
        ELSIF OLD.action = 'sell' THEN
            UPDATE public.crops 
            SET current_stock = current_stock + OLD.quantity
            WHERE id = OLD.crop_id
            RETURNING current_stock INTO new_stock;
        END IF;
        
        -- Record stock movement for deletion
        INSERT INTO public.stock_movements (
            crop_id, transaction_id, movement_type, quantity, 
            previous_stock, new_stock, reason, company_id, created_by
        ) VALUES (
            OLD.crop_id, NULL, 'adjustment', OLD.quantity,
            old_stock, new_stock, 
            'Transaction deleted: ' || OLD.action || ' to/from ' || OLD.party_name,
            OLD.company_id, OLD.created_by
        );
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update crop stock automatically
DROP TRIGGER IF EXISTS update_crop_stock_trigger ON public.transactions;
CREATE TRIGGER update_crop_stock_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_crop_stock();

-- Trigger for stock movements updated_at
DROP TRIGGER IF EXISTS stock_movements_updated_at ON public.stock_movements;
CREATE TRIGGER stock_movements_updated_at
    BEFORE UPDATE ON public.stock_movements
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for customer balances updated_at
DROP TRIGGER IF EXISTS customer_balances_updated_at ON public.customer_balances;
CREATE TRIGGER customer_balances_updated_at
    BEFORE UPDATE ON public.customer_balances
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- STEP 5B: PAYMENT MANAGEMENT FUNCTIONS
-- Execute lines 1450-1650 - Payment processing and allocation
-- =============================================

-- Create sequence for payment reference numbers
CREATE SEQUENCE IF NOT EXISTS payment_ref_seq START 1;

-- Function to create a new payment record
CREATE OR REPLACE FUNCTION public.create_payment_record(
    payment_data JSONB
)
RETURNS UUID AS $$
DECLARE
    payment_id UUID;
    payment_ref VARCHAR;
BEGIN
    -- Validate required fields
    IF payment_data->>'party_id' IS NULL THEN
        RAISE EXCEPTION 'Party ID is required';
    END IF;
    
    IF payment_data->>'profile_id' IS NULL THEN
        RAISE EXCEPTION 'Profile ID is required';
    END IF;
    
    IF payment_data->>'payment_amount' IS NULL THEN
        RAISE EXCEPTION 'Payment amount is required';
    END IF;
    
    -- Generate payment reference if not provided
    payment_ref := COALESCE(
        payment_data->>'payment_reference', 
        'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('payment_ref_seq')::TEXT, 4, '0')
    );
    
    -- Create payment record
    INSERT INTO public.payment_records (
        payment_reference,
        party_id,
        party_name,
        payment_amount,
        payment_date,
        payment_method,
        bank_name,
        check_number,
        transaction_reference,
        remaining_amount, -- Initially all amount is unallocated
        payment_status,
        notes,
        receipt_number,
        profile_id,
        created_by_user_id
    ) VALUES (
        payment_ref,
        (payment_data->>'party_id')::UUID,
        payment_data->>'party_name',
        (payment_data->>'payment_amount')::DECIMAL,
        COALESCE((payment_data->>'payment_date')::DATE, CURRENT_DATE),
        COALESCE((payment_data->>'payment_method')::payment_method, 'cash'),
        payment_data->>'bank_name',
        payment_data->>'check_number',
        payment_data->>'transaction_reference',
        (payment_data->>'payment_amount')::DECIMAL, -- Initially unallocated
        COALESCE(payment_data->>'payment_status', 'confirmed'),
        payment_data->>'notes',
        payment_data->>'receipt_number',
        (payment_data->>'profile_id')::UUID,
        (payment_data->>'created_by_user_id')::UUID
    ) RETURNING id INTO payment_id;
    
    -- Update customer balance
    PERFORM update_customer_balance_after_payment((payment_data->>'party_id')::UUID, (payment_data->>'profile_id')::UUID);
    
    RETURN payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to allocate payment to specific transactions
CREATE OR REPLACE FUNCTION public.allocate_payment_to_transaction(
    payment_record_id_param UUID,
    transaction_id_param UUID,
    allocation_amount_param DECIMAL,
    created_by_user_id_param UUID
)
RETURNS UUID AS $$
DECLARE
    allocation_id UUID;
    payment_record RECORD;
    transaction_record RECORD;
    profile_id_val UUID;
    due_before DECIMAL;
    due_after DECIMAL;
BEGIN
    -- Get payment record details
    SELECT * INTO payment_record FROM public.payment_records WHERE id = payment_record_id_param;
    
    IF payment_record IS NULL THEN
        RAISE EXCEPTION 'Payment record not found';
    END IF;
    
    -- Get transaction details
    SELECT * INTO transaction_record FROM public.transactions WHERE id = transaction_id_param;
    
    IF transaction_record IS NULL THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;
    
    -- Validate allocation amount
    IF allocation_amount_param <= 0 THEN
        RAISE EXCEPTION 'Allocation amount must be positive';
    END IF;
    
    IF allocation_amount_param > payment_record.remaining_amount THEN
        RAISE EXCEPTION 'Allocation amount exceeds remaining payment amount';
    END IF;
    
    -- Calculate due amounts
    due_before := transaction_record.due_amount;
    due_after := GREATEST(0, due_before - allocation_amount_param);
    
    -- Create allocation record
    INSERT INTO public.payment_allocations (
        payment_record_id,
        transaction_id,
        allocated_amount,
        transaction_due_before,
        transaction_due_after,
        allocation_type,
        profile_id,
        created_by_user_id
    ) VALUES (
        payment_record_id_param,
        transaction_id_param,
        allocation_amount_param,
        due_before,
        due_after,
        'manual',
        transaction_record.profile_id,
        created_by_user_id_param
    ) RETURNING id INTO allocation_id;
    
    -- Update payment record allocated amounts
    UPDATE public.payment_records 
    SET 
        allocated_amount = allocated_amount + allocation_amount_param,
        remaining_amount = remaining_amount - allocation_amount_param,
        updated_at = NOW()
    WHERE id = payment_record_id_param;
    
    -- Update transaction due amount and payment status
    UPDATE public.transactions 
    SET 
        paid_amount = paid_amount + allocation_amount_param,
        due_amount = due_after,
        payment_status = CASE 
            WHEN due_after = 0 THEN 'paid'
            WHEN due_after < final_amount THEN 'partial'
            ELSE payment_status
        END,
        updated_at = NOW()
    WHERE id = transaction_id_param;
    
    -- Update customer balance
    PERFORM update_customer_balance_after_payment(payment_record.party_id, transaction_record.profile_id);
    
    RETURN allocation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-allocate payment to oldest pending transactions
CREATE OR REPLACE FUNCTION public.auto_allocate_payment(
    payment_record_id_param UUID,
    created_by_user_id_param UUID
)
RETURNS INTEGER AS $$
DECLARE
    payment_record RECORD;
    transaction_record RECORD;
    remaining_payment DECIMAL;
    allocation_amount DECIMAL;
    allocations_count INTEGER := 0;
BEGIN
    -- Get payment record details
    SELECT * INTO payment_record FROM public.payment_records WHERE id = payment_record_id_param;
    
    IF payment_record IS NULL THEN
        RAISE EXCEPTION 'Payment record not found';
    END IF;
    
    remaining_payment := payment_record.remaining_amount;
    
    -- Loop through pending transactions for this party (oldest first)
    FOR transaction_record IN 
        SELECT * FROM public.transactions 
        WHERE party_id = payment_record.party_id 
          AND profile_id = payment_record.profile_id
          AND due_amount > 0
          AND status != 'cancelled'
        ORDER BY transaction_date ASC, created_at ASC
    LOOP
        EXIT WHEN remaining_payment <= 0;
        
        -- Calculate allocation amount (min of remaining payment and transaction due)
        allocation_amount := LEAST(remaining_payment, transaction_record.due_amount);
        
        -- Allocate payment to this transaction
        PERFORM allocate_payment_to_transaction(
            payment_record_id_param,
            transaction_record.id,
            allocation_amount,
            created_by_user_id_param
        );
        
        remaining_payment := remaining_payment - allocation_amount;
        allocations_count := allocations_count + 1;
    END LOOP;
    
    RETURN allocations_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update customer balance after payment activities
CREATE OR REPLACE FUNCTION update_customer_balance_after_payment(
    party_id_param UUID,
    profile_id_param UUID
)
RETURNS VOID AS $$
DECLARE
    total_payments DECIMAL;
    total_outstanding DECIMAL;
    current_credit DECIMAL;
    payment_count INTEGER;
BEGIN
    -- Calculate total payments received
    SELECT 
        COALESCE(SUM(payment_amount), 0),
        COUNT(*)
    INTO total_payments, payment_count
    FROM public.payment_records 
    WHERE party_id = party_id_param 
      AND profile_id = profile_id_param
      AND payment_status = 'confirmed';
    
    -- Calculate total outstanding due
    SELECT COALESCE(SUM(due_amount), 0) 
    INTO total_outstanding
    FROM public.transactions 
    WHERE party_id = party_id_param 
      AND profile_id = profile_id_param
      AND status != 'cancelled';
    
    -- Calculate current credit balance
    current_credit := GREATEST(0, total_payments - (
        SELECT COALESCE(SUM(final_amount), 0) 
        FROM public.transactions 
        WHERE party_id = party_id_param 
          AND profile_id = profile_id_param
          AND status != 'cancelled'
    ));
    
    -- Update customer balance record
    INSERT INTO public.customer_balances (
        party_id,
        profile_id,
        total_payments_received,
        total_outstanding_due,
        current_credit_balance,
        total_payment_records,
        last_payment_date
    ) VALUES (
        party_id_param,
        profile_id_param,
        total_payments,
        total_outstanding,
        current_credit,
        payment_count,
        (SELECT MAX(payment_date) FROM public.payment_records WHERE party_id = party_id_param AND profile_id = profile_id_param)
    )
    ON CONFLICT (party_id, profile_id) DO UPDATE SET
        total_payments_received = total_payments,
        total_outstanding_due = total_outstanding,
        current_credit_balance = current_credit,
        total_payment_records = payment_count,
        last_payment_date = (SELECT MAX(payment_date) FROM public.payment_records WHERE party_id = party_id_param AND profile_id = profile_id_param),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for crop customer balances updated_at
DROP TRIGGER IF EXISTS crop_customer_balances_updated_at ON public.crop_customer_balances;
CREATE TRIGGER crop_customer_balances_updated_at
    BEFORE UPDATE ON public.crop_customer_balances
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for payment records updated_at
DROP TRIGGER IF EXISTS payment_records_updated_at ON public.payment_records;
CREATE TRIGGER payment_records_updated_at
    BEFORE UPDATE ON public.payment_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to update customer balance after payment allocations
DROP TRIGGER IF EXISTS update_customer_balance_after_allocation ON public.payment_allocations;
CREATE TRIGGER update_customer_balance_after_allocation
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_customer_balance_after_allocation();

-- Function for the allocation trigger
CREATE OR REPLACE FUNCTION public.trigger_update_customer_balance_after_allocation()
RETURNS TRIGGER AS $$
DECLARE
    party_id_val UUID;
    profile_id_val UUID;
BEGIN
    -- Get party_id and profile_id from the relevant record
    IF TG_OP = 'DELETE' THEN
        SELECT party_id, profile_id INTO party_id_val, profile_id_val
        FROM public.payment_records pr 
        WHERE pr.id = OLD.payment_record_id;
    ELSE
        SELECT party_id, profile_id INTO party_id_val, profile_id_val
        FROM public.payment_records pr 
        WHERE pr.id = NEW.payment_record_id;
    END IF;
    
    -- Update customer balance
    PERFORM update_customer_balance_after_payment(party_id_val, profile_id_val);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update customer and crop balances
CREATE OR REPLACE FUNCTION public.update_customer_balances()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update or create customer balance record
        INSERT INTO public.customer_balances (
            party_id, company_id, 
            total_invested, total_received, net_balance,
            outstanding_due, total_buy_transactions, total_sell_transactions,
            last_transaction_date
        ) VALUES (
            NEW.party_id, NEW.company_id,
            CASE WHEN NEW.action = 'buy' THEN NEW.total ELSE 0 END,
            CASE WHEN NEW.action = 'sell' THEN NEW.total ELSE 0 END,
            CASE WHEN NEW.action = 'sell' THEN NEW.total ELSE -NEW.total END,
            CASE WHEN NEW.payment_status != 'paid' THEN (NEW.total - COALESCE(NEW.paid_amount, 0)) ELSE 0 END,
            CASE WHEN NEW.action = 'buy' THEN 1 ELSE 0 END,
            CASE WHEN NEW.action = 'sell' THEN 1 ELSE 0 END,
            NEW.transaction_date
        )
        ON CONFLICT (party_id, company_id) DO UPDATE SET
            total_invested = customer_balances.total_invested + 
                CASE WHEN NEW.action = 'buy' THEN NEW.total ELSE 0 END,
            total_received = customer_balances.total_received + 
                CASE WHEN NEW.action = 'sell' THEN NEW.total ELSE 0 END,
            net_balance = customer_balances.net_balance + 
                CASE WHEN NEW.action = 'sell' THEN NEW.total ELSE -NEW.total END,
            outstanding_due = customer_balances.outstanding_due + 
                CASE WHEN NEW.payment_status != 'paid' THEN (NEW.total - COALESCE(NEW.paid_amount, 0)) ELSE 0 END,
            total_buy_transactions = customer_balances.total_buy_transactions + 
                CASE WHEN NEW.action = 'buy' THEN 1 ELSE 0 END,
            total_sell_transactions = customer_balances.total_sell_transactions + 
                CASE WHEN NEW.action = 'sell' THEN 1 ELSE 0 END,
            last_transaction_date = GREATEST(customer_balances.last_transaction_date, NEW.transaction_date),
            updated_at = NOW();

        -- Update or create crop-customer balance record
        INSERT INTO public.crop_customer_balances (
            party_id, crop_id, company_id,
            invested_amount, received_amount, net_profit_loss,
            total_bought_quantity, total_sold_quantity, net_quantity,
            buy_transaction_count, sell_transaction_count,
            avg_buy_rate, avg_sell_rate,
            last_buy_date, last_sell_date
        ) VALUES (
            NEW.party_id, NEW.crop_id, NEW.company_id,
            CASE WHEN NEW.action = 'buy' THEN NEW.total ELSE 0 END,
            CASE WHEN NEW.action = 'sell' THEN NEW.total ELSE 0 END,
            CASE WHEN NEW.action = 'sell' THEN NEW.total ELSE -NEW.total END,
            CASE WHEN NEW.action = 'buy' THEN NEW.quantity ELSE 0 END,
            CASE WHEN NEW.action = 'sell' THEN NEW.quantity ELSE 0 END,
            CASE WHEN NEW.action = 'sell' THEN -NEW.quantity ELSE NEW.quantity END,
            CASE WHEN NEW.action = 'buy' THEN 1 ELSE 0 END,
            CASE WHEN NEW.action = 'sell' THEN 1 ELSE 0 END,
            CASE WHEN NEW.action = 'buy' THEN NEW.rate ELSE 0 END,
            CASE WHEN NEW.action = 'sell' THEN NEW.rate ELSE 0 END,
            CASE WHEN NEW.action = 'buy' THEN NEW.transaction_date ELSE NULL END,
            CASE WHEN NEW.action = 'sell' THEN NEW.transaction_date ELSE NULL END
        )
        ON CONFLICT (party_id, crop_id, company_id) DO UPDATE SET
            invested_amount = crop_customer_balances.invested_amount + 
                CASE WHEN NEW.action = 'buy' THEN NEW.total ELSE 0 END,
            received_amount = crop_customer_balances.received_amount + 
                CASE WHEN NEW.action = 'sell' THEN NEW.total ELSE 0 END,
            net_profit_loss = crop_customer_balances.net_profit_loss + 
                CASE WHEN NEW.action = 'sell' THEN NEW.total ELSE -NEW.total END,
            total_bought_quantity = crop_customer_balances.total_bought_quantity + 
                CASE WHEN NEW.action = 'buy' THEN NEW.quantity ELSE 0 END,
            total_sold_quantity = crop_customer_balances.total_sold_quantity + 
                CASE WHEN NEW.action = 'sell' THEN NEW.quantity ELSE 0 END,
            net_quantity = crop_customer_balances.net_quantity + 
                CASE WHEN NEW.action = 'sell' THEN -NEW.quantity ELSE NEW.quantity END,
            buy_transaction_count = crop_customer_balances.buy_transaction_count + 
                CASE WHEN NEW.action = 'buy' THEN 1 ELSE 0 END,
            sell_transaction_count = crop_customer_balances.sell_transaction_count + 
                CASE WHEN NEW.action = 'sell' THEN 1 ELSE 0 END,
            avg_buy_rate = CASE 
                WHEN NEW.action = 'buy' THEN 
                    (crop_customer_balances.avg_buy_rate * crop_customer_balances.buy_transaction_count + NEW.rate) / 
                    (crop_customer_balances.buy_transaction_count + 1)
                ELSE crop_customer_balances.avg_buy_rate
            END,
            avg_sell_rate = CASE 
                WHEN NEW.action = 'sell' THEN 
                    (crop_customer_balances.avg_sell_rate * crop_customer_balances.sell_transaction_count + NEW.rate) / 
                    (crop_customer_balances.sell_transaction_count + 1)
                ELSE crop_customer_balances.avg_sell_rate
            END,
            last_buy_date = CASE 
                WHEN NEW.action = 'buy' THEN 
                    GREATEST(crop_customer_balances.last_buy_date, NEW.transaction_date)
                ELSE crop_customer_balances.last_buy_date
            END,
            last_sell_date = CASE 
                WHEN NEW.action = 'sell' THEN 
                    GREATEST(crop_customer_balances.last_sell_date, NEW.transaction_date)
                ELSE crop_customer_balances.last_sell_date
            END,
            updated_at = NOW();

        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update customer balances automatically
DROP TRIGGER IF EXISTS update_customer_balances_trigger ON public.transactions;
CREATE TRIGGER update_customer_balances_trigger
    AFTER INSERT ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_customer_balances();

-- =============================================
-- STEP 6: INDEXES FOR PERFORMANCE
-- Execute lines 677-720 - Database optimization
-- =============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON public.profiles(company_name);

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies(created_by);
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);

-- Parties indexes
CREATE INDEX IF NOT EXISTS idx_parties_company_id ON public.parties(company_id);
CREATE INDEX IF NOT EXISTS idx_parties_name ON public.parties(name);
CREATE INDEX IF NOT EXISTS idx_parties_party_type ON public.parties(party_type);

-- Crops indexes
CREATE INDEX IF NOT EXISTS idx_crops_company_id ON public.crops(company_id);
CREATE INDEX IF NOT EXISTS idx_crops_name ON public.crops(name);
CREATE INDEX IF NOT EXISTS idx_crops_is_active ON public.crops(is_active);
CREATE INDEX IF NOT EXISTS idx_crops_last_traded_at ON public.crops(last_traded_at);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_crop_id ON public.transactions(crop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_party_id ON public.transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_action ON public.transactions(action);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_bulk_id ON public.transactions(bulk_transaction_id);

-- Bulk transactions indexes
CREATE INDEX IF NOT EXISTS idx_bulk_transactions_company_id ON public.bulk_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_bulk_transactions_party_id ON public.bulk_transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_bulk_transactions_reference ON public.bulk_transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_bulk_transactions_date ON public.bulk_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bulk_transactions_status ON public.bulk_transactions(status);

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- This section can be uncommented to insert sample data after user signup

/*
-- Sample company (will be created after user signup)
INSERT INTO public.companies (name, description, address, phone, email, created_by) VALUES
('NAEEM & CO', 'Agricultural Products Trading', 'Main Market, Agricultural District', '+92 300 7373952', 'contact@naeemco.pk', 
 (SELECT id FROM public.profiles LIMIT 1));

-- Sample parties
INSERT INTO public.parties (name, contact_person, phone, party_type, company_id, created_by) VALUES
('Local Farmers Coop', 'Ahmed Farmer', '+92 301 1234567', 'seller', 
 (SELECT id FROM public.companies LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
('City Wholesale Market', 'Hassan Trader', '+92 302 7654321', 'buyer',
 (SELECT id FROM public.companies LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
('Premium Export Co', 'Sara Khan', '+92 303 9876543', 'both',
 (SELECT id FROM public.companies LIMIT 1), (SELECT id FROM public.profiles LIMIT 1));

-- Sample crops
INSERT INTO public.crops (name, description, unit, current_stock, price_per_unit, minimum_stock_level, company_id, created_by, category) VALUES
('Wheat', 'High quality wheat grains', 'kg', 500.0, 2200.00, 100.0, 
 (SELECT id FROM public.companies LIMIT 1), (SELECT id FROM public.profiles LIMIT 1), 'Grains'),
('Rice', 'Basmati rice premium quality', 'kg', 300.0, 3500.00, 50.0,
 (SELECT id FROM public.companies LIMIT 1), (SELECT id FROM public.profiles LIMIT 1), 'Grains'),
('Corn', 'Yellow corn kernels', 'kg', 400.0, 1800.00, 75.0,
 (SELECT id FROM public.companies LIMIT 1), (SELECT id FROM public.profiles LIMIT 1), 'Grains'),
('Soybeans', 'Premium soybeans', 'kg', 200.0, 1600.00, 25.0,
 (SELECT id FROM public.companies LIMIT 1), (SELECT id FROM public.profiles LIMIT 1), 'Legumes');
*/

-- =============================================
-- STEP 3A: ADDITIONAL TABLES FOR ENHANCED TRACKING
-- Execute lines 790-872 - Balance and movement tracking
-- =============================================

-- Stock movements table for detailed tracking
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    movement_type stock_movement_type NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    previous_stock DECIMAL(15,3) NOT NULL,
    new_stock DECIMAL(15,3) NOT NULL,
    reason TEXT,
    reference_number VARCHAR(255),
    profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- =============================================
-- STEP 3B: PAYMENT TRACKING TABLES
-- Execute lines 805-890 - Individual and bulk payment management
-- =============================================

-- Individual payment records table - Track each payment made by customers
CREATE TABLE IF NOT EXISTS public.payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference information
    payment_reference VARCHAR(100) UNIQUE NOT NULL,
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    party_name VARCHAR(255) NOT NULL, -- Denormalized for quick access
    
    -- Payment details
    payment_amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method payment_method DEFAULT 'cash',
    
    -- Bank/Check details (if applicable)
    transaction_reference VARCHAR(255),
    
    -- Allocation details
    allocated_amount DECIMAL(15,2) DEFAULT 0, -- How much has been allocated to transactions
    remaining_amount DECIMAL(15,2) DEFAULT 0, -- Unallocated amount (credit balance)
    
    -- Status and metadata
    payment_status VARCHAR(20) DEFAULT 'confirmed', -- 'pending', 'confirmed', 'bounced', 'cancelled'
    notes TEXT,
    receipt_number VARCHAR(100),
    
    -- Ownership and tracking
    profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_payment_amount CHECK (payment_amount > 0),
    CONSTRAINT valid_allocation CHECK (allocated_amount >= 0 AND allocated_amount <= payment_amount),
    CONSTRAINT valid_remaining CHECK (remaining_amount >= 0 AND remaining_amount <= payment_amount)
);

-- Payment allocations table - Track how payments are allocated to specific transactions
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    payment_record_id UUID NOT NULL REFERENCES public.payment_records(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    bulk_transaction_id UUID REFERENCES public.bulk_transactions(id) ON DELETE CASCADE,
    
    -- Allocation details
    allocated_amount DECIMAL(15,2) NOT NULL,
    allocation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    allocation_type VARCHAR(20) DEFAULT 'manual', -- 'manual', 'auto', 'adjustment'
    
    -- Before and after tracking
    transaction_due_before DECIMAL(15,2) NOT NULL,
    transaction_due_after DECIMAL(15,2) NOT NULL,
    
    -- Status and metadata
    allocation_status VARCHAR(20) DEFAULT 'active', -- 'active', 'reversed', 'adjusted'
    notes TEXT,
    
    -- Ownership and tracking
    profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_allocated_amount CHECK (allocated_amount > 0),
    CONSTRAINT valid_due_amounts CHECK (transaction_due_after >= 0),
    CONSTRAINT valid_transaction_reference CHECK (
    transaction_id IS NOT NULL ),   -- Always require transaction_id
);

-- Customer balance tracking table
CREATE TABLE IF NOT EXISTS public.customer_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
    
    -- Overall financial tracking
    total_invested DECIMAL(15,2) DEFAULT 0,      -- Total money paid (buy transactions)
    total_received DECIMAL(15,2) DEFAULT 0,      -- Total money received (sell transactions)
    net_balance DECIMAL(15,2) DEFAULT 0,         -- total_received - total_invested
    
    -- Outstanding and payment tracking
    total_outstanding_due DECIMAL(15,2) DEFAULT 0,     -- Total unpaid transaction amounts
    total_payments_received DECIMAL(15,2) DEFAULT 0,   -- Total payments received from customer
    current_credit_balance DECIMAL(15,2) DEFAULT 0,    -- Excess payments (positive = customer credit)
    credit_limit DECIMAL(15,2) DEFAULT 0,
	total_invested_due Decimal (15,2) default 0,       -- total invested due 
    
    -- Transaction counters
    total_buy_transactions INTEGER DEFAULT 0,
    total_sell_transactions INTEGER DEFAULT 0,
    total_payment_records INTEGER DEFAULT 0,
    
    -- Last activity tracking
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_customer_balance UNIQUE(party_id, profile_id),
    CONSTRAINT valid_credit_balance CHECK (current_credit_balance >= 0)
);
--done 
-- Crop-wise customer investment tracking
CREATE TABLE IF NOT EXISTS public.crop_customer_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
    
    -- Per-crop financial tracking
    invested_amount DECIMAL(15,2) DEFAULT 0,     -- Money invested in this crop (buy)
    received_amount DECIMAL(15,2) DEFAULT 0,     -- Money received from this crop (sell)
    net_profit_loss DECIMAL(15,2) DEFAULT 0,     -- received - invested
    
    -- Quantity tracking
    total_bought_quantity DECIMAL(15,3) DEFAULT 0,
    total_sold_quantity DECIMAL(15,3) DEFAULT 0,
    net_quantity DECIMAL(15,3) DEFAULT 0,
    
    -- Transaction counters
    buy_transaction_count INTEGER DEFAULT 0,
    sell_transaction_count INTEGER DEFAULT 0,
    
    -- Average rates
    avg_buy_rate DECIMAL(15,2) DEFAULT 0,
    avg_sell_rate DECIMAL(15,2) DEFAULT 0,
    
    -- Last activity
    last_buy_date TIMESTAMP WITH TIME ZONE,
    last_sell_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_crop_customer_balance UNIQUE(party_id, crop_id, profile_id)
);

-- Create enum for stock movement types
CREATE TYPE stock_movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'transfer', 'loss', 'found');

-- Enable RLS for stock movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_customer_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

-- Stock movements policies
CREATE POLICY "Users can view stock movements in their profile" ON public.stock_movements
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can create stock movements in their profile" ON public.stock_movements
    FOR INSERT WITH CHECK (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

-- Customer balances policies
CREATE POLICY "Users can view customer balances in their profile" ON public.customer_balances
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can manage customer balances in their profile" ON public.customer_balances
    FOR ALL USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

-- Crop customer balances policies
CREATE POLICY "Users can view crop customer balances in their profile" ON public.crop_customer_balances
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can manage crop customer balances in their profile" ON public.crop_customer_balances
    FOR ALL USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

-- Payment records policies
CREATE POLICY "Users can view payment records in their profile" ON public.payment_records
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can create payment records in their profile" ON public.payment_records
    FOR INSERT WITH CHECK (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can update payment records in their profile" ON public.payment_records
    FOR UPDATE USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

-- Payment allocations policies
CREATE POLICY "Users can view payment allocations in their profile" ON public.payment_allocations
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can create payment allocations in their profile" ON public.payment_allocations
    FOR INSERT WITH CHECK (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can update payment allocations in their profile" ON public.payment_allocations
    FOR UPDATE USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can manage crop customer balances in their company" ON public.crop_customer_balances
    FOR ALL USING (
        company_id IN (
            SELECT id FROM public.companies 
            WHERE created_by = current_user_id()
        )
    );

-- Stock movements indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_crop_id ON public.stock_movements(crop_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_transaction_id ON public.stock_movements(transaction_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON public.stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);

-- Payment records indexes
CREATE INDEX IF NOT EXISTS idx_payment_records_party_id ON public.payment_records(party_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_profile_id ON public.payment_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_payment_date ON public.payment_records(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON public.payment_records(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_records_reference ON public.payment_records(payment_reference);

-- Payment allocations indexes
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON public.payment_allocations(payment_record_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_transaction_id ON public.payment_allocations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_bulk_id ON public.payment_allocations(bulk_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_profile_id ON public.payment_allocations(profile_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_status ON public.payment_allocations(allocation_status);

-- Customer balances indexes
CREATE INDEX IF NOT EXISTS idx_customer_balances_party_id ON public.customer_balances(party_id);
CREATE INDEX IF NOT EXISTS idx_customer_balances_profile_id ON public.customer_balances(profile_id);
CREATE INDEX IF NOT EXISTS idx_customer_balances_net_balance ON public.customer_balances(net_balance);
CREATE INDEX IF NOT EXISTS idx_customer_balances_outstanding_due ON public.customer_balances(total_outstanding_due);
CREATE INDEX IF NOT EXISTS idx_customer_balances_credit_balance ON public.customer_balances(current_credit_balance);

-- Crop customer balances indexes
CREATE INDEX IF NOT EXISTS idx_crop_customer_balances_party_id ON public.crop_customer_balances(party_id);
CREATE INDEX IF NOT EXISTS idx_crop_customer_balances_crop_id ON public.crop_customer_balances(crop_id);
CREATE INDEX IF NOT EXISTS idx_crop_customer_balances_profile_id ON public.crop_customer_balances(profile_id);
CREATE INDEX IF NOT EXISTS idx_crop_customer_balances_net_profit ON public.crop_customer_balances(net_profit_loss);

-- =============================================
-- STEP 7: VIEWS FOR EASY QUERYING
-- Execute lines 890-990 - Pre-built query views
-- =============================================

-- View for crop inventory with calculated metrics
CREATE OR REPLACE VIEW public.crop_inventory_view AS
SELECT 
    c.*,
    CASE 
        WHEN c.current_stock <= c.minimum_stock_level THEN 'Low Stock'
        WHEN c.current_stock <= (c.minimum_stock_level * 1.5) THEN 'Medium Stock'
        ELSE 'Good Stock'
    END as stock_status,
    COALESCE(recent_transactions.transaction_count, 0) as recent_transaction_count,
    COALESCE(stock_value.total_value, 0) as estimated_stock_value,
    COALESCE(buy_stats.total_bought, 0) as total_bought_30d,
    COALESCE(sell_stats.total_sold, 0) as total_sold_30d,
    COALESCE(buy_stats.avg_buy_rate, 0) as avg_buy_rate_30d,
    COALESCE(sell_stats.avg_sell_rate, 0) as avg_sell_rate_30d
FROM public.crops c
LEFT JOIN (
    SELECT 
        crop_id,
        COUNT(*) as transaction_count
    FROM public.transactions 
    WHERE transaction_date >= NOW() - INTERVAL '30 days'
    GROUP BY crop_id
) recent_transactions ON c.id = recent_transactions.crop_id
LEFT JOIN (
    SELECT 
        id,
        (current_stock * price_per_unit / 40) as total_value
    FROM public.crops
) stock_value ON c.id = stock_value.id
LEFT JOIN (
    SELECT 
        crop_id,
        SUM(quantity) as total_bought,
        AVG(rate) as avg_buy_rate
    FROM public.transactions 
    WHERE action = 'buy' AND transaction_date >= NOW() - INTERVAL '30 days'
    GROUP BY crop_id
) buy_stats ON c.id = buy_stats.crop_id
LEFT JOIN (
    SELECT 
        crop_id,
        SUM(quantity) as total_sold,
        AVG(rate) as avg_sell_rate
    FROM public.transactions 
    WHERE action = 'sell' AND transaction_date >= NOW() - INTERVAL '30 days'
    GROUP BY crop_id
) sell_stats ON c.id = sell_stats.crop_id
WHERE c.is_active = true;

-- View for transaction summary
CREATE OR REPLACE VIEW public.transaction_summary_view AS
SELECT 
    t.*,
    c.name as crop_display_name,
    c.category as crop_category,
    p.name as party_display_name,
    p.party_type
FROM public.transactions t
LEFT JOIN public.crops c ON t.crop_id = c.id
LEFT JOIN public.parties p ON t.party_id = p.id
ORDER BY t.transaction_date DESC;

-- View for customer financial summary
CREATE OR REPLACE VIEW public.customer_financial_summary_view AS
SELECT 
    p.id as party_id,
    p.name as customer_name,
    p.phone,
    p.address,
    p.party_type,
    cb.total_invested,
    cb.total_received,
    cb.net_balance,
    cb.outstanding_due,
    cb.total_buy_transactions,
    cb.total_sell_transactions,
    cb.last_transaction_date,
    cb.last_payment_date,
    CASE 
        WHEN cb.net_balance > 0 THEN 'Profit'
        WHEN cb.net_balance < 0 THEN 'Loss'
        ELSE 'Break Even'
    END as profit_status,
    CASE 
        WHEN cb.outstanding_due > 0 THEN 'Has Due'
        ELSE 'Clear'
    END as payment_status
FROM public.parties p
LEFT JOIN public.customer_balances cb ON p.id = cb.party_id
WHERE p.is_active = true
ORDER BY cb.net_balance DESC NULLS LAST;

-- View for crop-wise customer investments
CREATE OR REPLACE VIEW public.crop_investment_summary_view AS
SELECT 
    ccb.party_id,
    p.name as customer_name,
    ccb.crop_id,
    c.name as crop_name,
    c.category as crop_category,
    ccb.invested_amount,
    ccb.received_amount,
    ccb.net_profit_loss,
    ccb.total_bought_quantity,
    ccb.total_sold_quantity,
    ccb.net_quantity,
    ccb.buy_transaction_count,
    ccb.sell_transaction_count,
    ccb.avg_buy_rate,
    ccb.avg_sell_rate,
    ccb.last_buy_date,
    ccb.last_sell_date,
    CASE 
        WHEN ccb.net_profit_loss > 0 THEN 'Profitable'
        WHEN ccb.net_profit_loss < 0 THEN 'Loss Making'
        ELSE 'Break Even'
    END as profitability_status,
    CASE 
        WHEN ccb.avg_sell_rate > ccb.avg_buy_rate THEN 
            ROUND(((ccb.avg_sell_rate - ccb.avg_buy_rate) / ccb.avg_buy_rate * 100), 2)
        ELSE 0
    END as profit_margin_percentage
FROM public.crop_customer_balances ccb
LEFT JOIN public.parties p ON ccb.party_id = p.id
LEFT JOIN public.crops c ON ccb.crop_id = c.id
WHERE p.is_active = true AND c.is_active = true
ORDER BY ccb.net_profit_loss DESC;

-- =============================================
-- STEP 8: STORED PROCEDURES FOR COMMON OPERATIONS
-- Execute lines 992-1200 - Analytical functions
-- =============================================

-- Function to get crop analytics
CREATE OR REPLACE FUNCTION public.get_crop_analytics(
    company_uuid UUID,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    crop_id UUID,
    crop_name VARCHAR,
    total_bought DECIMAL,
    total_sold DECIMAL,
    net_stock DECIMAL,
    total_buy_value DECIMAL,
    total_sell_value DECIMAL,
    profit_loss DECIMAL,
    transaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as crop_id,
        c.name as crop_name,
        COALESCE(SUM(CASE WHEN t.action = 'buy' THEN t.quantity ELSE 0 END), 0) as total_bought,
        COALESCE(SUM(CASE WHEN t.action = 'sell' THEN t.quantity ELSE 0 END), 0) as total_sold,
        c.current_stock as net_stock,
        COALESCE(SUM(CASE WHEN t.action = 'buy' THEN t.total ELSE 0 END), 0) as total_buy_value,
        COALESCE(SUM(CASE WHEN t.action = 'sell' THEN t.total ELSE 0 END), 0) as total_sell_value,
        COALESCE(SUM(CASE WHEN t.action = 'sell' THEN t.total ELSE -t.total END), 0) as profit_loss,
        COUNT(t.id) as transaction_count
    FROM public.crops c
    LEFT JOIN public.transactions t ON c.id = t.crop_id
        AND (start_date IS NULL OR t.transaction_date >= start_date)
        AND (end_date IS NULL OR t.transaction_date <= end_date)
    WHERE c.company_id = company_uuid
        AND c.is_active = true
    GROUP BY c.id, c.name, c.current_stock
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get party ledger
CREATE OR REPLACE FUNCTION public.get_party_ledger(
    party_uuid UUID,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    transaction_id UUID,
    transaction_date TIMESTAMP WITH TIME ZONE,
    crop_name VARCHAR,
    action transaction_action,
    quantity DECIMAL,
    rate DECIMAL,
    total DECIMAL,
    running_balance DECIMAL
) AS $$
DECLARE
    running_total DECIMAL := 0;
BEGIN
    RETURN QUERY
    SELECT 
        t.id as transaction_id,
        t.transaction_date,
        t.crop_name,
        t.action,
        t.quantity,
        t.rate,
        t.total,
        SUM(CASE WHEN t.action = 'sell' THEN t.total ELSE -t.total END) 
            OVER (ORDER BY t.transaction_date, t.created_at) as running_balance
    FROM public.transactions t
    WHERE t.party_id = party_uuid
        AND (start_date IS NULL OR t.transaction_date >= start_date)
        AND (end_date IS NULL OR t.transaction_date <= end_date)
    ORDER BY t.transaction_date, t.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to get stock movement history for a crop
CREATE OR REPLACE FUNCTION public.get_crop_stock_history(
    crop_uuid UUID,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    movement_id UUID,
    movement_date TIMESTAMP WITH TIME ZONE,
    movement_type stock_movement_type,
    quantity DECIMAL,
    previous_stock DECIMAL,
    new_stock DECIMAL,
    reason TEXT,
    transaction_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.id as movement_id,
        sm.created_at as movement_date,
        sm.movement_type,
        sm.quantity,
        sm.previous_stock,
        sm.new_stock,
        sm.reason,
        sm.transaction_id
    FROM public.stock_movements sm
    WHERE sm.crop_id = crop_uuid
        AND (start_date IS NULL OR sm.created_at::DATE >= start_date)
        AND (end_date IS NULL OR sm.created_at::DATE <= end_date)
    ORDER BY sm.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get customer summary with transaction totals
CREATE OR REPLACE FUNCTION public.get_customer_summary(
    company_uuid UUID,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    party_id UUID,
    party_name VARCHAR,
    party_type party_type,
    total_transactions BIGINT,
    total_purchase_amount DECIMAL,
    total_sale_amount DECIMAL,
    net_balance DECIMAL,
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    most_traded_crop VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as party_id,
        p.name as party_name,
        p.party_type,
        COALESCE(trans_summary.total_transactions, 0) as total_transactions,
        COALESCE(trans_summary.total_purchase_amount, 0) as total_purchase_amount,
        COALESCE(trans_summary.total_sale_amount, 0) as total_sale_amount,
        COALESCE(trans_summary.total_sale_amount - trans_summary.total_purchase_amount, 0) as net_balance,
        trans_summary.last_transaction_date,
        trans_summary.most_traded_crop
    FROM public.parties p
    LEFT JOIN (
        SELECT 
            t.party_id,
            COUNT(*) as total_transactions,
            SUM(CASE WHEN t.action = 'buy' THEN t.total ELSE 0 END) as total_purchase_amount,
            SUM(CASE WHEN t.action = 'sell' THEN t.total ELSE 0 END) as total_sale_amount,
            MAX(t.transaction_date) as last_transaction_date,
            MODE() WITHIN GROUP (ORDER BY t.crop_name) as most_traded_crop
        FROM public.transactions t
        WHERE (start_date IS NULL OR t.transaction_date >= start_date)
            AND (end_date IS NULL OR t.transaction_date <= end_date)
        GROUP BY t.party_id
    ) trans_summary ON p.id = trans_summary.party_id
    WHERE p.company_id = company_uuid
    ORDER BY trans_summary.total_transactions DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to create manual stock adjustment
CREATE OR REPLACE FUNCTION public.adjust_stock(
    crop_uuid UUID,
    adjustment_quantity DECIMAL,
    adjustment_reason TEXT,
    user_id UUID,
    company_uuid UUID
)
RETURNS UUID AS $$
DECLARE
    old_stock DECIMAL(15,3);
    new_stock DECIMAL(15,3);
    movement_id UUID;
    movement_type_val stock_movement_type;
BEGIN
    -- Get current stock
    SELECT current_stock INTO old_stock FROM public.crops WHERE id = crop_uuid;
    
    -- Update stock
    UPDATE public.crops 
    SET current_stock = current_stock + adjustment_quantity,
        updated_at = NOW()
    WHERE id = crop_uuid
    RETURNING current_stock INTO new_stock;
    
    -- Determine movement type
    IF adjustment_quantity > 0 THEN
        movement_type_val := 'found';
    ELSE
        movement_type_val := 'loss';
    END IF;
    
    -- Record stock movement
    INSERT INTO public.stock_movements (
        crop_id, movement_type, quantity, previous_stock, new_stock, 
        reason, company_id, created_by
    ) VALUES (
        crop_uuid, movement_type_val, ABS(adjustment_quantity), 
        old_stock, new_stock, adjustment_reason, company_uuid, user_id
    ) RETURNING id INTO movement_id;
    
    RETURN movement_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get customer financial summary
CREATE OR REPLACE FUNCTION public.get_customer_financial_summary(
    customer_uuid UUID
)
RETURNS TABLE (
    customer_name VARCHAR,
    phone VARCHAR,
    total_invested DECIMAL,
    total_received DECIMAL,
    net_balance DECIMAL,
    outstanding_due DECIMAL,
    total_transactions INTEGER,
    profit_percentage DECIMAL,
    most_profitable_crop VARCHAR,
    most_loss_making_crop VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name as customer_name,
        p.phone,
        COALESCE(cb.total_invested, 0) as total_invested,
        COALESCE(cb.total_received, 0) as total_received,
        COALESCE(cb.net_balance, 0) as net_balance,
        COALESCE(cb.outstanding_due, 0) as outstanding_due,
        COALESCE(cb.total_buy_transactions + cb.total_sell_transactions, 0) as total_transactions,
        CASE 
            WHEN cb.total_invested > 0 THEN 
                ROUND((cb.net_balance / cb.total_invested * 100), 2)
            ELSE 0
        END as profit_percentage,
        (SELECT c.name FROM public.crop_customer_balances ccb 
         JOIN public.crops c ON ccb.crop_id = c.id 
         WHERE ccb.party_id = customer_uuid 
         ORDER BY ccb.net_profit_loss DESC LIMIT 1) as most_profitable_crop,
        (SELECT c.name FROM public.crop_customer_balances ccb 
         JOIN public.crops c ON ccb.crop_id = c.id 
         WHERE ccb.party_id = customer_uuid 
         ORDER BY ccb.net_profit_loss ASC LIMIT 1) as most_loss_making_crop
    FROM public.parties p
    LEFT JOIN public.customer_balances cb ON p.id = cb.party_id
    WHERE p.id = customer_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get crop investment details for a customer
CREATE OR REPLACE FUNCTION public.get_customer_crop_investments(
    customer_uuid UUID
)
RETURNS TABLE (
    crop_name VARCHAR,
    crop_category VARCHAR,
    invested_amount DECIMAL,
    received_amount DECIMAL,
    net_profit_loss DECIMAL,
    total_bought_kg DECIMAL,
    total_sold_kg DECIMAL,
    avg_buy_rate DECIMAL,
    avg_sell_rate DECIMAL,
    profit_margin_percentage DECIMAL,
    last_transaction_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.name as crop_name,
        COALESCE(c.category, 'Unknown') as crop_category,
        ccb.invested_amount,
        ccb.received_amount,
        ccb.net_profit_loss,
        ccb.total_bought_quantity as total_bought_kg,
        ccb.total_sold_quantity as total_sold_kg,
        ccb.avg_buy_rate,
        ccb.avg_sell_rate,
        CASE 
            WHEN ccb.avg_buy_rate > 0 THEN 
                ROUND(((ccb.avg_sell_rate - ccb.avg_buy_rate) / ccb.avg_buy_rate * 100), 2)
            ELSE 0
        END as profit_margin_percentage,
        GREATEST(ccb.last_buy_date, ccb.last_sell_date) as last_transaction_date
    FROM public.crop_customer_balances ccb
    LEFT JOIN public.crops c ON ccb.crop_id = c.id
    WHERE ccb.party_id = customer_uuid
    ORDER BY ccb.net_profit_loss DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- BULK TRANSACTION PROCESSING FUNCTIONS
-- Functions to handle multiple crops in single bulk transaction
-- =============================================

-- Function to process bulk transaction and create individual transactions
CREATE OR REPLACE FUNCTION public.process_bulk_transaction(
    bulk_transaction_data JSONB
)
RETURNS UUID AS $$
DECLARE
    bulk_id UUID;
    transaction_item JSONB;
    buy_total_calc DECIMAL := 0;
    sell_total_calc DECIMAL := 0;
    gross_total_calc DECIMAL := 0;
    individual_transaction_id UUID;
    crop_record RECORD;
    transaction_type_calc VARCHAR(20);
    has_buy BOOLEAN := false;
    has_sell BOOLEAN := false;
BEGIN
    -- Validate required fields
    IF bulk_transaction_data->>'reference_number' IS NULL THEN
        RAISE EXCEPTION 'Reference number is required';
    END IF;
    
    IF bulk_transaction_data->>'profile_id' IS NULL THEN
        RAISE EXCEPTION 'Profile ID is required';
    END IF;
    
    -- Determine transaction type by analyzing individual transactions
    FOR transaction_item IN SELECT * FROM jsonb_array_elements(bulk_transaction_data->'transactions')
    LOOP
        IF (transaction_item->>'action') = 'buy' THEN
            has_buy := true;
        ELSIF (transaction_item->>'action') = 'sell' THEN
            has_sell := true;
        END IF;
    END LOOP;
    
    -- Set transaction type
    IF has_buy AND has_sell THEN
        transaction_type_calc := 'mixed';
    ELSIF has_buy THEN
        transaction_type_calc := 'buy';
    ELSE
        transaction_type_calc := 'sell';
    END IF;
    
    -- Create the bulk transaction record first
    INSERT INTO public.bulk_transactions (
        reference_number,
        party_id,
        party_name,
        transaction_date,
        transaction_type,
        payment_method,
        payment_status,
        paid_amount,
        due_amount,
        due_date,
        vehicle_number,
        driver_name,
        delivery_address,
        notes,
        profile_id,
        created_by_user_id,
        status
    ) VALUES (
        bulk_transaction_data->>'reference_number',
        (bulk_transaction_data->>'party_id')::UUID,
        bulk_transaction_data->>'party_name',
        COALESCE((bulk_transaction_data->>'transaction_date')::TIMESTAMP WITH TIME ZONE, NOW()),
        transaction_type_calc,
        COALESCE((bulk_transaction_data->>'payment_method')::payment_method, 'cash'),
        COALESCE(bulk_transaction_data->>'payment_status', 'pending'),
        COALESCE((bulk_transaction_data->>'paid_amount')::DECIMAL, 0),
        COALESCE((bulk_transaction_data->>'due_amount')::DECIMAL, 0),
        (bulk_transaction_data->>'due_date')::DATE,
        bulk_transaction_data->>'vehicle_number',
        bulk_transaction_data->>'driver_name',
        bulk_transaction_data->>'delivery_address',
        bulk_transaction_data->>'notes',
        (bulk_transaction_data->>'profile_id')::UUID,
        (bulk_transaction_data->>'created_by_user_id')::UUID,
        COALESCE((bulk_transaction_data->>'status')::transaction_status, 'pending')
    ) RETURNING id INTO bulk_id;
    
    -- Process each transaction item in the bulk
    FOR transaction_item IN SELECT * FROM jsonb_array_elements(bulk_transaction_data->'transactions')
    LOOP
        -- Get crop information
        SELECT * INTO crop_record FROM public.crops WHERE id = (transaction_item->>'crop_id')::UUID;
        
        IF crop_record IS NULL THEN
            RAISE EXCEPTION 'Crop with ID % not found', transaction_item->>'crop_id';
        END IF;
        
        -- Create individual transaction
        INSERT INTO public.transactions (
            crop_id,
            crop_name,
            action,
            quantity,
            rate,
            total,
            party_id,
            party_name,
            transaction_date,
            status,
            payment_method,
            reference_number,
            batch_number,
            tax_percentage,
            tax_amount,
            discount_amount,
            final_amount,
            payment_status,
            paid_amount,
            due_date,
            payment_date,
            quality_grade,
            quality_notes,
            vehicle_number,
            driver_name,
            delivery_address,
            bulk_transaction_id,
            notes,
            profile_id,
            created_by_user_id
        ) VALUES (
            (transaction_item->>'crop_id')::UUID,
            COALESCE(transaction_item->>'crop_name', crop_record.name),
            (transaction_item->>'action')::transaction_action,
            (transaction_item->>'quantity')::DECIMAL,
            (transaction_item->>'rate')::DECIMAL,
            (transaction_item->>'total')::DECIMAL,
            (bulk_transaction_data->>'party_id')::UUID,
            bulk_transaction_data->>'party_name',
            COALESCE((bulk_transaction_data->>'transaction_date')::TIMESTAMP WITH TIME ZONE, NOW()),
            COALESCE((transaction_item->>'status')::transaction_status, 'confirmed'),
            COALESCE((bulk_transaction_data->>'payment_method')::payment_method, 'cash'),
            bulk_transaction_data->>'reference_number',
            transaction_item->>'batch_number',
            COALESCE((transaction_item->>'tax_percentage')::DECIMAL, 0),
            COALESCE((transaction_item->>'tax_amount')::DECIMAL, 0),
            COALESCE((transaction_item->>'discount_amount')::DECIMAL, 0),
            COALESCE((transaction_item->>'final_amount')::DECIMAL, (transaction_item->>'total')::DECIMAL),
            COALESCE(bulk_transaction_data->>'payment_status', 'paid'),
            COALESCE((transaction_item->>'paid_amount')::DECIMAL, 
                    CASE WHEN bulk_transaction_data->>'payment_status' = 'paid' 
                         THEN (transaction_item->>'total')::DECIMAL 
                         ELSE 0 END),
            (bulk_transaction_data->>'due_date')::DATE,
            (bulk_transaction_data->>'payment_date')::DATE,
            transaction_item->>'quality_grade',
            transaction_item->>'quality_notes',
            bulk_transaction_data->>'vehicle_number',
            bulk_transaction_data->>'driver_name',
            bulk_transaction_data->>'delivery_address',
            bulk_id,
            transaction_item->>'notes',
            (bulk_transaction_data->>'profile_id')::UUID,
            (bulk_transaction_data->>'created_by_user_id')::UUID
        ) RETURNING id INTO individual_transaction_id;
        
        -- Calculate totals for bulk transaction update
        IF (transaction_item->>'action') = 'buy' THEN
            buy_total_calc := buy_total_calc + (transaction_item->>'total')::DECIMAL;
        ELSIF (transaction_item->>'action') = 'sell' THEN
            sell_total_calc := sell_total_calc + (transaction_item->>'total')::DECIMAL;
        END IF;
        
        gross_total_calc := gross_total_calc + (transaction_item->>'total')::DECIMAL;
    END LOOP;
    
    -- Update bulk transaction with calculated totals
    UPDATE public.bulk_transactions SET
        buy_total = buy_total_calc,
        sell_total = sell_total_calc,
        gross_total = gross_total_calc,
        net_amount = sell_total_calc - buy_total_calc,
        tax_amount = COALESCE((bulk_transaction_data->>'tax_amount')::DECIMAL, 0),
        discount_amount = COALESCE((bulk_transaction_data->>'discount_amount')::DECIMAL, 0),
        final_amount = gross_total_calc + COALESCE((bulk_transaction_data->>'tax_amount')::DECIMAL, 0) 
                      - COALESCE((bulk_transaction_data->>'discount_amount')::DECIMAL, 0),
        updated_at = NOW()
    WHERE id = bulk_id;
    
    RETURN bulk_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get bulk transaction details with all individual transactions
CREATE OR REPLACE FUNCTION public.get_bulk_transaction_details(
    bulk_transaction_uuid UUID
)
RETURNS TABLE (
    bulk_id UUID,
    reference_number VARCHAR,
    party_name VARCHAR,
    transaction_date TIMESTAMP WITH TIME ZONE,
    transaction_type VARCHAR,
    buy_total DECIMAL,
    sell_total DECIMAL,
    net_amount DECIMAL,
    payment_status VARCHAR,
    vehicle_number VARCHAR,
    driver_name VARCHAR,
    individual_transactions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bt.id as bulk_id,
        bt.reference_number,
        bt.party_name,
        bt.transaction_date,
        bt.transaction_type,
        bt.buy_total,
        bt.sell_total,
        bt.net_amount,
        bt.payment_status,
        bt.vehicle_number,
        bt.driver_name,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', t.id,
                    'crop_id', t.crop_id,
                    'crop_name', t.crop_name,
                    'action', t.action,
                    'quantity', t.quantity,
                    'rate', t.rate,
                    'total', t.total,
                    'quality_grade', t.quality_grade,
                    'batch_number', t.batch_number,
                    'notes', t.notes
                ) ORDER BY t.created_at
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'::jsonb
        ) as individual_transactions
    FROM public.bulk_transactions bt
    LEFT JOIN public.transactions t ON bt.id = t.bulk_transaction_id
    WHERE bt.id = bulk_transaction_uuid
    GROUP BY bt.id, bt.reference_number, bt.party_name, bt.transaction_date, 
             bt.transaction_type, bt.buy_total, bt.sell_total, bt.net_amount, 
             bt.payment_status, bt.vehicle_number, bt.driver_name;
END;
$$ LANGUAGE plpgsql;

-- Function to validate bulk transaction data before processing
CREATE OR REPLACE FUNCTION public.validate_bulk_transaction_data(
    bulk_transaction_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    transaction_item JSONB;
    validation_errors JSONB := '[]'::jsonb;
    crop_exists BOOLEAN;
    party_exists BOOLEAN;
BEGIN
    -- Check required bulk fields
    IF bulk_transaction_data->>'reference_number' IS NULL OR 
       LENGTH(TRIM(bulk_transaction_data->>'reference_number')) = 0 THEN
        validation_errors := validation_errors || '["Reference number is required"]'::jsonb;
    END IF;
    
    IF bulk_transaction_data->>'profile_id' IS NULL THEN
        validation_errors := validation_errors || '["Profile ID is required"]'::jsonb;
    END IF;
    
    IF bulk_transaction_data->>'created_by_user_id' IS NULL THEN
        validation_errors := validation_errors || '["Created by user ID is required"]'::jsonb;
    END IF;
    
    -- Check if party exists (if provided)
    IF bulk_transaction_data->>'party_id' IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM public.parties WHERE id = (bulk_transaction_data->>'party_id')::UUID) 
        INTO party_exists;
        
        IF NOT party_exists THEN
            validation_errors := validation_errors || '["Party not found"]'::jsonb;
        END IF;
    END IF;
    
    -- Check individual transactions
    IF jsonb_array_length(bulk_transaction_data->'transactions') = 0 THEN
        validation_errors := validation_errors || '["At least one transaction item is required"]'::jsonb;
    ELSE
        FOR transaction_item IN SELECT * FROM jsonb_array_elements(bulk_transaction_data->'transactions')
        LOOP
            -- Check required fields for each transaction
            IF transaction_item->>'crop_id' IS NULL THEN
                validation_errors := validation_errors || '["Crop ID is required for all transactions"]'::jsonb;
            ELSE
                -- Check if crop exists
                SELECT EXISTS(SELECT 1 FROM public.crops WHERE id = (transaction_item->>'crop_id')::UUID) 
                INTO crop_exists;
                
                IF NOT crop_exists THEN
                    validation_errors := validation_errors || 
                        format('["Crop with ID %s not found"]', transaction_item->>'crop_id')::jsonb;
                END IF;
            END IF;
            
            IF transaction_item->>'action' IS NULL OR 
               (transaction_item->>'action' NOT IN ('buy', 'sell')) THEN
                validation_errors := validation_errors || '["Valid action (buy/sell) is required"]'::jsonb;
            END IF;
            
            IF transaction_item->>'quantity' IS NULL OR 
               (transaction_item->>'quantity')::DECIMAL <= 0 THEN
                validation_errors := validation_errors || '["Valid quantity (> 0) is required"]'::jsonb;
            END IF;
            
            IF transaction_item->>'rate' IS NULL OR 
               (transaction_item->>'rate')::DECIMAL <= 0 THEN
                validation_errors := validation_errors || '["Valid rate (> 0) is required"]'::jsonb;
            END IF;
            
            IF transaction_item->>'total' IS NULL OR 
               (transaction_item->>'total')::DECIMAL <= 0 THEN
                validation_errors := validation_errors || '["Valid total (> 0) is required"]'::jsonb;
            END IF;
        END LOOP;
    END IF;
    
    RETURN jsonb_build_object(
        'is_valid', jsonb_array_length(validation_errors) = 0,
        'errors', validation_errors
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get crop-wise investment summary across all customers
CREATE OR REPLACE FUNCTION public.get_crop_investment_overview(
    company_uuid UUID
)
RETURNS TABLE (
    crop_name VARCHAR,
    total_customers INTEGER,
    total_invested DECIMAL,
    total_received DECIMAL,
    net_profit_loss DECIMAL,
    total_quantity_traded DECIMAL,
    avg_profit_margin DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.name as crop_name,
        COUNT(DISTINCT ccb.party_id)::INTEGER as total_customers,
        SUM(ccb.invested_amount) as total_invested,
        SUM(ccb.received_amount) as total_received,
        SUM(ccb.net_profit_loss) as net_profit_loss,
        SUM(ccb.total_bought_quantity + ccb.total_sold_quantity) as total_quantity_traded,
        CASE 
            WHEN SUM(ccb.invested_amount) > 0 THEN 
                ROUND((SUM(ccb.net_profit_loss) / SUM(ccb.invested_amount) * 100), 2)
            ELSE 0
        END as avg_profit_margin
    FROM public.crop_customer_balances ccb
    LEFT JOIN public.crops c ON ccb.crop_id = c.id
    WHERE ccb.company_id = company_uuid
    GROUP BY c.id, c.name
    ORDER BY net_profit_loss DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get top performing customers by profit
CREATE OR REPLACE FUNCTION public.get_top_customers_by_profit(
    company_uuid UUID,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    customer_name VARCHAR,
    phone VARCHAR,
    net_balance DECIMAL,
    total_invested DECIMAL,
    total_received DECIMAL,
    profit_percentage DECIMAL,
    total_transactions INTEGER,
    last_transaction_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name as customer_name,
        p.phone,
        cb.net_balance,
        cb.total_invested,
        cb.total_received,
        CASE 
            WHEN cb.total_invested > 0 THEN 
                ROUND((cb.net_balance / cb.total_invested * 100), 2)
            ELSE 0
        END as profit_percentage,
        (cb.total_buy_transactions + cb.total_sell_transactions) as total_transactions,
        cb.last_transaction_date
    FROM public.customer_balances cb
    LEFT JOIN public.parties p ON cb.party_id = p.id
    WHERE cb.company_id = company_uuid
    ORDER BY cb.net_balance DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 9: EXPENSES MANAGEMENT - Business Operating Costs
-- Execute this section to add expense tracking
-- =============================================

-- Create expenses table for tracking business operating costs
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    
    -- Expense details
    expense_category expense_category NOT NULL,
    description TEXT NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    
    -- Financial details
    gross_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    final_amount DECIMAL(15,2) NOT NULL, -- gross_amount + tax_amount - discount_amount
    
    -- Payment tracking
    paid_amount DECIMAL(15,2) DEFAULT 0,
    due_amount DECIMAL(15,2) DEFAULT 0,  -- final_amount - paid_amount
    payment_method payment_method DEFAULT 'cash',
    payment_date DATE,
    
    -- Additional details
    notes TEXT,
    attachment_path TEXT,  -- For storing bill/receipt images
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency VARCHAR(20), -- 'monthly', 'quarterly', 'yearly'
    
    -- Ownership and tracking
    profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_expense_amounts CHECK (gross_amount > 0 AND final_amount > 0),
    CONSTRAINT valid_expense_payment_amounts CHECK (paid_amount >= 0 AND due_amount >= 0),
    CONSTRAINT valid_expense_due_calculation CHECK (due_amount = final_amount - paid_amount)
);


-- Enable RLS for expenses table
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for expenses
CREATE POLICY "Users can view expenses in their profile" ON public.expenses
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can create expenses in their profile" ON public.expenses
    FOR INSERT WITH CHECK (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY "Users can update expenses in their profile" ON public.expenses
    FOR UPDATE USING (
        profile_id IN (
            SELECT profile_id FROM public.profiles 
            WHERE user_id = current_user_id()
        )
    );

-- Add expense updated_at trigger
CREATE TRIGGER expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add expense indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_profile_id ON public.expenses(profile_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_name ON public.expenses(vendor_name);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(expense_category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(payment_status);
CREATE INDEX IF NOT EXISTS idx_expenses_reference ON public.expenses(expense_reference);

-- Create sequence for expense reference numbers
CREATE SEQUENCE IF NOT EXISTS expense_ref_seq START 1;

-- Function to create expense record
CREATE OR REPLACE FUNCTION public.create_expense_record(
    expense_data JSONB
)
RETURNS UUID AS $$
DECLARE
    expense_id UUID;
    expense_ref VARCHAR;
    final_amount_calc DECIMAL;
BEGIN
    -- Validate required fields
    IF expense_data->>'vendor_name' IS NULL THEN
        RAISE EXCEPTION 'Vendor name is required';
    END IF;
    
    IF expense_data->>'expense_category' IS NULL THEN
        RAISE EXCEPTION 'Expense category is required';
    END IF;
    
    IF expense_data->>'gross_amount' IS NULL THEN
        RAISE EXCEPTION 'Expense amount is required';
    END IF;
    
    -- Generate expense reference if not provided
    expense_ref := COALESCE(
        expense_data->>'expense_reference', 
        'EXP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('expense_ref_seq')::TEXT, 4, '0')
    );
    
    -- Calculate final amount
    final_amount_calc := (expense_data->>'gross_amount')::DECIMAL + 
                        COALESCE((expense_data->>'tax_amount')::DECIMAL, 0) - 
                        COALESCE((expense_data->>'discount_amount')::DECIMAL, 0);
    
    -- Create expense record
    INSERT INTO public.expenses (
        expense_reference,
        bill_number,
        vendor_name,
        vendor_contact,
        expense_category,
        description,
        expense_date,
        due_date,
        gross_amount,
        tax_amount,
        discount_amount,
        final_amount,
        paid_amount,
        due_amount,
        payment_status,
        payment_method,
        payment_date,
        notes,
        attachment_path,
        is_recurring,
        recurring_frequency,
        profile_id,
        created_by_user_id
    ) VALUES (
        expense_ref,
        expense_data->>'bill_number',
        expense_data->>'vendor_name',
        expense_data->>'vendor_contact',
        (expense_data->>'expense_category')::expense_category,
        expense_data->>'description',
        COALESCE((expense_data->>'expense_date')::DATE, CURRENT_DATE),
        (expense_data->>'due_date')::DATE,
        (expense_data->>'gross_amount')::DECIMAL,
        COALESCE((expense_data->>'tax_amount')::DECIMAL, 0),
        COALESCE((expense_data->>'discount_amount')::DECIMAL, 0),
        final_amount_calc,
        COALESCE((expense_data->>'paid_amount')::DECIMAL, 0),
        final_amount_calc - COALESCE((expense_data->>'paid_amount')::DECIMAL, 0),
        COALESCE((expense_data->>'payment_status')::expense_status, 'pending'),
        COALESCE((expense_data->>'payment_method')::payment_method, 'cash'),
        (expense_data->>'payment_date')::DATE,
        expense_data->>'notes',
        expense_data->>'attachment_path',
        COALESCE((expense_data->>'is_recurring')::BOOLEAN, false),
        expense_data->>'recurring_frequency',
        (expense_data->>'profile_id')::UUID,
        (expense_data->>'created_by_user_id')::UUID
    ) RETURNING id INTO expense_id;
    
    RETURN expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get complete business financial overview including expenses
CREATE OR REPLACE FUNCTION public.get_complete_business_summary(
    profile_uuid UUID,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    -- Revenue & COGS
    total_revenue DECIMAL,
    total_cogs DECIMAL,
    gross_profit DECIMAL,
    gross_profit_margin DECIMAL,
    
    -- Expenses & Net Profit
    total_expenses DECIMAL,
    net_profit DECIMAL,
    net_profit_margin DECIMAL,
    
    -- Outstanding amounts
    total_receivables DECIMAL,
    total_payables DECIMAL,
    total_expense_dues DECIMAL,
    
    -- Transaction counts
    total_transactions INTEGER,
    total_customers INTEGER,
    total_expense_records INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH business_data AS (
        SELECT 
            -- Revenue from sales
            SUM(CASE WHEN transaction_type = 'sell' THEN final_amount ELSE 0 END) as revenue,
            -- Cost of goods sold (purchases)
            SUM(CASE WHEN transaction_type = 'buy' THEN final_amount ELSE 0 END) as cogs,
            -- Outstanding receivables
            SUM(CASE WHEN transaction_type = 'sell' AND due_amount > 0 THEN due_amount ELSE 0 END) as receivables,
            -- Outstanding payables
            SUM(CASE WHEN transaction_type = 'buy' AND due_amount > 0 THEN due_amount ELSE 0 END) as payables,
            -- Transaction counts
            COUNT(*) as transaction_count,
            COUNT(DISTINCT party_id) as customer_count
        FROM public.transactions 
        WHERE profile_id = profile_uuid 
          AND status != 'cancelled'
          AND (start_date IS NULL OR transaction_date >= start_date)
          AND (end_date IS NULL OR transaction_date <= end_date)
    ),
    expense_data AS (
        SELECT 
            COALESCE(SUM(final_amount), 0) as expenses,
            COALESCE(SUM(due_amount), 0) as expense_dues,
            COUNT(*) as expense_count
        FROM public.expenses
        WHERE profile_id = profile_uuid
          AND payment_status != 'cancelled'
          AND (start_date IS NULL OR expense_date >= start_date)
          AND (end_date IS NULL OR expense_date <= end_date)
    )
    SELECT 
        bd.revenue,
        bd.cogs,
        (bd.revenue - bd.cogs) as gross_profit,
        CASE 
            WHEN bd.revenue > 0 THEN 
                ROUND(((bd.revenue - bd.cogs) / bd.revenue * 100), 2)
            ELSE 0 
        END as gross_margin,
        
        ed.expenses,
        (bd.revenue - bd.cogs - ed.expenses) as net_profit,
        CASE 
            WHEN bd.revenue > 0 THEN 
                ROUND(((bd.revenue - bd.cogs - ed.expenses) / bd.revenue * 100), 2)
            ELSE 0 
        END as net_margin,
        
        bd.receivables,
        bd.payables,
        ed.expense_dues,
        
        bd.transaction_count::INTEGER,
        bd.customer_count::INTEGER,
        ed.expense_count::INTEGER
    FROM business_data bd
    CROSS JOIN expense_data ed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 10: COMPLETION MESSAGE
-- Execute lines 1202-1230 - Final validation
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '=====================================';
    RAISE NOTICE 'SUPABASE SCHEMA SETUP COMPLETED';
    RAISE NOTICE '=====================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '- profiles (user management)';
    RAISE NOTICE '- companies (business entities)';
    RAISE NOTICE '- parties (buyers/sellers)';
    RAISE NOTICE '- crops (inventory items)';
    RAISE NOTICE '- transactions (individual transactions)';
    RAISE NOTICE '- bulk_transactions (grouped transactions)';
    RAISE NOTICE '- payment_records (customer payments tracking)';
    RAISE NOTICE '- payment_allocations (payment audit trail)';
    RAISE NOTICE '- expenses (business operating costs)';
    RAISE NOTICE '';
    RAISE NOTICE 'Features enabled:';
    RAISE NOTICE '- Row Level Security (RLS)';
    RAISE NOTICE '- Automatic stock updates';
    RAISE NOTICE '- User profile auto-creation';
    RAISE NOTICE '- Timestamp triggers';
    RAISE NOTICE '- Performance indexes';
    RAISE NOTICE '- Analytics views';
    RAISE NOTICE '- Helper functions';
    RAISE NOTICE '- Payment allocation system';
    RAISE NOTICE '- Complete financial tracking';
    RAISE NOTICE '';
    RAISE NOTICE 'Financial Formula:';
    RAISE NOTICE 'Net Profit = Total Revenue - Total COGS - Total Expenses';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test user signup';
    RAISE NOTICE '2. Create your first company';
    RAISE NOTICE '3. Add crops and parties';
    RAISE NOTICE '4. Start recording transactions';
    RAISE NOTICE '5. Track customer payments';
    RAISE NOTICE '6. Record business expenses';
    RAISE NOTICE '7. Monitor complete financial health';
    RAISE NOTICE '=====================================';
END $$;
