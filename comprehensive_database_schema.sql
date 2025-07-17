-- =============================================
-- COMPREHENSIVE BUSINESS INVENTORY DATABASE SCHEMA
-- Designed for Frontend Integration & Future Scalability
-- For Supabase PostgreSQL with Next.js Frontend
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================
-- 1. ENUMS & CUSTOM TYPES
-- =============================================

-- User roles with hierarchy
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user', 'viewer');

-- Transaction types for business operations
CREATE TYPE transaction_type AS ENUM ('purchase', 'sale', 'adjustment', 'transfer', 'return', 'opening_stock');

-- Transaction status for workflow management
CREATE TYPE transaction_status AS ENUM ('draft', 'pending', 'confirmed', 'cancelled', 'partial', 'completed');

-- Payment methods
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'credit_card', 'check', 'digital_wallet', 'credit');

-- Payment status tracking
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue', 'cancelled');

-- Stock movement types for detailed tracking
CREATE TYPE movement_type AS ENUM ('in', 'out', 'adjustment', 'transfer_in', 'transfer_out', 'opening', 'closing');

-- Notification types
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success', 'low_stock', 'transaction', 'system');

-- Report types for analytics
CREATE TYPE report_type AS ENUM ('inventory', 'sales', 'purchase', 'profit_loss', 'stock_movement', 'ledger', 'analytics');

-- =============================================
-- 2. AUTHENTICATION & USER MANAGEMENT
-- =============================================

-- Extended user profiles (links to auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    company_name VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Pakistan',
    postal_code VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'Asia/Karachi',
    language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(10) DEFAULT 'PKR',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. BUSINESS ENTITIES & MULTI-TENANCY
-- =============================================

-- Companies/Organizations for multi-tenancy
CREATE TABLE public.companies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    description TEXT,
    industry VARCHAR(100),
    business_type VARCHAR(50), -- 'agriculture', 'retail', 'wholesale', 'manufacturing'
    registration_number VARCHAR(100),
    tax_id VARCHAR(50),
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Pakistan',
    postal_code VARCHAR(20),
    
    -- Financial Settings
    base_currency VARCHAR(10) DEFAULT 'PKR',
    financial_year_start DATE DEFAULT '2024-01-01',
    
    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#16A34A', -- Green theme
    
    -- Settings
    settings JSONB DEFAULT '{}',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User-Company relationships (multi-tenancy)
CREATE TABLE public.user_companies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    role user_role DEFAULT 'user',
    permissions TEXT[] DEFAULT '{}', -- Granular permissions
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Default company for user
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID REFERENCES public.profiles(id),
    UNIQUE(user_id, company_id)
);

-- =============================================
-- 4. PRODUCT ORGANIZATION
-- =============================================

-- Categories for product organization
CREATE TABLE public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.categories(id), -- Hierarchical categories
    
    -- Display & Organization
    sort_order INTEGER DEFAULT 0,
    color VARCHAR(7), -- Hex color for UI
    icon VARCHAR(50), -- Icon name for frontend
    
    -- Crop-specific fields
    is_seasonal BOOLEAN DEFAULT false,
    growing_season VARCHAR(100), -- 'Rabi', 'Kharif', 'Zaid'
    harvest_months INTEGER[], -- Array of month numbers [1,2,3...]
    
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, name, parent_id)
);

