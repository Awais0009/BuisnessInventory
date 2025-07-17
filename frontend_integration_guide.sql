-- =============================================
-- FRONTEND INTEGRATION GUIDE
-- Database Integration with Next.js Components
-- =============================================

-- This file provides SQL queries and TypeScript interfaces 
-- to integrate the comprehensive database schema with your frontend

-- =============================================
-- 1. UPDATED TYPE DEFINITIONS
-- =============================================

/*
// Update your src/types/index.ts file with these comprehensive types:

// Enhanced User Profile (matching database)
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  company_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  date_format?: string;
  is_active: boolean;
  is_email_verified: boolean;
  last_login_at?: string;
  preferences?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Enhanced Company interface
export interface Company {
  id: string;
  name: string;
  legal_name?: string;
  description?: string;
  industry?: string;
  business_type?: string;
  registration_number?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  base_currency?: string;
  financial_year_start?: string;
  logo_url?: string;
  primary_color?: string;
  settings?: Record<string, any>;
  subscription_plan?: string;
  subscription_expires_at?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Enhanced Crop/Product interface (compatible with existing)
export interface Crop {
  id: string;
  company_id: string;
  category_id?: string;
  unit_id?: string;
  sku?: string;
  barcode?: string;
  name: string;
  description?: string;
  variety?: string;
  grade?: string;
  quality_parameters?: Record<string, any>;
  origin?: string;
  
  // Pricing (maintains frontend compatibility)
  pricePerUnit: number; // Maps to price_per_40kg
  base_price: number;
  current_price: number;
  cost_price: number;
  market_price?: number;
  
  // Stock (maintains frontend compatibility)
  stock: number; // Maps to current_stock
  unit: string; // Maps to unit symbol
  minimum_stock: number;
  maximum_stock?: number;
  reserved_stock: number;
  available_stock: number;
  
  // Physical storage
  storage_location?: string;
  warehouse_section?: string;
  shelf_number?: string;
  bin_location?: string;
  
  // Crop-specific
  harvest_date?: Date;
  expiry_date?: Date;
  shelf_life_days?: number;
  harvest_season?: string;
  crop_year?: string;
  
  // Frontend compatibility
  lastTradedAt?: Date; // Maps to last_traded_at
  isVisible?: boolean; // Maps to is_visible
  display_order: number;
  
  // Media & tracking
  image_url?: string;
  images?: string[];
  documents?: string[];
  total_purchased: number;
  total_sold: number;
  turnover_ratio?: number;
  margin_percentage?: number;
  
  // Status
  is_active: boolean;
  is_featured: boolean;
  tags?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Enhanced Transaction interface (maintains frontend compatibility)
export interface Transaction {
  id: string;
  company_id: string;
  product_id: string;
  supplier_id?: string;
  customer_id?: string;
  
  // Frontend compatibility fields
  cropId: string; // Maps to product_id
  cropName: string; // Derived from product name
  action: 'buy' | 'sell'; // Direct mapping
  quantity: number; // Direct mapping
  rate: number; // Direct mapping (price per unit)
  total: number; // Direct mapping
  partyName: string; // Maps to party_name
  notes?: string; // Direct mapping
  date: Date; // Maps to transaction_date
  
  // Additional database fields
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'return' | 'opening_stock';
  status: 'draft' | 'pending' | 'confirmed' | 'cancelled' | 'partial' | 'completed';
  reference_number?: string;
  batch_number?: string;
  unit_id?: string;
  unit_price: number;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount_percentage: number;
  discount_amount: number;
  payment_method?: 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'digital_wallet' | 'credit';
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  paid_amount: number;
  balance_amount: number;
  due_date?: Date;
  payment_date?: Date;
  internal_notes?: string;
  quality_check_passed: boolean;
  quality_notes?: string;
  certificates?: string[];
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  delivery_address?: string;
  delivery_date?: Date;
  freight_charges: number;
  attachments?: string[];
  invoice_url?: string;
  receipt_url?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: Date;
  created_at: string;
  updated_at: string;
}

// Category interface
export interface Category {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  parent_id?: string;
  sort_order: number;
  color?: string;
  icon?: string;
  is_seasonal: boolean;
  growing_season?: string;
  harvest_months?: number[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Unit interface
export interface Unit {
  id: string;
  company_id?: string;
  name: string;
  symbol: string;
  short_name?: string;
  type: string;
  base_unit_id?: string;
  conversion_factor: number;
  precision_digits: number;
  is_active: boolean;
  created_at: string;
}

// Supplier interface
export interface Supplier {
  id: string;
  company_id: string;
  code?: string;
  name: string;
  legal_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  business_type?: string;
  tax_id?: string;
  registration_number?: string;
  payment_terms?: string;
  credit_limit: number;
  credit_days: number;
  rating?: number;
  total_purchases: number;
  last_purchase_date?: Date;
  bank_name?: string;
  account_number?: string;
  iban?: string;
  notes?: string;
  tags?: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Customer interface
export interface Customer {
  id: string;
  company_id: string;
  code?: string;
  name: string;
  legal_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  business_type?: string;
  tax_id?: string;
  registration_number?: string;
  payment_terms?: string;
  credit_limit: number;
  credit_days: number;
  current_balance: number;
  total_sales: number;
  last_sale_date?: Date;
  preferred_delivery_time?: string;
  discount_percentage: number;
  notes?: string;
  tags?: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Dashboard Metrics interface
export interface DashboardMetrics {
  id: string;
  company_id: string;
  metric_date: string;
  total_sales: number;
  total_purchases: number;
  total_profit: number;
  total_transactions: number;
  total_stock_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  cash_balance: number;
  receivables: number;
  payables: number;
  product_metrics: Record<string, any>;
  created_at: string;
}

// Notification interface
export interface Notification {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'low_stock' | 'transaction' | 'system';
  target_url?: string;
  action_button_text?: string;
  action_url?: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  is_archived: boolean;
  read_at?: string;
  scheduled_for?: string;
  expires_at?: string;
  created_at: string;
}
*/

