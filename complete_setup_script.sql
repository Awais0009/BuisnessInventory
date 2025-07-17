-- =============================================
-- COMPREHENSIVE DATABASE SETUP SCRIPT
-- Complete initialization for Business Inventory System
-- =============================================

-- This script combines all the necessary components:
-- 1. Main database schema
-- 2. Row Level Security policies
-- 3. Sample data insertion
-- 4. Frontend integration setup

-- ============= ================================
-- STEP 1: RUN THE MAIN SCHEMA
-- =============================================

-- First, execute the comprehensive_database_schema.sql file
-- This creates all tables, enums, functions, triggers, and indexes

\i 'comprehensive_database_schema.sql';

-- =============================================
-- STEP 2: APPLY RLS POLICIES
-- =============================================

-- Execute the RLS policies file
\i 'comprehensive_rls_policies.sql';

-- =============================================
-- STEP 3: INITIALIZE SAMPLE DATA
-- =============================================

-- Create sample units (global, available to all companies)
DO $$
DECLARE
    kg_unit_id UUID := uuid_generate_v4();
    gram_unit_id UUID := uuid_generate_v4();
    ton_unit_id UUID := uuid_generate_v4();
    bag_unit_id UUID := uuid_generate_v4();
    sack_unit_id UUID := uuid_generate_v4();
    maund_unit_id UUID := uuid_generate_v4();
    quintal_unit_id UUID := uuid_generate_v4();
BEGIN
    -- Insert units with specific IDs for reference
    INSERT INTO public.units (id, company_id, name, symbol, short_name, type, conversion_factor, precision_digits) VALUES
    (kg_unit_id, NULL, 'Kilogram', 'kg', 'kilo', 'weight', 1.0, 2),
    (gram_unit_id, NULL, 'Gram', 'g', 'gram', 'weight', 0.001, 0),
    (ton_unit_id, NULL, 'Ton', 't', 'ton', 'weight', 1000.0, 2),
    (bag_unit_id, NULL, 'Bag (40kg)', 'bag', 'bag', 'count', 40.0, 0),
    (sack_unit_id, NULL, 'Sack (50kg)', 'sack', 'sack', 'count', 50.0, 0),
    (maund_unit_id, NULL, 'Maund', 'maund', 'maund', 'weight', 37.3242, 2),
    (quintal_unit_id, NULL, 'Quintal', 'quintal', 'quintal', 'weight', 100.0, 2);
    
    -- Store the kg unit ID for default use
    UPDATE public.units SET base_unit_id = kg_unit_id WHERE id != kg_unit_id;
    
    RAISE NOTICE 'Sample units created successfully';
END $$;

-- =============================================
-- STEP 4: CREATE INITIALIZATION FUNCTION FOR NEW COMPANIES
-- =============================================

CREATE OR REPLACE FUNCTION setup_new_company(
    company_name TEXT,
    user_email TEXT DEFAULT NULL,
    business_type TEXT DEFAULT 'agriculture'
)
RETURNS UUID AS $$
DECLARE
    new_company_id UUID;
    user_id UUID;
    kg_unit_id UUID;
    bag_unit_id UUID;
    
    -- Category IDs
    wheat_cat_id UUID := uuid_generate_v4();
    rice_cat_id UUID := uuid_generate_v4();
    corn_cat_id UUID := uuid_generate_v4();
    pulses_cat_id UUID := uuid_generate_v4();
    oilseeds_cat_id UUID := uuid_generate_v4();
    
    -- Account IDs
    assets_acc_id UUID := uuid_generate_v4();
    cash_acc_id UUID := uuid_generate_v4();
    bank_acc_id UUID := uuid_generate_v4();
    inventory_acc_id UUID := uuid_generate_v4();
    revenue_acc_id UUID := uuid_generate_v4();
    cogs_acc_id UUID := uuid_generate_v4();
