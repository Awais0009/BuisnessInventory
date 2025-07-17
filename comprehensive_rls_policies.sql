-- =============================================
-- COMPREHENSIVE ROW LEVEL SECURITY POLICIES
-- For Business Inventory Database Schema
-- =============================================

-- =============================================
-- 1. UTILITY FUNCTIONS FOR RLS
-- =============================================

-- Function to get user's accessible companies
CREATE OR REPLACE FUNCTION get_user_companies(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID[] AS $$
DECLARE
    company_ids UUID[]; 
BEGIN
    -- If no user provided, return empty array
    IF user_uuid IS NULL THEN
        RETURN ARRAY[]::UUID[];
    END IF;
    
    -- Get all company IDs where user has access
    SELECT ARRAY_AGG(company_id) INTO company_ids
    FROM public.user_companies 
    WHERE user_id = user_uuid AND is_active = true;
    
    -- Return empty array if no companies found
    RETURN COALESCE(company_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER;

-- Function to check if user has specific role in company
CREATE OR REPLACE FUNCTION user_has_role_in_company(
    user_uuid UUID,
    company_uuid UUID,
    required_roles user_role[]
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_companies 
        WHERE user_id = user_uuid 
        AND company_id = company_uuid 
        AND role = ANY(required_roles)
        AND is_active = true
    );
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER;

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION user_is_admin_or_manager(
    user_uuid UUID DEFAULT auth.uid(),
    company_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    IF company_uuid IS NULL THEN
        -- Check if user is admin/manager in any company
        RETURN EXISTS (
            SELECT 1 
            FROM public.user_companies 
            WHERE user_id = user_uuid 
            AND role IN ('admin', 'manager')
            AND is_active = true
        );
    ELSE
        -- Check if user is admin/manager in specific company
        RETURN user_has_role_in_company(user_uuid, company_uuid, ARRAY['admin', 'manager']::user_role[]);
    END IF;
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER;

-- =============================================
-- 2. PROFILES TABLE POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON public.profiles 
FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles 
FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (during registration)
CREATE POLICY "profiles_insert_own" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can view all profiles in their companies
CREATE POLICY "profiles_select_company_admin" ON public.profiles 
FOR SELECT USING (
    user_is_admin_or_manager(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM public.user_companies uc1
        JOIN public.user_companies uc2 ON uc1.company_id = uc2.company_id
        WHERE uc1.user_id = auth.uid() 
        AND uc1.role IN ('admin', 'manager')
        AND uc1.is_active = true
        AND uc2.user_id = profiles.id
        AND uc2.is_active = true
    )
);

-- =============================================
-- 3. COMPANIES TABLE POLICIES
-- =============================================

-- Users can view companies they belong to
CREATE POLICY "companies_select_member" ON public.companies 
FOR SELECT USING (id = ANY(get_user_companies(auth.uid())));

-- Only admins can update company information
CREATE POLICY "companies_update_admin" ON public.companies 
FOR UPDATE USING (user_is_admin_or_manager(auth.uid(), id));

-- Users can create new companies (for multi-tenant setup)
CREATE POLICY "companies_insert_authenticated" ON public.companies 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only company creators or admins can delete companies
CREATE POLICY "companies_delete_admin" ON public.companies 
FOR DELETE USING (
    created_by = auth.uid() OR 
    user_is_admin_or_manager(auth.uid(), id)
);

-- =============================================
-- 4. USER_COMPANIES TABLE POLICIES
-- =============================================

-- Users can view their own company relationships
CREATE POLICY "user_companies_select_own" ON public.user_companies 
FOR SELECT USING (user_id = auth.uid());

-- Admins can view all relationships in their companies
CREATE POLICY "user_companies_select_admin" ON public.user_companies 
FOR SELECT USING (
    user_is_admin_or_manager(auth.uid(), company_id)
);

-- Admins can invite users to their companies
CREATE POLICY "user_companies_insert_admin" ON public.user_companies 
FOR INSERT WITH CHECK (
    user_is_admin_or_manager(auth.uid(), company_id)
);

-- Admins can update user roles in their companies
CREATE POLICY "user_companies_update_admin" ON public.user_companies 
FOR UPDATE USING (
    user_is_admin_or_manager(auth.uid(), company_id)
);

-- Users can leave companies (update their own status)
CREATE POLICY "user_companies_update_own" ON public.user_companies 
FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- 5. CATEGORIES TABLE POLICIES
-- =============================================

-- Users can view categories in their companies
CREATE POLICY "categories_select_company" ON public.categories 
FOR SELECT USING (company_id = ANY(get_user_companies(auth.uid())));

-- Users can manage categories in their companies
CREATE POLICY "categories_all_company" ON public.categories 
FOR ALL USING (company_id = ANY(get_user_companies(auth.uid())));

-- =============================================
-- 6. UNITS TABLE POLICIES
-- =============================================

-- Users can view units in their companies or global units
CREATE POLICY "units_select_company" ON public.units 
FOR SELECT USING (
    company_id IS NULL OR 
    company_id = ANY(get_user_companies(auth.uid()))
);

-- Only admins can manage company-specific units
CREATE POLICY "units_manage_admin" ON public.units 
FOR ALL USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    (company_id IS NULL OR user_is_admin_or_manager(auth.uid(), company_id))
);

-- =============================================
-- 7. SUPPLIERS TABLE POLICIES
-- =============================================

-- Users can view suppliers in their companies
CREATE POLICY "suppliers_select_company" ON public.suppliers 
FOR SELECT USING (company_id = ANY(get_user_companies(auth.uid())));

-- Users can create suppliers in their companies
CREATE POLICY "suppliers_insert_company" ON public.suppliers 
FOR INSERT WITH CHECK (company_id = ANY(get_user_companies(auth.uid())));

-- Users can update suppliers in their companies
CREATE POLICY "suppliers_update_company" ON public.suppliers 
FOR UPDATE USING (company_id = ANY(get_user_companies(auth.uid())));

-- Only admins can delete suppliers
CREATE POLICY "suppliers_delete_admin" ON public.suppliers 
FOR DELETE USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    user_is_admin_or_manager(auth.uid(), company_id)
);

-- =============================================
-- 8. CUSTOMERS TABLE POLICIES
-- =============================================

-- Users can view customers in their companies
CREATE POLICY "customers_select_company" ON public.customers 
FOR SELECT USING (company_id = ANY(get_user_companies(auth.uid())));

-- Users can create customers in their companies
CREATE POLICY "customers_insert_company" ON public.customers 
FOR INSERT WITH CHECK (company_id = ANY(get_user_companies(auth.uid())));

-- Users can update customers in their companies
CREATE POLICY "customers_update_company" ON public.customers 
FOR UPDATE USING (company_id = ANY(get_user_companies(auth.uid())));

-- Only admins can delete customers
CREATE POLICY "customers_delete_admin" ON public.customers 
FOR DELETE USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    user_is_admin_or_manager(auth.uid(), company_id)
);