-- Units of measurement
CREATE TABLE public.units (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- 'kilogram', 'ton', 'bag', 'sack'
    symbol VARCHAR(10) NOT NULL, -- 'kg', 't', 'bag'
    short_name VARCHAR(20), -- 'kilo', 'ton'
    type VARCHAR(20) DEFAULT 'weight', -- 'weight', 'volume', 'count', 'length'
    
    -- Conversion factors
    base_unit_id UUID REFERENCES public.units(id), -- For unit conversion
    conversion_factor DECIMAL(15,6) DEFAULT 1, -- Multiplier to base unit
    
    -- Display
    precision_digits INTEGER DEFAULT 2,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- =============================================
-- 5. BUSINESS CONTACTS
-- =============================================

-- Suppliers/Vendors
CREATE TABLE public.suppliers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    code VARCHAR(50), -- Supplier code (S001, S002, etc.)
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    
    -- Contact Information
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Pakistan',
    postal_code VARCHAR(20),
    
    -- Business Details
    business_type VARCHAR(100),
    tax_id VARCHAR(50),
    registration_number VARCHAR(100),
    
    -- Financial Terms
    payment_terms VARCHAR(100) DEFAULT 'Cash on Delivery',
    credit_limit DECIMAL(15,2) DEFAULT 0,
    credit_days INTEGER DEFAULT 0,
    
    -- Performance Tracking
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    total_purchases DECIMAL(15,2) DEFAULT 0,
    last_purchase_date DATE,
    
    -- Banking Details
    bank_name VARCHAR(255),
    account_number VARCHAR(50),
    iban VARCHAR(50),
    
    notes TEXT,
    tags TEXT[], -- For categorization
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- Customers
CREATE TABLE public.customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    code VARCHAR(50), -- Customer code (C001, C002, etc.)
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    
    -- Contact Information
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Pakistan',
    postal_code VARCHAR(20),
    
    -- Business Details
    business_type VARCHAR(100),
    tax_id VARCHAR(50),
    registration_number VARCHAR(100),
    
    -- Financial Terms
    payment_terms VARCHAR(100) DEFAULT 'Cash on Delivery',
    credit_limit DECIMAL(15,2) DEFAULT 0,
    credit_days INTEGER DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0, -- Outstanding amount
    
    -- Performance Tracking
    total_sales DECIMAL(15,2) DEFAULT 0,
    last_sale_date DATE,
    
    -- Preferences
    preferred_delivery_time VARCHAR(100),
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    
    notes TEXT,
    tags TEXT[], -- For categorization
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- =============================================
-- 6. PRODUCTS/CROPS INVENTORY
-- =============================================

-- Main products/crops table
CREATE TABLE public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id),
    unit_id UUID REFERENCES public.units(id),
    
    -- Product Identification
    sku VARCHAR(100), -- Stock Keeping Unit
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Crop-specific fields
    variety VARCHAR(100), -- Wheat varieties: 'Punjab-2011', 'Johar-2016'
    grade VARCHAR(50), -- Quality grades: 'A', 'B', 'C', 'Premium'
    quality_parameters JSONB, -- {'moisture': 12, 'purity': 98, 'test_weight': 78}
    origin VARCHAR(100), -- Origin location or farm
    
    -- Pricing (matching frontend pricePerUnit structure)
    base_price DECIMAL(15,2) DEFAULT 0, -- Base price per unit
    current_price DECIMAL(15,2) DEFAULT 0, -- Current selling price
    cost_price DECIMAL(15,2) DEFAULT 0, -- Average cost price
    market_price DECIMAL(15,2), -- Current market rate
    price_per_40kg DECIMAL(15,2), -- Specific to frontend requirement
    
    -- Stock Management (matching frontend stock structure)
    current_stock DECIMAL(15,3) DEFAULT 0, -- Current quantity in stock
    minimum_stock DECIMAL(15,3) DEFAULT 0, -- Reorder point
    maximum_stock DECIMAL(15,3), -- Maximum stock level
    reserved_stock DECIMAL(15,3) DEFAULT 0, -- Reserved for orders
    available_stock DECIMAL(15,3) GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    
    -- Physical Storage
    storage_location VARCHAR(255),
    warehouse_section VARCHAR(100),
    shelf_number VARCHAR(50),
    bin_location VARCHAR(50),
    
    -- Crop-specific attributes
    harvest_date DATE,
    expiry_date DATE,
    shelf_life_days INTEGER, -- Days until expiry
    harvest_season VARCHAR(100), -- 'Rabi 2024', 'Kharif 2024'
    crop_year VARCHAR(10), -- '2024-25'
    
    -- Frontend Integration (matching Crop interface)
    last_traded_at TIMESTAMP WITH TIME ZONE, -- For smart visibility
    is_visible BOOLEAN DEFAULT true, -- Dashboard visibility
    display_order INTEGER DEFAULT 0, -- Sort order on dashboard
    
    -- Media & Documentation
    image_url TEXT,
    images TEXT[], -- Multiple product images
    documents TEXT[], -- Certificates, test reports
    
    -- Tracking & Analytics
    total_purchased DECIMAL(15,3) DEFAULT 0,
    total_sold DECIMAL(15,3) DEFAULT 0,
    turnover_ratio DECIMAL(10,4), -- Stock turnover
    margin_percentage DECIMAL(5,2), -- Profit margin %
    
    -- Status & Metadata
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    tags TEXT[], -- For search and filtering
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, sku)
);

-- Product price history for analytics
CREATE TABLE public.product_price_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    price_type VARCHAR(20) NOT NULL, -- 'base', 'cost', 'market', 'selling'
    price DECIMAL(15,2) NOT NULL,
    price_per_40kg DECIMAL(15,2), -- For frontend compatibility
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reason VARCHAR(255), -- Reason for price change
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 7. TRANSACTIONS & BUSINESS OPERATIONS
-- =============================================