BEGIN
    -- Get or find user
    IF user_email IS NOT NULL THEN
        SELECT id INTO user_id FROM auth.users WHERE email = user_email;
        IF user_id IS NULL THEN
            RAISE EXCEPTION 'User with email % not found', user_email;
        END IF;
    ELSE
        -- Use current authenticated user
        user_id := auth.uid();
        IF user_id IS NULL THEN
            RAISE EXCEPTION 'No authenticated user found';
        END IF;
    END IF;
    
    -- Get default unit IDs
    SELECT id INTO kg_unit_id FROM public.units WHERE symbol = 'kg' AND company_id IS NULL;
    SELECT id INTO bag_unit_id FROM public.units WHERE symbol = 'bag' AND company_id IS NULL;
    
    -- Create company
    INSERT INTO public.companies (
        id,
        name,
        business_type,
        base_currency,
        financial_year_start,
        primary_color,
        settings,
        created_by
    ) VALUES (
        uuid_generate_v4(),
        company_name,
        business_type,
        'PKR',
        CURRENT_DATE,
        '#16A34A',
        '{"dashboard_visible_crops": 5, "default_profit_margin": 20}',
        user_id
    ) RETURNING id INTO new_company_id;
    
    -- Create user-company relationship
    INSERT INTO public.user_companies (
        user_id,
        company_id,
        role,
        is_default,
        is_active
    ) VALUES (
        user_id,
        new_company_id,
        'admin',
        true,
        true
    );
    
    -- Create default categories
    INSERT INTO public.categories (id, company_id, name, description, is_seasonal, growing_season, harvest_months, sort_order, color, created_by) VALUES
    (wheat_cat_id, new_company_id, 'Wheat', 'Wheat and wheat varieties', true, 'Rabi', ARRAY[4,5,6], 1, '#F59E0B', user_id),
    (rice_cat_id, new_company_id, 'Rice', 'Rice and rice varieties', true, 'Kharif', ARRAY[10,11,12], 2, '#10B981', user_id),
    (corn_cat_id, new_company_id, 'Corn', 'Corn and maize varieties', true, 'Kharif', ARRAY[9,10,11], 3, '#F97316', user_id),
    (pulses_cat_id, new_company_id, 'Pulses', 'Lentils, chickpeas, beans', true, 'Rabi', ARRAY[3,4,5], 4, '#8B5CF6', user_id),
    (oilseeds_cat_id, new_company_id, 'Oilseeds', 'Sunflower, canola, mustard', true, 'Both', ARRAY[3,4,5,10,11], 5, '#EF4444', user_id);
    
    -- Create default chart of accounts
    INSERT INTO public.accounts (id, company_id, code, name, account_type, created_by) VALUES
    (assets_acc_id, new_company_id, '1000', 'Assets', 'asset', user_id),
    (uuid_generate_v4(), new_company_id, '1100', 'Current Assets', 'asset', user_id),
    (cash_acc_id, new_company_id, '1110', 'Cash', 'asset', user_id),
    (bank_acc_id, new_company_id, '1120', 'Bank Account', 'asset', user_id),
    (inventory_acc_id, new_company_id, '1200', 'Inventory', 'asset', user_id),
    (uuid_generate_v4(), new_company_id, '1300', 'Accounts Receivable', 'asset', user_id),
    (uuid_generate_v4(), new_company_id, '2000', 'Liabilities', 'liability', user_id),
    (uuid_generate_v4(), new_company_id, '2100', 'Accounts Payable', 'liability', user_id),
    (uuid_generate_v4(), new_company_id, '3000', 'Equity', 'equity', user_id),
    (uuid_generate_v4(), new_company_id, '3100', 'Owner Equity', 'equity', user_id),
    (revenue_acc_id, new_company_id, '4000', 'Revenue', 'revenue', user_id),
    (uuid_generate_v4(), new_company_id, '4100', 'Sales Revenue', 'revenue', user_id),
    (uuid_generate_v4(), new_company_id, '5000', 'Expenses', 'expense', user_id),
    (cogs_acc_id, new_company_id, '5100', 'Cost of Goods Sold', 'expense', user_id),
    (uuid_generate_v4(), new_company_id, '5200', 'Operating Expenses', 'expense', user_id);
    
    -- Create default settings
    INSERT INTO public.settings (company_id, category, key, value, name, description) VALUES
    (new_company_id, 'general', 'business_name', to_jsonb(company_name), 'Business Name', 'Company display name'),
    (new_company_id, 'general', 'currency', '"PKR"', 'Currency', 'Base currency for transactions'),
    (new_company_id, 'general', 'timezone', '"Asia/Karachi"', 'Timezone', 'Business timezone'),
    (new_company_id, 'general', 'language', '"en"', 'Language', 'Default language'),
    (new_company_id, 'inventory', 'low_stock_threshold', '10', 'Low Stock Threshold', 'Default minimum stock level'),
    (new_company_id, 'inventory', 'auto_reorder', 'false', 'Auto Reorder', 'Automatically create purchase orders'),
    (new_company_id, 'inventory', 'default_unit', to_jsonb(kg_unit_id), 'Default Unit', 'Default unit for new products'),
    (new_company_id, 'dashboard', 'visible_crops_count', '5', 'Visible Crops Count', 'Number of crops to show on dashboard'),
    (new_company_id, 'dashboard', 'refresh_interval', '30', 'Dashboard Refresh (seconds)', 'How often to refresh dashboard data'),
    (new_company_id, 'financial', 'default_profit_margin', '20', 'Default Profit Margin %', 'Default profit margin for pricing'),
    (new_company_id, 'financial', 'tax_rate', '17', 'Default Tax Rate %', 'Default tax percentage'),
    (new_company_id, 'notifications', 'low_stock_alerts', 'true', 'Low Stock Alerts', 'Send notifications for low stock'),
    (new_company_id, 'notifications', 'transaction_alerts', 'true', 'Transaction Alerts', 'Send notifications for new transactions'),
    (new_company_id, 'notifications', 'email_notifications', 'true', 'Email Notifications', 'Send email notifications'),
    (new_company_id, 'reports', 'auto_backup', 'false', 'Auto Backup', 'Automatically backup data'),
    (new_company_id, 'reports', 'data_retention_days', '365', 'Data Retention (days)', 'How long to keep transaction data');
    
    -- Create sample products (optional)
    INSERT INTO public.products (
        company_id, category_id, unit_id, name, sku, variety, grade,
        price_per_40kg, current_price, base_price, cost_price,
        current_stock, minimum_stock, maximum_stock,
        storage_location, harvest_season, crop_year,
        last_traded_at, is_visible, is_active, created_by
    ) VALUES 
    (new_company_id, wheat_cat_id, kg_unit_id, 'Wheat', 'WHT-001', 'Punjab-2011', 'A', 3200, 3200, 3000, 2800, 500, 50, 1000, 'Warehouse A', 'Rabi 2024', '2024-25', NOW(), true, true, user_id),
    (new_company_id, rice_cat_id, kg_unit_id, 'Basmati Rice', 'RICE-001', 'Basmati-385', 'Super', 8000, 8000, 7500, 7200, 300, 30, 800, 'Warehouse B', 'Kharif 2024', '2024-25', NOW(), true, true, user_id),
    (new_company_id, corn_cat_id, kg_unit_id, 'Corn', 'CORN-001', 'Hybrid', 'A', 2800, 2800, 2600, 2400, 750, 75, 1500, 'Warehouse A', 'Kharif 2024', '2024-25', NOW(), true, true, user_id),
    (new_company_id, pulses_cat_id, kg_unit_id, 'Chickpeas', 'CHICK-001', 'Desi', 'Premium', 12000, 12000, 11500, 11000, 200, 20, 500, 'Warehouse C', 'Rabi 2024', '2024-25', NOW(), true, true, user_id),
    (new_company_id, oilseeds_cat_id, kg_unit_id, 'Sunflower', 'SUN-001', 'Hybrid', 'A', 6500, 6500, 6200, 6000, 400, 40, 800, 'Warehouse B', 'Kharif 2024', '2024-25', NOW(), true, true, user_id);
    
    -- Create initial dashboard metrics
    INSERT INTO public.dashboard_metrics (
        company_id, metric_date,
        total_sales, total_purchases, total_profit, total_transactions,
        total_stock_value, low_stock_items, out_of_stock_items
    ) VALUES (
        new_company_id, CURRENT_DATE,
        0, 0, 0, 0,
        (SELECT SUM(current_stock * cost_price) FROM public.products WHERE company_id = new_company_id),
        0, 0
    );
    
    -- Create welcome notification
    INSERT INTO public.notifications (
        user_id, company_id, title, message, type, target_url
    ) VALUES (
        user_id, new_company_id,
        'Welcome to Business Inventory!',
        'Your company has been set up successfully. Start by adding your first transaction or updating your inventory.',
        'success',
        '/dashboard'
    );
    
    RAISE NOTICE 'Company % created successfully with ID: %', company_name, new_company_id;
    RETURN new_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 5: CREATE SAMPLE COMPANY AND USER SETUP