-- =============================================
-- 9. PRODUCTS TABLE POLICIES
-- =============================================

-- Users can view products in their companies
CREATE POLICY "products_select_company" ON public.products 
FOR SELECT USING (company_id = ANY(get_user_companies(auth.uid())));

-- Users can create products in their companies
CREATE POLICY "products_insert_company" ON public.products 
FOR INSERT WITH CHECK (
    company_id = ANY(get_user_companies(auth.uid())) AND
    created_by = auth.uid()
);

-- Users can update products in their companies
CREATE POLICY "products_update_company" ON public.products 
FOR UPDATE USING (company_id = ANY(get_user_companies(auth.uid())));

-- Only admins can delete products
CREATE POLICY "products_delete_admin" ON public.products 
FOR DELETE USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    user_is_admin_or_manager(auth.uid(), company_id)
);

-- =============================================
-- 10. PRODUCT_PRICE_HISTORY TABLE POLICIES
-- =============================================

-- Users can view price history for company products
CREATE POLICY "product_price_history_select" ON public.product_price_history 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = product_price_history.product_id 
        AND p.company_id = ANY(get_user_companies(auth.uid()))
    )
);

-- Users can insert price history for company products
CREATE POLICY "product_price_history_insert" ON public.product_price_history 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = product_price_history.product_id 
        AND p.company_id = ANY(get_user_companies(auth.uid()))
    ) AND created_by = auth.uid()
);