-- =============================================
-- 2. DATABASE QUERIES FOR FRONTEND COMPONENTS
-- =============================================

-- Get products/crops for InventoryList component (maintains frontend compatibility)
-- File: src/components/InventoryList.tsx
SELECT 
  p.id,
  p.name,
  p.current_stock as stock,
  u.symbol as unit,
  p.price_per_40kg as "pricePerUnit",
  p.last_traded_at as "lastTradedAt",
  p.is_visible as "isVisible",
  p.minimum_stock,
  p.image_url,
  c.name as category_name,
  p.created_at,
  p.updated_at
FROM public.products p
LEFT JOIN public.units u ON p.unit_id = u.id
LEFT JOIN public.categories c ON p.category_id = c.id
WHERE p.company_id = $1 
  AND p.is_active = true
ORDER BY p.display_order, p.last_traded_at DESC NULLS LAST;

-- Get transactions for TransactionLedger component (maintains frontend compatibility)
-- File: src/components/transaction-ledger/TransactionLedger.tsx
SELECT 
  t.id,
  t.product_id as "cropId",
  p.name as "cropName",
  t.action,
  t.quantity,
  t.rate,
  t.total,
  t.party_name as "partyName",
  t.transaction_date as date,
  t.notes,
  t.status,
  t.payment_status,
  t.reference_number,
  t.created_at
FROM public.transactions t
JOIN public.products p ON t.product_id = p.id
WHERE t.company_id = $1 
  AND t.status = 'confirmed'
ORDER BY t.transaction_date DESC;

-- Get dashboard metrics for main dashboard
-- File: src/app/page.tsx
SELECT 
  dm.*,
  COUNT(CASE WHEN p.current_stock <= p.minimum_stock THEN 1 END) as low_stock_count,
  COUNT(CASE WHEN p.current_stock <= 0 THEN 1 END) as out_of_stock_count,
  SUM(p.current_stock * p.cost_price) as total_inventory_value