-- Main transactions table (matching frontend Transaction interface)
CREATE TABLE public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    
    -- Transaction Partners
    supplier_id UUID REFERENCES public.suppliers(id), -- For purchases
    customer_id UUID REFERENCES public.customers(id), -- For sales
    
    -- Transaction Details (matching frontend structure)
    transaction_type transaction_type NOT NULL,
    action VARCHAR(10) CHECK (action IN ('buy', 'sell')) NOT NULL, -- Frontend compatibility
    status transaction_status DEFAULT 'confirmed',
    
    -- References
    reference_number VARCHAR(100), -- Invoice/PO number
    batch_number VARCHAR(100),
    
    -- Quantities (matching frontend quantity structure)
    quantity DECIMAL(15,3) NOT NULL, -- in base unit (kg)
    unit_id UUID REFERENCES public.units(id),
    
    -- Pricing (matching frontend rate/total structure)
    rate DECIMAL(15,2) NOT NULL, -- Price per unit (frontend: rate per 40kg)
    unit_price DECIMAL(15,2) NOT NULL, -- Actual price per base unit
    subtotal DECIMAL(15,2) NOT NULL,
    
    -- Financial Details
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL, -- Final amount (matching frontend)
    
    -- Payment Information
    payment_method payment_method,
    payment_status payment_status DEFAULT 'pending',
    paid_amount DECIMAL(15,2) DEFAULT 0,
    balance_amount DECIMAL(15,2) GENERATED ALWAYS AS (total - paid_amount) STORED,
    
    -- Dates
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL, -- matching frontend date
    due_date TIMESTAMP WITH TIME ZONE,
    payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Additional Information (matching frontend structure)
    party_name VARCHAR(255) NOT NULL, -- Frontend compatibility (supplier/customer name)
    notes TEXT, -- Frontend notes field
    internal_notes TEXT, -- Internal staff notes
    
    -- Quality & Compliance
    quality_check_passed BOOLEAN DEFAULT true,
    quality_notes TEXT,
    certificates TEXT[], -- Quality certificates
    
    -- Logistics
    vehicle_number VARCHAR(50),
    driver_name VARCHAR(255),
    driver_phone VARCHAR(20),
    delivery_address TEXT,
    delivery_date TIMESTAMP WITH TIME ZONE,
    freight_charges DECIMAL(15,2) DEFAULT 0,
    
    -- Document Management
    attachments TEXT[], -- Invoice, receipts, photos
    invoice_url TEXT,
    receipt_url TEXT,
    
    -- Audit Trail
    created_by UUID REFERENCES public.profiles(id),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detailed stock movements (for audit trail)
CREATE TABLE public.stock_movements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    
    -- Movement Details
    movement_type movement_type NOT NULL,
    quantity_before DECIMAL(15,3) NOT NULL,
    quantity_change DECIMAL(15,3) NOT NULL, -- Positive for IN, Negative for OUT
    quantity_after DECIMAL(15,3) NOT NULL,
    
    -- Cost Tracking
    unit_cost DECIMAL(15,2),
    total_cost DECIMAL(15,2),
    
    -- Location & Batch
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    expiry_date DATE,
    
    -- Additional Details
    reason VARCHAR(255),
    reference_document VARCHAR(255),
    notes TEXT,
    
    -- Audit
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 8. FINANCIAL MANAGEMENT & LEDGER
-- =============================================

-- Chart of Accounts
CREATE TABLE public.accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
    parent_id UUID REFERENCES public.accounts(id),
    
    -- Account Properties
    is_system_account BOOLEAN DEFAULT false,
    is_cash_account BOOLEAN DEFAULT false,
    is_bank_account BOOLEAN DEFAULT false,
    
    -- Banking Details (for bank accounts)
    bank_name VARCHAR(255),
    account_number VARCHAR(50),
    iban VARCHAR(50),
    branch VARCHAR(255),
    
    current_balance DECIMAL(15,2) DEFAULT 0,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- Journal entries for double-entry bookkeeping
CREATE TABLE public.journal_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    
    -- Entry Details
    entry_number VARCHAR(100),
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Reference
    reference_type VARCHAR(50), -- 'transaction', 'adjustment', 'opening'
    reference_id UUID,
    
    entry_date DATE NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Party ledger (Customer/Supplier account statements)