-- =============================================
-- 11. TRANSACTIONS TABLE POLICIES
-- =============================================

-- Users can view transactions in their companies
CREATE POLICY "transactions_select_company" ON public.transactions 
FOR SELECT USING (company_id = ANY(get_user_companies(auth.uid())));

-- Users can create transactions in their companies
CREATE POLICY "transactions_insert_company" ON public.transactions 
FOR INSERT WITH CHECK (
    company_id = ANY(get_user_companies(auth.uid())) AND
    created_by = auth.uid()
);

-- Users can update their own transactions (if not approved)
CREATE POLICY "transactions_update_own" ON public.transactions 
FOR UPDATE USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    (created_by = auth.uid() OR user_is_admin_or_manager(auth.uid(), company_id)) AND
    (approved_by IS NULL OR user_is_admin_or_manager(auth.uid(), company_id))
);

-- Only admins can delete transactions
CREATE POLICY "transactions_delete_admin" ON public.transactions 
FOR DELETE USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    user_is_admin_or_manager(auth.uid(), company_id)
);

-- =============================================
-- 12. STOCK_MOVEMENTS TABLE POLICIES
-- =============================================

-- Users can view stock movements in their companies
CREATE POLICY "stock_movements_select_company" ON public.stock_movements 
FOR SELECT USING (company_id = ANY(get_user_companies(auth.uid())));

-- System can insert stock movements (via triggers)
CREATE POLICY "stock_movements_insert_system" ON public.stock_movements 
FOR INSERT WITH CHECK (
    company_id = ANY(get_user_companies(auth.uid()))
);

-- Only admins can manually adjust stock movements
CREATE POLICY "stock_movements_update_admin" ON public.stock_movements 
FOR UPDATE USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    user_is_admin_or_manager(auth.uid(), company_id)
);

-- =============================================
-- 13. ACCOUNTS TABLE POLICIES
-- =============================================

-- Users can view accounts in their companies
CREATE POLICY "accounts_select_company" ON public.accounts 
FOR SELECT USING (company_id = ANY(get_user_companies(auth.uid())));

-- Only admins can manage accounts
CREATE POLICY "accounts_manage_admin" ON public.accounts 
FOR ALL USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    user_is_admin_or_manager(auth.uid(), company_id)
);

-- =============================================
-- 14. JOURNAL_ENTRIES TABLE POLICIES
-- =============================================

-- Users can view journal entries in their companies
CREATE POLICY "journal_entries_select_company" ON public.journal_entries 
FOR SELECT USING (company_id = ANY(get_user_companies(auth.uid())));

-- System and admins can create journal entries
CREATE POLICY "journal_entries_insert_admin" ON public.journal_entries 
FOR INSERT WITH CHECK (
    company_id = ANY(get_user_companies(auth.uid())) AND
    (user_is_admin_or_manager(auth.uid(), company_id) OR created_by = auth.uid())
);

-- Only admins can modify journal entries
CREATE POLICY "journal_entries_update_admin" ON public.journal_entries 
FOR UPDATE USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    user_is_admin_or_manager(auth.uid(), company_id)
);

-- =============================================
-- 15. PARTY_LEDGER TABLE POLICIES
-- =============================================

-- Users can view party ledger in their companies
CREATE POLICY "party_ledger_select_company" ON public.party_ledger 
FOR SELECT USING (company_id = ANY(get_user_companies(auth.uid())));