FROM public.dashboard_metrics dm
CROSS JOIN public.products p
WHERE dm.company_id = $1 
  AND dm.metric_date = CURRENT_DATE
  AND p.company_id = $1
  AND p.is_active = true
GROUP BY dm.id, dm.company_id, dm.metric_date, dm.total_sales, dm.total_purchases, dm.total_profit, dm.total_transactions, dm.created_at;

-- Get recent transactions for RecentTransactions component
-- File: src/components/dashboard/RecentTransactions.tsx
SELECT 
  t.id,
  t.product_id as "cropId",
  p.name as "cropName",
  t.action,
  t.quantity,
  t.rate,
  t.total,
  t.party_name as "partyName",
  t.transaction_date as date,
  t.status,
  t.payment_status
FROM public.transactions t
JOIN public.products p ON t.product_id = p.id
WHERE t.company_id = $1 
  AND t.status IN ('confirmed', 'pending')
ORDER BY t.transaction_date DESC
LIMIT 10;

-- Get analytics data for TrendChart component
-- File: src/components/investment-overview/TrendChart.tsx
SELECT 
  t.product_id as "cropId",
  p.name as "cropName",
  t.action,
  t.quantity,
  t.total,
  t.transaction_date as date,
  DATE_TRUNC('day', t.transaction_date) as day_group,
  DATE_TRUNC('week', t.transaction_date) as week_group,
  DATE_TRUNC('month', t.transaction_date) as month_group
FROM public.transactions t
JOIN public.products p ON t.product_id = p.id
WHERE t.company_id = $1
  AND t.status = 'confirmed'
  AND t.transaction_date BETWEEN $2 AND $3
  AND ($4 = 'both' OR t.action = $4)
  AND ($5 = 'All' OR p.name = $5)
ORDER BY t.transaction_date;

-- =============================================
-- 3. SUPABASE CLIENT INTEGRATION
-- =============================================