CREATE TABLE public.party_ledger (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    
    -- Party Information
    party_type VARCHAR(20) CHECK (party_type IN ('supplier', 'customer')),
    party_id UUID, -- References suppliers.id or customers.id
    party_name VARCHAR(255) NOT NULL, -- Denormalized for performance
    
    -- Ledger Entry
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0, -- Money owed TO party
    credit_amount DECIMAL(15,2) DEFAULT 0, -- Money owed BY party
    balance DECIMAL(15,2) DEFAULT 0, -- Running balance
    
    entry_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 9. ANALYTICS & REPORTING
-- =============================================

-- Dashboard metrics cache (for performance)
CREATE TABLE public.dashboard_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    
    -- Daily metrics
    total_sales DECIMAL(15,2) DEFAULT 0,
    total_purchases DECIMAL(15,2) DEFAULT 0,
    total_profit DECIMAL(15,2) DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    
    -- Inventory metrics
    total_stock_value DECIMAL(15,2) DEFAULT 0,
    low_stock_items INTEGER DEFAULT 0,
    out_of_stock_items INTEGER DEFAULT 0,
    
    -- Financial metrics
    cash_balance DECIMAL(15,2) DEFAULT 0,
    receivables DECIMAL(15,2) DEFAULT 0,
    payables DECIMAL(15,2) DEFAULT 0,
    
    -- Product-wise metrics (JSONB for flexibility)
    product_metrics JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, metric_date)
);

-- Crop analytics (specific to agricultural business)
CREATE TABLE public.crop_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    analysis_period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'seasonal'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Volume Analytics
    total_purchased DECIMAL(15,3) DEFAULT 0,
    total_sold DECIMAL(15,3) DEFAULT 0,
    average_purchase_price DECIMAL(15,2) DEFAULT 0,
    average_selling_price DECIMAL(15,2) DEFAULT 0,
    
    -- Financial Analytics (matching frontend profit calculations)
    total_purchase_value DECIMAL(15,2) DEFAULT 0,
    total_sales_value DECIMAL(15,2) DEFAULT 0,
    gross_profit DECIMAL(15,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,
    
    -- Market Analytics
    market_price_high DECIMAL(15,2),
    market_price_low DECIMAL(15,2),
    market_price_average DECIMAL(15,2),
    
    -- Performance Indicators
    stock_turnover DECIMAL(10,4),
    days_in_inventory DECIMAL(10,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, product_id, analysis_period, period_start, period_end)
);

-- Saved reports
CREATE TABLE public.reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type report_type NOT NULL,
    
    -- Report Configuration
    parameters JSONB DEFAULT '{}', -- Filters, date ranges, etc.
    schedule JSONB, -- For automated reports
    
    -- Generated Files
    file_url TEXT,
    file_size BIGINT,
    file_format VARCHAR(20), -- 'pdf', 'xlsx', 'csv'
    
    -- Sharing & Access
    is_public BOOLEAN DEFAULT false,
    shared_users UUID[], -- Array of user IDs with access
    
    generated_by UUID REFERENCES public.profiles(id),
    generated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 10. SYSTEM & OPERATIONAL TABLES
-- =============================================

-- Activity logs for audit trail
CREATE TABLE public.activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Activity Details
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', etc.
    entity_type VARCHAR(100), -- 'transaction', 'product', 'customer', etc.
    entity_id UUID,
    entity_name VARCHAR(255), -- For easier querying
    
    -- Change Tracking
    old_values JSONB,
    new_values JSONB,
    changes_summary TEXT, -- Human-readable summary
    
    -- Request Details
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    
    -- Context
    module VARCHAR(100), -- 'inventory', 'transactions', 'reports'
    severity VARCHAR(20) DEFAULT 'info', -- 'low', 'medium', 'high', 'critical'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications system
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Notification Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    
    -- Targeting
    target_url TEXT, -- Frontend route to navigate to
    action_button_text VARCHAR(100),
    action_url TEXT,
    
    -- Related Entity
    entity_type VARCHAR(100),
    entity_id UUID,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings and configurations
CREATE TABLE public.settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'general', 'inventory', 'financial', 'notifications'
    key VARCHAR(255) NOT NULL,
    value JSONB,
    data_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'object', 'array'
    
    -- Metadata
    name VARCHAR(255),
    description TEXT,
    is_editable BOOLEAN DEFAULT true,
    is_sensitive BOOLEAN DEFAULT false, -- For password, keys, etc.
    
    -- Validation
    validation_rules JSONB, -- Min/max values, regex patterns, etc.
    default_value JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, category, key)
);

-- File attachments (centralized file management)
CREATE TABLE public.attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- File Details
    original_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL, -- Stored filename
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_hash VARCHAR(255), -- For duplicate detection
    
    -- Classification
    category VARCHAR(100), -- 'invoice', 'receipt', 'certificate', 'product_image'
    tags TEXT[],
    
    -- Relationships
    entity_type VARCHAR(100), -- 'transaction', 'product', 'supplier', etc.
    entity_id UUID,
    
    -- Access Control
    is_public BOOLEAN DEFAULT false,
    is_temporary BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 11. PERFORMANCE INDEXES