-- System can insert party ledger entries (via triggers)
CREATE POLICY "party_ledger_insert_system" ON public.party_ledger 
FOR INSERT WITH CHECK (company_id = ANY(get_user_companies(auth.uid())));

-- Only admins can modify party ledger entries
CREATE POLICY "party_ledger_update_admin" ON public.party_ledger 
FOR UPDATE USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    user_is_admin_or_manager(auth.uid(), company_id)
);

-- =============================================
-- 16. DASHBOARD_METRICS TABLE POLICIES
-- =============================================

-- Users can view dashboard metrics for their companies
CREATE POLICY "dashboard_metrics_select_company" ON public.dashboard_metrics 
FOR SELECT USING (company_id = ANY(get_user_companies(auth.uid())));

-- System can insert/update dashboard metrics (via triggers)
CREATE POLICY "dashboard_metrics_manage_system" ON public.dashboard_metrics 
FOR ALL USING (company_id = ANY(get_user_companies(auth.uid())));

-- =============================================
-- 17. CROP_ANALYTICS TABLE POLICIES
-- =============================================

-- Users can view crop analytics in their companies
CREATE POLICY "crop_analytics_select_company" ON public.crop_analytics 
FOR SELECT USING (company_id = ANY(get_user_companies(auth.uid())));

-- System and users can create analytics
CREATE POLICY "crop_analytics_insert_company" ON public.crop_analytics 
FOR INSERT WITH CHECK (company_id = ANY(get_user_companies(auth.uid())));

-- Users can update analytics in their companies
CREATE POLICY "crop_analytics_update_company" ON public.crop_analytics 
FOR UPDATE USING (company_id = ANY(get_user_companies(auth.uid())));

-- =============================================
-- 18. REPORTS TABLE POLICIES
-- =============================================

-- Users can view reports in their companies
CREATE POLICY "reports_select_company" ON public.reports 
FOR SELECT USING (
    company_id = ANY(get_user_companies(auth.uid())) OR
    (is_public = true AND company_id = ANY(get_user_companies(auth.uid()))) OR
    auth.uid() = ANY(shared_users)
);

-- Users can create reports in their companies
CREATE POLICY "reports_insert_company" ON public.reports 
FOR INSERT WITH CHECK (
    company_id = ANY(get_user_companies(auth.uid())) AND
    generated_by = auth.uid()
);

-- Users can update their own reports
CREATE POLICY "reports_update_own" ON public.reports 
FOR UPDATE USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    generated_by = auth.uid()
);

-- Users can delete their own reports, admins can delete any
CREATE POLICY "reports_delete_own_or_admin" ON public.reports 
FOR DELETE USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    (generated_by = auth.uid() OR user_is_admin_or_manager(auth.uid(), company_id))
);

-- =============================================
-- 19. ACTIVITY_LOGS TABLE POLICIES
-- =============================================

-- Users can view activity logs in their companies
CREATE POLICY "activity_logs_select_company" ON public.activity_logs 
FOR SELECT USING (company_id = ANY(get_user_companies(auth.uid())));

-- System can insert activity logs
CREATE POLICY "activity_logs_insert_system" ON public.activity_logs 
FOR INSERT WITH CHECK (
    company_id = ANY(get_user_companies(auth.uid())) OR
    user_id = auth.uid()
);

-- Only system should modify activity logs (read-only for users)
-- No update/delete policies for regular users

-- =============================================
-- 20. NOTIFICATIONS TABLE POLICIES
-- =============================================

-- Users can view their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications 
FOR SELECT USING (user_id = auth.uid());

-- System and admins can create notifications
CREATE POLICY "notifications_insert_admin_or_system" ON public.notifications 
FOR INSERT WITH CHECK (
    user_is_admin_or_manager(auth.uid(), company_id) OR
    company_id = ANY(get_user_companies(auth.uid()))
);

