-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- For Supabase Business Inventory System
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
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS FOR RLS
-- =============================================

-- Function to get user's companies
CREATE OR REPLACE FUNCTION get_user_companies(user_uuid UUID)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT company_id 
        FROM public.user_companies 
        WHERE user_id = user_uuid AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role in company
CREATE OR REPLACE FUNCTION user_has_role_in_company(user_uuid UUID, company_uuid UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 
        FROM public.user_companies 
        WHERE user_id = user_uuid 
        AND company_id = company_uuid 
        AND role::TEXT = required_role
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access company data
CREATE OR REPLACE FUNCTION user_can_access_company(company_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN company_uuid = ANY(get_user_companies(auth.uid()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PROFILES POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- COMPANIES POLICIES
-- =============================================

-- Users can view companies they belong to
CREATE POLICY "Users can view their companies" ON public.companies
    FOR SELECT USING (user_can_access_company(id));

-- Only admins and managers can update company info
CREATE POLICY "Admins and managers can update companies" ON public.companies
    FOR UPDATE USING (
        user_has_role_in_company(auth.uid(), id, 'admin') OR 
        user_has_role_in_company(auth.uid(), id, 'manager')
    );

-- Only admins can insert new companies
CREATE POLICY "Admins can insert companies" ON public.companies
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- =============================================
-- USER_COMPANIES POLICIES
-- =============================================

-- Users can view their company relationships
CREATE POLICY "Users can view their company relationships" ON public.user_companies
    FOR SELECT USING (user_id = auth.uid() OR user_can_access_company(company_id));

-- Only admins can manage user-company relationships
CREATE POLICY "Admins can manage user companies" ON public.user_companies
    FOR ALL USING (user_has_role_in_company(auth.uid(), company_id, 'admin'));

-- =============================================
-- BUSINESS DATA POLICIES (Categories, Units, etc.)
-- =============================================

-- Categories
CREATE POLICY "Users can view company categories" ON public.categories
    FOR SELECT USING (user_can_access_company(company_id));

CREATE POLICY "Managers can manage categories" ON public.categories
    FOR ALL USING (
        user_has_role_in_company(auth.uid(), company_id, 'admin') OR 
        user_has_role_in_company(auth.uid(), company_id, 'manager')
    );

-- Units
CREATE POLICY "Users can view company units" ON public.units
    FOR SELECT USING (user_can_access_company(company_id));

CREATE POLICY "Managers can manage units" ON public.units
    FOR ALL USING (
        user_has_role_in_company(auth.uid(), company_id, 'admin') OR 
        user_has_role_in_company(auth.uid(), company_id, 'manager')
    );

-- Suppliers
CREATE POLICY "Users can view company suppliers" ON public.suppliers
    FOR SELECT USING (user_can_access_company(company_id));

CREATE POLICY "Users can manage suppliers" ON public.suppliers
    FOR ALL USING (
        user_has_role_in_company(auth.uid(), company_id, 'admin') OR 
        user_has_role_in_company(auth.uid(), company_id, 'manager') OR
        user_has_role_in_company(auth.uid(), company_id, 'user')
    );

-- Customers
CREATE POLICY "Users can view company customers" ON public.customers
    FOR SELECT USING (user_can_access_company(company_id));

CREATE POLICY "Users can manage customers" ON public.customers
    FOR ALL USING (
        user_has_role_in_company(auth.uid(), company_id, 'admin') OR 
        user_has_role_in_company(auth.uid(), company_id, 'manager') OR
        user_has_role_in_company(auth.uid(), company_id, 'user')
    );

-- =============================================
-- PRODUCTS POLICIES
-- =============================================

-- All users can view products
CREATE POLICY "Users can view company products" ON public.products
    FOR SELECT USING (user_can_access_company(company_id));

-- Users can manage products (except viewers)
CREATE POLICY "Users can manage products" ON public.products
    FOR ALL USING (
        user_has_role_in_company(auth.uid(), company_id, 'admin') OR 
        user_has_role_in_company(auth.uid(), company_id, 'manager') OR
        user_has_role_in_company(auth.uid(), company_id, 'user')
    );

-- =============================================
-- TRANSACTIONS POLICIES
-- =============================================

-- All users can view transactions
CREATE POLICY "Users can view company transactions" ON public.transactions
    FOR SELECT USING (user_can_access_company(company_id));

-- Users can create transactions
CREATE POLICY "Users can create transactions" ON public.transactions
    FOR INSERT WITH CHECK (
        user_can_access_company(company_id) AND
        (user_has_role_in_company(auth.uid(), company_id, 'admin') OR 
         user_has_role_in_company(auth.uid(), company_id, 'manager') OR
         user_has_role_in_company(auth.uid(), company_id, 'user'))
    );

-- Only managers and admins can update/delete transactions
CREATE POLICY "Managers can modify transactions" ON public.transactions
    FOR UPDATE USING (
        user_has_role_in_company(auth.uid(), company_id, 'admin') OR 
        user_has_role_in_company(auth.uid(), company_id, 'manager')
    );

CREATE POLICY "Managers can delete transactions" ON public.transactions
    FOR DELETE USING (
        user_has_role_in_company(auth.uid(), company_id, 'admin') OR 
        user_has_role_in_company(auth.uid(), company_id, 'manager')
    );

-- =============================================
-- STOCK MOVEMENTS POLICIES
-- =============================================

-- All users can view stock movements
CREATE POLICY "Users can view stock movements" ON public.stock_movements
    FOR SELECT USING (user_can_access_company(company_id));

-- Stock movements are typically created by system/triggers
CREATE POLICY "System can create stock movements" ON public.stock_movements
    FOR INSERT WITH CHECK (user_can_access_company(company_id));

-- =============================================
-- FINANCIAL DATA POLICIES
-- =============================================

-- Accounts
CREATE POLICY "Users can view company accounts" ON public.accounts
    FOR SELECT USING (user_can_access_company(company_id));

CREATE POLICY "Managers can manage accounts" ON public.accounts
    FOR ALL USING (
        user_has_role_in_company(auth.uid(), company_id, 'admin') OR 
        user_has_role_in_company(auth.uid(), company_id, 'manager')
    );

-- Journal Entries
CREATE POLICY "Users can view journal entries" ON public.journal_entries
    FOR SELECT USING (user_can_access_company(company_id));

CREATE POLICY "Managers can manage journal entries" ON public.journal_entries
    FOR ALL USING (
        user_has_role_in_company(auth.uid(), company_id, 'admin') OR 
        user_has_role_in_company(auth.uid(), company_id, 'manager')
    );

-- =============================================
-- ANALYTICS & REPORTING POLICIES
-- =============================================

-- Price History
CREATE POLICY "Users can view price history" ON public.price_history
    FOR SELECT USING (user_can_access_company(company_id));

CREATE POLICY "System can create price history" ON public.price_history
    FOR INSERT WITH CHECK (user_can_access_company(company_id));

-- Market Rates (public data)
CREATE POLICY "Anyone can view market rates" ON public.market_rates
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage market rates" ON public.market_rates
    FOR ALL USING (EXISTS(SELECT 1 FROM public.user_companies WHERE user_id = auth.uid() AND role = 'admin'));

-- Reports
CREATE POLICY "Users can view company reports" ON public.reports
    FOR SELECT USING (user_can_access_company(company_id));

CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (user_can_access_company(company_id));

-- =============================================
-- SYSTEM TABLES POLICIES
-- =============================================

-- Activity Logs
CREATE POLICY "Users can view company activity logs" ON public.activity_logs
    FOR SELECT USING (
        user_can_access_company(company_id) AND
        (user_has_role_in_company(auth.uid(), company_id, 'admin') OR 
         user_has_role_in_company(auth.uid(), company_id, 'manager'))
    );

CREATE POLICY "System can create activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (true);

-- Notifications
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Settings
CREATE POLICY "Users can view company settings" ON public.settings
    FOR SELECT USING (user_can_access_company(company_id));

CREATE POLICY "Admins can manage settings" ON public.settings
    FOR ALL USING (user_has_role_in_company(auth.uid(), company_id, 'admin'));

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