-- =============================================

-- Authentication & Users
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_company_name ON public.profiles(company_name);
CREATE INDEX idx_user_companies_user_active ON public.user_companies(user_id, is_active);
CREATE INDEX idx_user_companies_company_role ON public.user_companies(company_id, role);

-- Products & Inventory
CREATE INDEX idx_products_company_active ON public.products(company_id, is_active);
CREATE INDEX idx_products_company_visible ON public.products(company_id, is_visible);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_stock_levels ON public.products(company_id, current_stock, minimum_stock);
CREATE INDEX idx_products_last_traded ON public.products(company_id, last_traded_at DESC);
CREATE INDEX idx_products_name_search ON public.products USING gin(to_tsvector('english', name));

-- Transactions (Critical for performance)
CREATE INDEX idx_transactions_company_date ON public.transactions(company_id, transaction_date DESC);
CREATE INDEX idx_transactions_company_action ON public.transactions(company_id, action);
CREATE INDEX idx_transactions_product_date ON public.transactions(product_id, transaction_date DESC);
CREATE INDEX idx_transactions_party_name ON public.transactions(company_id, party_name);
CREATE INDEX idx_transactions_status ON public.transactions(company_id, status);
CREATE INDEX idx_transactions_action_date ON public.transactions(action, transaction_date DESC);

-- Stock Movements
CREATE INDEX idx_stock_movements_product_date ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX idx_stock_movements_company_date ON public.stock_movements(company_id, created_at DESC);
CREATE INDEX idx_stock_movements_movement_type ON public.stock_movements(company_id, movement_type);

-- Financial
CREATE INDEX idx_party_ledger_party ON public.party_ledger(company_id, party_type, party_id, entry_date DESC);
CREATE INDEX idx_party_ledger_date ON public.party_ledger(company_id, entry_date DESC);
CREATE INDEX idx_journal_entries_account_date ON public.journal_entries(account_id, entry_date DESC);

-- Analytics & Reporting
CREATE INDEX idx_dashboard_metrics_company_date ON public.dashboard_metrics(company_id, metric_date DESC);
CREATE INDEX idx_crop_analytics_product_period ON public.crop_analytics(product_id, analysis_period, period_start DESC);
CREATE INDEX idx_crop_analytics_company_period ON public.crop_analytics(company_id, analysis_period, period_start DESC);

-- System Tables
CREATE INDEX idx_activity_logs_company_date ON public.activity_logs(company_id, created_at DESC);
CREATE INDEX idx_activity_logs_user_action ON public.activity_logs(user_id, action, created_at DESC);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_company_type ON public.notifications(company_id, type, created_at DESC);

-- Text search indexes
CREATE INDEX idx_suppliers_search ON public.suppliers USING gin(to_tsvector('english', name || ' ' || COALESCE(contact_person, '')));
CREATE INDEX idx_customers_search ON public.customers USING gin(to_tsvector('english', name || ' ' || COALESCE(contact_person, '')));
CREATE INDEX idx_transactions_search ON public.transactions USING gin(to_tsvector('english', party_name || ' ' || COALESCE(reference_number, '') || ' ' || COALESCE(notes, '')));

-- =============================================
-- 12. TRIGGERS & FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update product stock after transaction
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update product stock based on transaction action
        IF NEW.action = 'buy' THEN
            UPDATE public.products 
            SET current_stock = current_stock + NEW.quantity,
                last_traded_at = NEW.transaction_date,
                total_purchased = total_purchased + NEW.quantity
            WHERE id = NEW.product_id;
        ELSIF NEW.action = 'sell' THEN
            UPDATE public.products 
            SET current_stock = current_stock - NEW.quantity,
                last_traded_at = NEW.transaction_date,
                total_sold = total_sold + NEW.quantity
            WHERE id = NEW.product_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

-- Function to create stock movement record
CREATE OR REPLACE FUNCTION create_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    stock_before DECIMAL(15,3);
    movement_type_val movement_type;