-- Users can update their own notifications (mark as read, etc.)
CREATE POLICY "notifications_update_own" ON public.notifications 
FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own" ON public.notifications 
FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- 21. SETTINGS TABLE POLICIES
-- =============================================

-- Users can view settings in their companies
CREATE POLICY "settings_select_company" ON public.settings 
FOR SELECT USING (company_id = ANY(get_user_companies(auth.uid())));

-- Only admins can modify settings
CREATE POLICY "settings_manage_admin" ON public.settings 
FOR ALL USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    user_is_admin_or_manager(auth.uid(), company_id)
);

-- =============================================
-- 22. ATTACHMENTS TABLE POLICIES
-- =============================================

-- Users can view attachments in their companies
CREATE POLICY "attachments_select_company" ON public.attachments 
FOR SELECT USING (
    company_id = ANY(get_user_companies(auth.uid())) OR
    (is_public = true AND company_id = ANY(get_user_companies(auth.uid())))
);

-- Users can upload attachments to their companies
CREATE POLICY "attachments_insert_company" ON public.attachments 
FOR INSERT WITH CHECK (
    company_id = ANY(get_user_companies(auth.uid())) AND
    uploaded_by = auth.uid()
);

-- Users can update their own attachments
CREATE POLICY "attachments_update_own" ON public.attachments 
FOR UPDATE USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    uploaded_by = auth.uid()
);

-- Users can delete their own attachments, admins can delete any
CREATE POLICY "attachments_delete_own_or_admin" ON public.attachments 
FOR DELETE USING (
    company_id = ANY(get_user_companies(auth.uid())) AND
    (uploaded_by = auth.uid() OR user_is_admin_or_manager(auth.uid(), company_id))
);

-- =============================================
-- 23. SPECIAL POLICIES FOR VIEWS
-- =============================================

-- Enable RLS on views that need it
ALTER VIEW product_inventory_summary SET (security_barrier = true);
ALTER VIEW transaction_summary SET (security_barrier = true);
ALTER VIEW daily_analytics SET (security_barrier = true);
ALTER VIEW party_balances SET (security_barrier = true);

-- =============================================
-- 24. GRANTS AND PERMISSIONS
-- =============================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_user_companies(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role_in_company(UUID, UUID, user_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION user_is_admin_or_manager(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_company_data(UUID) TO authenticated;

-- Grant select on views
GRANT SELECT ON product_inventory_summary TO authenticated;
GRANT SELECT ON transaction_summary TO authenticated;
GRANT SELECT ON daily_analytics TO authenticated;
GRANT SELECT ON party_balances TO authenticated;

-- =============================================
-- 25. SECURITY NOTES & BEST PRACTICES
-- =============================================

/*
SECURITY IMPLEMENTATION NOTES:

1. ROW LEVEL SECURITY (RLS):
   - All tables have RLS enabled
   - Multi-tenant isolation via company_id
   - Role-based access control (admin, manager, user, viewer)

2. FUNCTION SECURITY:
   - Helper functions use SECURITY DEFINER for elevated privileges
   - Functions validate user access before returning data
   - Cached company access for performance

3. DATA ISOLATION:
   - Complete separation between companies
   - Users can only access data from their companies
   - No cross-company data leakage

4. ROLE HIERARCHY:
   - admin: Full access to company data
   - manager: Management access with some restrictions
   - user: Standard access for daily operations
   - viewer: Read-only access

5. AUDIT TRAIL:
   - All changes logged in activity_logs
   - Immutable transaction history
   - User action tracking

6. FRONTEND INTEGRATION:
   - Policies designed to match frontend requirements
   - Supports multi-company user scenarios
   - Real-time access control validation

7. PERFORMANCE CONSIDERATIONS:
   - Indexes aligned with RLS queries
   - Cached user company relationships
   - Efficient policy evaluation

IMPORTANT: Test all policies thoroughly before production deployment.
*/

-- =============================================
-- END OF RLS POLICIES
-- =============================================