/*
// Update your src/lib/supabase-client.ts with these functions:

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database' // Generate this from Supabase CLI

export const supabase = createClientComponentClient<Database>()

// Get user's current company
export async function getCurrentCompany() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userCompanies } = await supabase
    .from('user_companies')
    .select(`
      company_id,
      role,
      is_default,
      companies (
        id,
        name,
        logo_url,
        primary_color,
        base_currency,
        settings
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .limit(1)
    .single()

  return userCompanies?.companies || null
}

// Get products/crops with frontend compatibility
export async function getProducts(companyId: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      current_stock,
      price_per_40kg,
      minimum_stock,
      last_traded_at,
      is_visible,
      image_url,
      created_at,
      updated_at,
      units!inner(symbol),
      categories(name)
    `)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('display_order')
    .order('last_traded_at', { ascending: false, nullsFirst: false })

  if (error) throw error

  // Transform to match frontend Crop interface
  return data.map(product => ({
    id: product.id,
    name: product.name,
    stock: product.current_stock,
    pricePerUnit: product.price_per_40kg,
    unit: product.units.symbol,
    lastTradedAt: product.last_traded_at ? new Date(product.last_traded_at) : undefined,
    isVisible: product.is_visible,
    minimum_stock: product.minimum_stock,
    image_url: product.image_url,
    category_name: product.categories?.name,
    created_at: product.created_at,
    updated_at: product.updated_at
  }))
}

// Get transactions with frontend compatibility
export async function getTransactions(companyId: string, limit?: number) {
  const query = supabase
    .from('transactions')
    .select(`
      id,
      product_id,
      action,
      quantity,
      rate,
      total,
      party_name,
      transaction_date,
      notes,
      status,
      payment_status,
      reference_number,
      created_at,
      products!inner(name)
    `)
    .eq('company_id', companyId)
    .eq('status', 'confirmed')
    .order('transaction_date', { ascending: false })

  if (limit) {
    query.limit(limit)
  }

  const { data, error } = await query

  if (error) throw error

  // Transform to match frontend Transaction interface
  return data.map(transaction => ({
    id: transaction.id,
    cropId: transaction.product_id,
    cropName: transaction.products.name,
    action: transaction.action as 'buy' | 'sell',
    quantity: transaction.quantity,
    rate: transaction.rate,
    total: transaction.total,
    partyName: transaction.party_name,
    date: new Date(transaction.transaction_date),
    notes: transaction.notes,
    status: transaction.status,
    payment_status: transaction.payment_status,
    reference_number: transaction.reference_number,
    created_at: transaction.created_at
  }))
}

// Create new transaction
export async function createTransaction(transactionData: {
  companyId: string
  productId: string
  action: 'buy' | 'sell'
  quantity: number
  rate: number
  partyName: string
  notes?: string
  supplierId?: string
  customerId?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const total = (transactionData.quantity * transactionData.rate) / 40 // Assuming 40kg standard

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      company_id: transactionData.companyId,
      product_id: transactionData.productId,
      supplier_id: transactionData.supplierId,
      customer_id: transactionData.customerId,
      transaction_type: transactionData.action === 'buy' ? 'purchase' : 'sale',
      action: transactionData.action,
      status: 'confirmed',
      quantity: transactionData.quantity,
      rate: transactionData.rate,
      unit_price: transactionData.rate / 40, // Price per kg
      subtotal: total,
      total: total,
      final_amount: total,
      party_name: transactionData.partyName,
      notes: transactionData.notes,
      transaction_date: new Date().toISOString(),
      created_by: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Add new product/crop
export async function createProduct(productData: {
  companyId: string
  name: string
  stock: number
  pricePerUnit: number
  categoryId?: string
  unitId?: string
  variety?: string
  grade?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get default kg unit if no unit specified
  let unitId = productData.unitId
  if (!unitId) {
    const { data: kgUnit } = await supabase
      .from('units')
      .select('id')
      .eq('symbol', 'kg')
      .limit(1)
      .single()
    unitId = kgUnit?.id
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      company_id: productData.companyId,
      category_id: productData.categoryId,
      unit_id: unitId,
      sku: `CROP-${Date.now()}`,
      name: productData.name,
      variety: productData.variety,
      grade: productData.grade,
      price_per_40kg: productData.pricePerUnit,
      current_price: productData.pricePerUnit,
      base_price: productData.pricePerUnit,
      current_stock: productData.stock,
      minimum_stock: 10, // Default minimum
      last_traded_at: new Date().toISOString(),
      is_visible: true,
      is_active: true,
      created_by: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Get dashboard metrics
export async function getDashboardMetrics(companyId: string, date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('dashboard_metrics')
    .select('*')
    .eq('company_id', companyId)
    .eq('metric_date', targetDate)
    .single()

  if (error && error.code !== 'PGRST116') { // Not found error
    throw error
  }

  return data
}

// Get notifications for user
export async function getNotifications(limit = 10) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ 
      is_read: true, 
      read_at: new Date().toISOString() 
    })
    .eq('id', notificationId)

  if (error) throw error
}

// Get crop analytics for charts
export async function getCropAnalytics(
  companyId: string, 
  productIds: string[], 
  startDate: string, 
  endDate: string,
  period: 'daily' | 'weekly' | 'monthly' = 'daily'
) {
  const { data, error } = await supabase
    .from('crop_analytics')
    .select('*')
    .eq('company_id', companyId)
    .in('product_id', productIds)
    .eq('analysis_period', period)
    .gte('period_start', startDate)
    .lte('period_end', endDate)
    .order('period_start')

  if (error) throw error
  return data || []
}
*/

-- =============================================
-- 4. UPDATED CONTEXT PROVIDERS
-- =============================================