BEGIN
    -- Get current stock before transaction
    SELECT current_stock INTO stock_before 
    FROM public.products 
    WHERE id = NEW.product_id;
    
    -- Determine movement type
    IF NEW.action = 'buy' THEN
        movement_type_val := 'in';
    ELSIF NEW.action = 'sell' THEN
        movement_type_val := 'out';
    ELSE
        movement_type_val := 'adjustment';
    END IF;
    
    -- Create stock movement record
    INSERT INTO public.stock_movements (
        company_id,
        product_id,
        transaction_id,
        movement_type,
        quantity_before,
        quantity_change,
        quantity_after,
        unit_cost,
        total_cost,
        reason,
        created_by
    ) VALUES (
        NEW.company_id,
        NEW.product_id,
        NEW.id,
        movement_type_val,
        stock_before,
        CASE WHEN NEW.action = 'buy' THEN NEW.quantity ELSE -NEW.quantity END,
        CASE WHEN NEW.action = 'buy' THEN stock_before + NEW.quantity ELSE stock_before - NEW.quantity END,
        NEW.unit_price,
        NEW.total,
        'Transaction: ' || NEW.action || ' - ' || NEW.reference_number,
        NEW.created_by
    );
    
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Function to update party ledger
CREATE OR REPLACE FUNCTION update_party_ledger()
RETURNS TRIGGER AS $$
DECLARE
    party_type_val VARCHAR(20);
    party_id_val UUID;
    debit_amt DECIMAL(15,2) := 0;
    credit_amt DECIMAL(15,2) := 0;
    current_balance DECIMAL(15,2) := 0;
BEGIN
    -- Determine party type and amounts
    IF NEW.action = 'buy' AND NEW.supplier_id IS NOT NULL THEN
        party_type_val := 'supplier';
        party_id_val := NEW.supplier_id;
        credit_amt := NEW.total; -- We owe supplier money
    ELSIF NEW.action = 'sell' AND NEW.customer_id IS NOT NULL THEN
        party_type_val := 'customer';
        party_id_val := NEW.customer_id;
        debit_amt := NEW.total; -- Customer owes us money
    ELSE
        RETURN NEW; -- No party ledger update needed
    END IF;
    
    -- Get current balance
    SELECT COALESCE(SUM(debit_amount - credit_amount), 0) INTO current_balance
    FROM public.party_ledger
    WHERE company_id = NEW.company_id
    AND party_type = party_type_val
    AND party_id = party_id_val;
    
    -- Insert ledger entry
    INSERT INTO public.party_ledger (
        company_id,
        transaction_id,
        party_type,
        party_id,
        party_name,
        description,
        debit_amount,
        credit_amount,
        balance,
        entry_date
    ) VALUES (
        NEW.company_id,
        NEW.id,
        party_type_val,
        party_id_val,
        NEW.party_name,
        'Transaction: ' || UPPER(NEW.action) || ' - ' || COALESCE(NEW.reference_number, NEW.id::text),
        debit_amt,
        credit_amt,
        current_balance + debit_amt - credit_amt,
        NEW.transaction_date::date
    );
    
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Function to update dashboard metrics
CREATE OR REPLACE FUNCTION update_dashboard_metrics()
RETURNS TRIGGER AS $$
DECLARE
    metric_date DATE;
BEGIN
    metric_date := NEW.transaction_date::date;
    
    -- Upsert daily metrics
    INSERT INTO public.dashboard_metrics (
        company_id,
        metric_date,
        total_sales,
        total_purchases,
        total_profit,
        total_transactions
    ) VALUES (
        NEW.company_id,
        metric_date,
        CASE WHEN NEW.action = 'sell' THEN NEW.total ELSE 0 END,
        CASE WHEN NEW.action = 'buy' THEN NEW.total ELSE 0 END,
        CASE WHEN NEW.action = 'sell' THEN NEW.total * 0.2 ELSE 0 END, -- Estimated 20% profit
        1
    )
    ON CONFLICT (company_id, metric_date)
    DO UPDATE SET
        total_sales = dashboard_metrics.total_sales + CASE WHEN NEW.action = 'sell' THEN NEW.total ELSE 0 END,
        total_purchases = dashboard_metrics.total_purchases + CASE WHEN NEW.action = 'buy' THEN NEW.total ELSE 0 END,
        total_transactions = dashboard_metrics.total_transactions + 1;
    
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply business logic triggers
CREATE TRIGGER trigger_update_product_stock AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_product_stock();
CREATE TRIGGER trigger_create_stock_movement AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION create_stock_movement();
CREATE TRIGGER trigger_update_party_ledger AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_party_ledger();
CREATE TRIGGER trigger_update_dashboard_metrics AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_dashboard_metrics();

-- =============================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's companies
CREATE OR REPLACE FUNCTION get_user_companies(user_uuid UUID)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT company_id 
        FROM public.user_companies 
        WHERE user_id = user_uuid AND is_active = true
    );
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER;

-- Profile policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Company policies
CREATE POLICY "Users can view their companies" ON public.companies FOR SELECT 
USING (id = ANY(get_user_companies(auth.uid())));

CREATE POLICY "Admins can update their companies" ON public.companies FOR UPDATE 
USING (
    id = ANY(get_user_companies(auth.uid())) AND 
    EXISTS (
        SELECT 1 FROM public.user_companies 
        WHERE user_id = auth.uid() AND company_id = companies.id AND role IN ('admin', 'manager')
    )
);