-- =============================================

-- Example: Create a test company (uncomment and modify as needed)
/*
DO $$
DECLARE
    company_id UUID;
BEGIN
    -- Replace 'your-email@example.com' with the actual user email
    company_id := setup_new_company(
        'Sample Agriculture Business',
        'your-email@example.com', -- Replace with actual email
        'agriculture'
    );
    
    RAISE NOTICE 'Test company created with ID: %', company_id;
END $$;
*/

-- =============================================
-- STEP 6: CREATE UTILITY FUNCTIONS FOR FRONTEND
-- =============================================

-- Function to get user's default company
CREATE OR REPLACE FUNCTION get_user_default_company(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    company_id UUID,
    company_name TEXT,
    role user_role,
    logo_url TEXT,
    primary_color TEXT,
    base_currency TEXT,
    settings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        uc.role,
        c.logo_url,
        c.primary_color,
        c.base_currency,
        c.settings
    FROM public.user_companies uc
    JOIN public.companies c ON uc.company_id = c.id
    WHERE uc.user_id = user_uuid 
      AND uc.is_active = true
    ORDER BY uc.is_default DESC, uc.joined_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get product summary with stock status
CREATE OR REPLACE FUNCTION get_products_summary(company_uuid UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    sku TEXT,
    stock DECIMAL,
    unit_symbol TEXT,
    price_per_unit DECIMAL,
    stock_value DECIMAL,
    stock_status TEXT,
    last_traded DATE,
    is_visible BOOLEAN,
    category_name TEXT,
    image_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.sku,
        p.current_stock,
        COALESCE(u.symbol, 'kg') as unit_symbol,
        p.price_per_40kg,
        p.current_stock * p.cost_price as stock_value,
        CASE 
            WHEN p.current_stock <= 0 THEN 'Out of Stock'
            WHEN p.current_stock <= p.minimum_stock THEN 'Low Stock'
            ELSE 'In Stock'
        END as stock_status,
        p.last_traded_at::date,
        p.is_visible,
        c.name as category_name,
        p.image_url
    FROM public.products p
    LEFT JOIN public.units u ON p.unit_id = u.id
    LEFT JOIN public.categories c ON p.category_id = c.id
    WHERE p.company_id = company_uuid 
      AND p.is_active = true
    ORDER BY p.display_order, p.last_traded_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get transaction summary with profit calculation
CREATE OR REPLACE FUNCTION get_transactions_summary(
    company_uuid UUID,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    product_name TEXT,
    action TEXT,
    quantity DECIMAL,
    rate DECIMAL,
    total DECIMAL,
    party_name TEXT,
    transaction_date TIMESTAMP,
    profit_estimate DECIMAL,
    status TEXT,
    reference_number TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        p.name,
        t.action,
        t.quantity,
        t.rate,
        t.total,
        t.party_name,
        t.transaction_date,
        CASE 
            WHEN t.action = 'sell' THEN t.total - (t.quantity * p.cost_price)
            ELSE 0
        END as profit_estimate,
        t.status::text,
        t.reference_number
    FROM public.transactions t
    JOIN public.products p ON t.product_id = p.id
    WHERE t.company_id = company_uuid 
      AND t.status = 'confirmed'
    ORDER BY t.transaction_date DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get daily analytics
CREATE OR REPLACE FUNCTION get_daily_analytics(
    company_uuid UUID,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    date DATE,
    total_sales DECIMAL,
    total_purchases DECIMAL,
    total_profit DECIMAL,
    transaction_count INTEGER,
    top_selling_product TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_stats AS (
        SELECT 
            t.transaction_date::date as analytics_date,
            SUM(CASE WHEN t.action = 'sell' THEN t.total ELSE 0 END) as sales,
            SUM(CASE WHEN t.action = 'buy' THEN t.total ELSE 0 END) as purchases,
            SUM(CASE WHEN t.action = 'sell' THEN t.total - (t.quantity * p.cost_price) ELSE 0 END) as profit,
            COUNT(*) as trans_count
        FROM public.transactions t
        JOIN public.products p ON t.product_id = p.id
        WHERE t.company_id = company_uuid
          AND t.status = 'confirmed'
          AND t.transaction_date::date BETWEEN start_date AND end_date
        GROUP BY t.transaction_date::date
    ),
    top_products AS (
        SELECT 
            t.transaction_date::date as analytics_date,
            p.name as product_name,
            SUM(t.quantity) as total_quantity,
            ROW_NUMBER() OVER (PARTITION BY t.transaction_date::date ORDER BY SUM(t.quantity) DESC) as rn
        FROM public.transactions t
        JOIN public.products p ON t.product_id = p.id
        WHERE t.company_id = company_uuid
          AND t.status = 'confirmed'
          AND t.action = 'sell'
          AND t.transaction_date::date BETWEEN start_date AND end_date
        GROUP BY t.transaction_date::date, p.name
    )
    SELECT 
        ds.analytics_date,
        ds.sales,
        ds.purchases,
        ds.profit,
        ds.trans_count,
        tp.product_name
    FROM daily_stats ds
    LEFT JOIN top_products tp ON ds.analytics_date = tp.analytics_date AND tp.rn = 1
    ORDER BY ds.analytics_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 7: CREATE SAMPLE TRIGGERS FOR AUTOMATION
-- =============================================

-- Trigger to auto-generate SKU for new products
CREATE OR REPLACE FUNCTION generate_product_sku()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sku IS NULL OR NEW.sku = '' THEN
        NEW.sku := UPPER(LEFT(NEW.name, 3)) || '-' || 
                   TO_CHAR(NEW.created_at, 'YYYYMM') || '-' ||
                   LPAD(EXTRACT(epoch FROM NEW.created_at)::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_product_sku
    BEFORE INSERT ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION generate_product_sku();

-- Trigger to create low stock notifications
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if stock is now below minimum
    IF NEW.current_stock <= NEW.minimum_stock AND NEW.current_stock > 0 THEN
        INSERT INTO public.notifications (
            user_id,
            company_id,
            title,
            message,
            type,
            entity_type,
            entity_id,
            target_url
        )
        SELECT 
            uc.user_id,
            NEW.company_id,
            'Low Stock Alert',
            'Product "' || NEW.name || '" is running low. Current stock: ' || NEW.current_stock || ' ' || COALESCE(u.symbol, 'units'),
            'low_stock',
            'product',
            NEW.id,
            '/inventory?product=' || NEW.id
        FROM public.user_companies uc
        LEFT JOIN public.units u ON NEW.unit_id = u.id
        WHERE uc.company_id = NEW.company_id 
          AND uc.is_active = true
          AND uc.role IN ('admin', 'manager');
    END IF;
    
    -- Check if stock is now zero
    IF NEW.current_stock <= 0 AND OLD.current_stock > 0 THEN
        INSERT INTO public.notifications (
            user_id,
            company_id,
            title,
            message,
            type,
            entity_type,
            entity_id,
            target_url
        )
        SELECT 
            uc.user_id,
            NEW.company_id,
            'Out of Stock Alert',
            'Product "' || NEW.name || '" is out of stock!',
            'warning',
            'product',
            NEW.id,
            '/inventory?product=' || NEW.id
        FROM public.user_companies uc
        WHERE uc.company_id = NEW.company_id 
          AND uc.is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_low_stock
    AFTER UPDATE ON public.products
    FOR EACH ROW
    WHEN (OLD.current_stock IS DISTINCT FROM NEW.current_stock)
    EXECUTE FUNCTION check_low_stock();

-- =============================================
-- STEP 8: GRANT PERMISSIONS FOR FRONTEND FUNCTIONS
-- =============================================

-- Grant execute permissions on utility functions
GRANT EXECUTE ON FUNCTION get_user_default_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_products_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_transactions_summary(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_analytics(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION setup_new_company(TEXT, TEXT, TEXT) TO authenticated;

-- =============================================
-- STEP 9: FINAL SETUP VERIFICATION
-- =============================================

-- Function to verify setup
CREATE OR REPLACE FUNCTION verify_setup()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Tables'::text,
        CASE WHEN COUNT(*) >= 20 THEN 'OK' ELSE 'Missing' END,
        'Found ' || COUNT(*) || ' tables' as details
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    
    UNION ALL
    
    SELECT 
        'RLS Policies'::text,
        CASE WHEN COUNT(*) >= 30 THEN 'OK' ELSE 'Missing' END,
        'Found ' || COUNT(*) || ' policies' as details
    FROM pg_policies 
    WHERE schemaname = 'public'
    
    UNION ALL
    
    SELECT 
        'Functions'::text,
        CASE WHEN COUNT(*) >= 10 THEN 'OK' ELSE 'Missing' END,
        'Found ' || COUNT(*) || ' functions' as details
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
    
    UNION ALL
    
    SELECT 
        'Triggers'::text,
        CASE WHEN COUNT(*) >= 8 THEN 'OK' ELSE 'Missing' END,
        'Found ' || COUNT(*) || ' triggers' as details
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
    
    UNION ALL
    
    SELECT 
        'Sample Units'::text,
        CASE WHEN COUNT(*) >= 5 THEN 'OK' ELSE 'Missing' END,
        'Found ' || COUNT(*) || ' units' as details
    FROM public.units 
    WHERE company_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Run verification
SELECT * FROM verify_setup();

-- =============================================
-- STEP 10: USAGE INSTRUCTIONS
-- =============================================

/*
SETUP COMPLETE! 

To use this database with your frontend:

1. NEXT STEPS FOR FRONTEND INTEGRATION:
   - Update your types in src/types/index.ts with the enhanced interfaces
   - Update your Supabase client functions as shown in frontend_integration_guide.sql
   - Modify your context providers to use the new database functions
   - Update your components to use the new data structure

2. CREATE YOUR FIRST COMPANY:
   Run this SQL with your actual email:
   
   SELECT setup_new_company(
       'Your Business Name',
       'your-email@example.com',
       'agriculture'
   );

3. TEST THE SETUP:
   - Check that all functions work: SELECT * FROM verify_setup();
   - Create a test product via your frontend
   - Create a test transaction
   - Verify real-time updates work

4. ENVIRONMENT VARIABLES:
   Make sure your .env.local has:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (for admin functions)

5. SUPABASE DASHBOARD SETTINGS:
   - Enable Real-time for the tables you want to subscribe to
   - Set up email templates for notifications
   - Configure storage if you plan to upload images

6. PERFORMANCE OPTIMIZATION:
   - Monitor query performance in production
   - Use the materialized views for heavy dashboard queries
   - Set up automated data archiving for old transactions

7. BACKUP STRATEGY:
   - Set up regular database backups
   - Export important data periodically
   - Test restore procedures

Your database is now ready for production use with:
✅ Complete multi-tenant architecture
✅ Row-level security
✅ Real-time capabilities
✅ Comprehensive audit trails
✅ Agricultural business optimizations
✅ Frontend compatibility
✅ Scalable design for future growth

Happy coding! 🚀
*/

-- =============================================
-- END OF SETUP SCRIPT
-- =============================================