/*
// Update your src/context/InventoryContext.tsx to use Supabase:

'use client'
import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getProducts, getTransactions, createTransaction, createProduct } from '@/lib/supabase-client'
import type { Crop, Transaction, User } from '@/types'

// ... existing interfaces ...

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const [state, dispatch] = useReducer(inventoryReducer, initialState)

  // Load data when user changes
  useEffect(() => {
    if (profile?.company_id) {
      loadInventoryData(profile.company_id)
    }
  }, [profile?.company_id])

  const loadInventoryData = async (companyId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      // Load products
      const products = await getProducts(companyId)
      dispatch({ type: 'SET_CROPS', payload: products })
      
      // Load transactions
      const transactions = await getTransactions(companyId, 100) // Last 100 transactions
      dispatch({ type: 'SET_TRANSACTIONS', payload: transactions })
      
      dispatch({ type: 'SET_LOADING', payload: false })
    } catch (error) {
      console.error('Error loading inventory data:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }

  const addTransaction = async (transactionData: {
    productId: string
    action: 'buy' | 'sell'
    quantity: number
    rate: number
    partyName: string
    notes?: string
  }) => {
    if (!profile?.company_id) return

    try {
      const newTransaction = await createTransaction({
        companyId: profile.company_id,
        ...transactionData
      })
      
      dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction })
      
      // Reload products to get updated stock
      const products = await getProducts(profile.company_id)
      dispatch({ type: 'SET_CROPS', payload: products })
      
    } catch (error) {
      console.error('Error adding transaction:', error)
      throw error
    }
  }

  const addCrop = async (cropData: {
    name: string
    stock: number
    pricePerUnit: number
    variety?: string
    grade?: string
  }) => {
    if (!profile?.company_id) return

    try {
      const newProduct = await createProduct({
        companyId: profile.company_id,
        ...cropData
      })
      
      // Reload products
      const products = await getProducts(profile.company_id)
      dispatch({ type: 'SET_CROPS', payload: products })
      
    } catch (error) {
      console.error('Error adding crop:', error)
      throw error
    }
  }

  const value = {
    state,
    dispatch,
    addTransaction,
    addCrop,
    loadInventoryData
  }

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  )
}
*/

-- =============================================
-- 5. MIGRATION QUERIES (For Existing Data)
-- =============================================

-- If you have existing mock data to migrate, use these queries:

-- Create a default company for existing users
INSERT INTO public.companies (
  id,
  name,
  business_type,
  base_currency,
  created_by
) VALUES (
  uuid_generate_v4(),
  'My Agriculture Business',
  'agriculture',
  'PKR',
  (SELECT id FROM auth.users LIMIT 1) -- Replace with actual user ID
);

-- Create user-company relationship
INSERT INTO public.user_companies (
  user_id,
  company_id,
  role,
  is_default,
  is_active
) VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- Replace with actual user ID
  (SELECT id FROM public.companies LIMIT 1), -- Replace with actual company ID
  'admin',
  true,
  true
);

-- Migrate existing crops to products table
-- (Run this if you have existing crop data to migrate)
/*
INSERT INTO public.products (
  company_id,
  name,
  current_stock,
  price_per_40kg,
  current_price,
  base_price,
  minimum_stock,
  last_traded_at,
  is_visible,
  is_active,
  created_by
)
SELECT 
  (SELECT id FROM public.companies LIMIT 1), -- Your company ID
  name,
  stock,
  "pricePerUnit",
  "pricePerUnit",
  "pricePerUnit",
  10, -- Default minimum stock
  COALESCE("lastTradedAt", NOW()),
  COALESCE("isVisible", true),
  true,
  (SELECT id FROM auth.users LIMIT 1) -- Your user ID
FROM your_existing_crops_table; -- Replace with your actual table name
*/

-- =============================================
-- 6. REAL-TIME SUBSCRIPTIONS
-- =============================================