-- User-Company relationship policies
CREATE POLICY "Users can view their company relationships" ON public.user_companies FOR SELECT 
USING (user_id = auth.uid());

-- Product policies
CREATE POLICY "Users can view company products" ON public.products FOR SELECT 
USING (company_id = ANY(get_user_companies(auth.uid())));

CREATE POLICY "Users can manage company products" ON public.products FOR ALL 
USING (company_id = ANY(get_user_companies(auth.uid())));

-- Transaction policies
CREATE POLICY "Users can view company transactions" ON public.transactions FOR SELECT 
USING (company_id = ANY(get_user_companies(auth.uid())));

CREATE POLICY "Users can create company transactions" ON public.transactions FOR INSERT 
WITH CHECK (company_id = ANY(get_user_companies(auth.uid())));

CREATE POLICY "Users can update company transactions" ON public.transactions FOR UPDATE 
USING (company_id = ANY(get_user_companies(auth.uid())));

-- Apply similar policies to other tables...
-- (For brevity, showing pattern - all other tables should follow similar company-based access)

-- Notification policies
CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE 
USING (user_id = auth.uid());

-- =============================================
-- 14. SAMPLE DATA INSERTION
-- =============================================

-- Insert default units
INSERT INTO public.units (id, company_id, name, symbol, short_name, type) VALUES
(uuid_generate_v4(), null, 'Kilogram', 'kg', 'kilo', 'weight'),
(uuid_generate_v4(), null, 'Gram', 'g', 'gram', 'weight'),
(uuid_generate_v4(), null, 'Ton', 't', 'ton', 'weight'),
(uuid_generate_v4(), null, 'Bag', 'bag', 'bag', 'count'),
(uuid_generate_v4(), null, 'Sack', 'sack', 'sack', 'count'),
(uuid_generate_v4(), null, 'Maund', 'maund', 'maund', 'weight'),
(uuid_generate_v4(), null, 'Quintal', 'quintal', 'quintal', 'weight');