/*
// Add real-time subscriptions to your context providers:

// In InventoryContext.tsx
useEffect(() => {
  if (!profile?.company_id) return

  // Subscribe to product changes
  const productSubscription = supabase
    .channel('products_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `company_id=eq.${profile.company_id}`
      },
      (payload) => {
        console.log('Product change received:', payload)
        // Reload products
        loadInventoryData(profile.company_id)
      }
    )
    .subscribe()

  // Subscribe to transaction changes
  const transactionSubscription = supabase
    .channel('transactions_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `company_id=eq.${profile.company_id}`
      },
      (payload) => {
        console.log('New transaction received:', payload)
        // Add transaction to state
        dispatch({ type: 'ADD_TRANSACTION', payload: payload.new })
      }
    )
    .subscribe()

  // Subscribe to notifications
  const notificationSubscription = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('New notification received:', payload)
        // Handle notification
        toast.info(payload.new.title)
      }
    )
    .subscribe()

  return () => {
    productSubscription.unsubscribe()
    transactionSubscription.unsubscribe()
    notificationSubscription.unsubscribe()
  }
}, [profile?.company_id, user?.id])
*/

-- =============================================
-- 7. COMPONENT-SPECIFIC INTEGRATION EXAMPLES
-- =============================================

-- For AddCropModal.tsx - Check if crop exists before adding:
SELECT COUNT(*) 
FROM public.products 
WHERE company_id = $1 
  AND LOWER(name) = LOWER($2) 
  AND is_active = true;

-- For TransactionModal.tsx - Get product details before transaction:
SELECT 
  p.id,
  p.name,
  p.current_stock,
  p.price_per_40kg,
  p.minimum_stock,
  u.symbol as unit
FROM public.products p
LEFT JOIN public.units u ON p.unit_id = u.id
WHERE p.id = $1 AND p.company_id = $2;

-- For investment-overview components - Get aggregated data:
SELECT 
  p.name as crop_name,
  SUM(CASE WHEN t.action = 'buy' THEN t.quantity ELSE 0 END) as total_bought,
  SUM(CASE WHEN t.action = 'sell' THEN t.quantity ELSE 0 END) as total_sold,
  SUM(CASE WHEN t.action = 'buy' THEN t.total ELSE 0 END) as total_purchase_value,
  SUM(CASE WHEN t.action = 'sell' THEN t.total ELSE 0 END) as total_sales_value,
  SUM(CASE WHEN t.action = 'sell' THEN t.total ELSE 0 END) - 
  SUM(CASE WHEN t.action = 'buy' THEN t.total ELSE 0 END) as profit
FROM public.transactions t
JOIN public.products p ON t.product_id = p.id
WHERE t.company_id = $1
  AND t.status = 'confirmed'
  AND t.transaction_date BETWEEN $2 AND $3
GROUP BY p.id, p.name
ORDER BY profit DESC;

-- =============================================
-- 8. PERFORMANCE OPTIMIZATION QUERIES
-- =============================================

-- Create materialized view for dashboard performance
CREATE MATERIALIZED VIEW dashboard_summary AS
SELECT 
  p.company_id,
  COUNT(*) as total_products,
  SUM(p.current_stock) as total_stock,
  SUM(p.current_stock * p.cost_price) as total_inventory_value,
  COUNT(CASE WHEN p.current_stock <= p.minimum_stock THEN 1 END) as low_stock_items,
  COUNT(CASE WHEN p.current_stock <= 0 THEN 1 END) as out_of_stock_items,
  MAX(p.last_traded_at) as last_activity
FROM public.products p
WHERE p.is_active = true
GROUP BY p.company_id;

-- Refresh materialized view (call this periodically)
REFRESH MATERIALIZED VIEW dashboard_summary;

-- Create indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_company_date_action 
ON public.transactions(company_id, transaction_date DESC, action) 
WHERE status = 'confirmed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_company_stock_status 
ON public.products(company_id, is_active, current_stock, minimum_stock);

-- =============================================
-- END OF INTEGRATION GUIDE
-- =============================================