-- Create function to initialize company data
CREATE OR REPLACE FUNCTION initialize_company_data(company_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Create default categories
    INSERT INTO public.categories (company_id, name, description, is_seasonal, growing_season) VALUES
    (company_uuid, 'Wheat', 'Wheat and wheat varieties', true, 'Rabi'),
    (company_uuid, 'Rice', 'Rice and rice varieties', true, 'Kharif'),
    (company_uuid, 'Corn', 'Corn and maize varieties', true, 'Kharif'),
    (company_uuid, 'Barley', 'Barley varieties', true, 'Rabi'),
    (company_uuid, 'Cotton', 'Cotton crop', true, 'Kharif'),
    (company_uuid, 'Sugarcane', 'Sugarcane crop', true, 'Annual'),
    (company_uuid, 'Pulses', 'Lentils, chickpeas, etc.', true, 'Rabi'),
    (company_uuid, 'Oilseeds', 'Sunflower, canola, etc.', true, 'Both');
    
    -- Create default accounts
    INSERT INTO public.accounts (company_id, code, name, account_type) VALUES
    (company_uuid, '1000', 'Assets', 'asset'),
    (company_uuid, '1100', 'Current Assets', 'asset'),
    (company_uuid, '1110', 'Cash', 'asset'),
    (company_uuid, '1120', 'Bank Account', 'asset'),
    (company_uuid, '1200', 'Inventory', 'asset'),
    (company_uuid, '2000', 'Liabilities', 'liability'),
    (company_uuid, '2100', 'Accounts Payable', 'liability'),
    (company_uuid, '2200', 'Accounts Receivable', 'asset'),
    (company_uuid, '3000', 'Equity', 'equity'),
    (company_uuid, '4000', 'Revenue', 'revenue'),
    (company_uuid, '4100', 'Sales Revenue', 'revenue'),
    (company_uuid, '5000', 'Expenses', 'expense'),
    (company_uuid, '5100', 'Cost of Goods Sold', 'expense'),
    (company_uuid, '5200', 'Operating Expenses', 'expense');
    
    -- Create default settings
    INSERT INTO public.settings (company_id, category, key, value, name, description) VALUES
    (company_uuid, 'general', 'business_name', '"My Agriculture Business"', 'Business Name', 'Company display name'),
    (company_uuid, 'general', 'currency', '"PKR"', 'Currency', 'Base currency for transactions'),
    (company_uuid, 'general', 'timezone', '"Asia/Karachi"', 'Timezone', 'Business timezone'),
    (company_uuid, 'inventory', 'low_stock_threshold', '10', 'Low Stock Threshold', 'Default minimum stock level'),
    (company_uuid, 'inventory', 'auto_reorder', 'false', 'Auto Reorder', 'Automatically create purchase orders'),
    (company_uuid, 'dashboard', 'visible_crops_count', '5', 'Visible Crops Count', 'Number of crops to show on dashboard'),
    (company_uuid, 'financial', 'default_profit_margin', '20', 'Default Profit Margin %', 'Default profit margin for pricing'),
    (company_uuid, 'notifications', 'low_stock_alerts', 'true', 'Low Stock Alerts', 'Send notifications for low stock'),
    (company_uuid, 'notifications', 'transaction_alerts', 'true', 'Transaction Alerts', 'Send notifications for new transactions');
    
END;
$$ LANGUAGE 'plpgsql';

-- =============================================
-- 15. VIEWS FOR COMMON QUERIES
-- =============================================

-- Product inventory summary view
CREATE VIEW product_inventory_summary AS
SELECT 
    p.id,
    p.company_id,
    p.name,
    p.sku,
    p.current_stock,
    p.minimum_stock,
    p.current_price,
    p.cost_price,
    c.name as category_name,
    u.symbol as unit_symbol,
    CASE 
        WHEN p.current_stock <= 0 THEN 'Out of Stock'
        WHEN p.current_stock <= p.minimum_stock THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status,
    p.current_stock * p.cost_price as inventory_value,
    p.last_traded_at,
    p.is_visible
FROM public.products p
LEFT JOIN public.categories c ON p.category_id = c.id
LEFT JOIN public.units u ON p.unit_id = u.id
WHERE p.is_active = true;

-- Transaction summary view (matching frontend structure)
CREATE VIEW transaction_summary AS
SELECT 
    t.id,
    t.company_id,
    t.product_id,
    p.name as crop_name,
    t.action,
    t.quantity,
    t.rate,
    t.total,
    t.party_name,
    t.transaction_date as date,
    t.notes,
    t.status,
    t.payment_status,
    CASE 
        WHEN t.action = 'sell' THEN t.total - (t.quantity * p.cost_price)
        ELSE 0
    END as estimated_profit
FROM public.transactions t
JOIN public.products p ON t.product_id = p.id
WHERE t.status = 'confirmed';

-- Daily analytics view
CREATE VIEW daily_analytics AS
SELECT 
    company_id,
    transaction_date::date as date,
    action,
    COUNT(*) as transaction_count,
    SUM(quantity) as total_quantity,
    SUM(total) as total_amount,
    AVG(rate) as average_rate
FROM public.transactions
WHERE status = 'confirmed'
GROUP BY company_id, transaction_date::date, action;

-- Party ledger balance view
CREATE VIEW party_balances AS
SELECT 
    company_id,
    party_type,
    party_id,
    party_name,
    SUM(debit_amount - credit_amount) as balance,
    MAX(entry_date) as last_transaction_date
FROM public.party_ledger
GROUP BY company_id, party_type, party_id, party_name;

-- =============================================
-- 16. COMMENTS & DOCUMENTATION
-- =============================================

COMMENT ON DATABASE "business_inventory" IS 'Comprehensive business inventory management system designed for agricultural and commodity trading businesses';

COMMENT ON TABLE public.profiles IS 'Extended user profiles with business-specific information';
COMMENT ON TABLE public.companies IS 'Multi-tenant company/organization data with business settings';
COMMENT ON TABLE public.products IS 'Products/crops inventory with agricultural business features';
COMMENT ON TABLE public.transactions IS 'All business transactions (buy/sell) with complete audit trail';
COMMENT ON TABLE public.stock_movements IS 'Detailed stock movement tracking for inventory accuracy';
COMMENT ON TABLE public.party_ledger IS 'Customer and supplier account statements';
COMMENT ON TABLE public.dashboard_metrics IS 'Cached daily metrics for dashboard performance';
COMMENT ON TABLE public.crop_analytics IS 'Agricultural-specific analytics and reporting';

-- Column comments for key fields
COMMENT ON COLUMN public.products.price_per_40kg IS 'Price per 40kg bag - specific to frontend requirement';
COMMENT ON COLUMN public.products.last_traded_at IS 'Last transaction date for smart dashboard visibility';
COMMENT ON COLUMN public.products.is_visible IS 'Dashboard visibility flag for frontend';
COMMENT ON COLUMN public.transactions.action IS 'Frontend compatibility field (buy/sell)';
COMMENT ON COLUMN public.transactions.party_name IS 'Supplier/customer name for frontend compatibility';
COMMENT ON COLUMN public.transactions.rate IS 'Price per unit matching frontend structure';

-- =============================================
-- END OF SCHEMA
-- =============================================
