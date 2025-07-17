# Comprehensive Business Inventory Database Schema

A complete, production-ready database schema designed for agricultural commodity trading and inventory management businesses, built specifically for Next.js + Supabase applications.

## 🎯 Overview

This comprehensive database schema provides a complete business inventory management solution with:

- **Multi-tenant architecture** - Support multiple companies in one database
- **Agricultural focus** - Specialized for crop/commodity trading
- **Frontend compatibility** - Designed to work seamlessly with your existing Next.js components
- **Row-level security** - Complete data isolation and role-based access
- **Real-time capabilities** - Live updates via Supabase subscriptions
- **Audit trails** - Complete tracking of all business operations
- **Scalable design** - Built to handle growing business needs

## 📋 Files Included

### Core Schema Files
1. **`comprehensive_database_schema.sql`** - Main database schema with all tables, functions, and triggers
2. **`comprehensive_rls_policies.sql`** - Complete Row Level Security policies for multi-tenant safety
3. **`frontend_integration_guide.sql`** - Integration examples and updated TypeScript interfaces
4. **`complete_setup_script.sql`** - One-command setup script to initialize everything

## 🏗️ Database Architecture

### Core Tables

#### 1. **Authentication & Users**
- `profiles` - Extended user profiles with business information
- `companies` - Multi-tenant company/organization data
- `user_companies` - User-company relationships with roles

#### 2. **Inventory Management**
- `products` - Main products/crops table (compatible with your `Crop` interface)
- `categories` - Product categorization with agricultural-specific fields
- `units` - Units of measurement with conversion factors
- `product_price_history` - Price tracking for analytics

#### 3. **Business Contacts**
- `suppliers` - Vendor/supplier management
- `customers` - Customer management with credit tracking
- Both tables include complete contact info, financial terms, and performance metrics

#### 4. **Transactions & Operations**
- `transactions` - Main transaction table (compatible with your `Transaction` interface)
- `stock_movements` - Detailed inventory movement tracking
- `party_ledger` - Customer/supplier account statements

#### 5. **Financial Management**
- `accounts` - Chart of accounts for double-entry bookkeeping
- `journal_entries` - Financial journal entries
- Automated financial record generation via triggers

#### 6. **Analytics & Reporting**
- `dashboard_metrics` - Cached daily metrics for performance
- `crop_analytics` - Agricultural-specific analytics
- `reports` - Saved report configurations

#### 7. **System & Operations**
- `activity_logs` - Complete audit trail
- `notifications` - In-app notification system
- `settings` - Company-specific configurations
- `attachments` - Centralized file management

## 🔄 Frontend Compatibility

### Your Existing Types Are Preserved!

The database schema is designed to work with your existing frontend components:

```typescript
// Your existing Crop interface maps perfectly to the products table
interface Crop {
  id: string;
  name: string;
  stock: number;          // → current_stock
  pricePerUnit: number;   // → price_per_40kg
  unit: string;           // → units.symbol
  lastTradedAt?: Date;    // → last_traded_at
  isVisible?: boolean;    // → is_visible
}

// Your existing Transaction interface maps to transactions table
interface Transaction {
  id: string;
  cropId: string;         // → product_id
  cropName: string;       // → products.name
  action: 'buy' | 'sell'; // → action
  quantity: number;       // → quantity
  rate: number;           // → rate
  total: number;          // → total
  partyName: string;      // → party_name
  date: Date;             // → transaction_date
  notes?: string;         // → notes
}
```

### Component Integration Examples

Your existing components work with minimal changes:

```typescript
// InventoryList.tsx - Uses products table
const getProducts = () => supabase
  .from('products')
  .select(`
    id, name, current_stock as stock, 
    price_per_40kg as pricePerUnit,
    units!inner(symbol as unit),
    last_traded_at as lastTradedAt,
    is_visible as isVisible
  `)

// TransactionLedger.tsx - Uses transactions table  
const getTransactions = () => supabase
  .from('transactions')
  .select(`
    id, product_id as cropId, action,
    quantity, rate, total, party_name as partyName,
    transaction_date as date, notes,
    products!inner(name as cropName)
  `)
```

## 🚀 Quick Setup

### Prerequisites
- Supabase project set up
- PostgreSQL database access
- Next.js application with Supabase integration

### Installation Steps

1. **Run the complete setup script:**
   ```sql
   \i 'complete_setup_script.sql';
   ```

2. **Create your first company:**
   ```sql
   SELECT setup_new_company(
       'Your Business Name',
       'your-email@example.com',
       'agriculture'
   );
   ```

3. **Update your frontend types** (see `frontend_integration_guide.sql`)

4. **Update your Supabase client functions** (examples provided)

5. **Test the integration:**
   ```sql
   SELECT * FROM verify_setup();
   ```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🔐 Security Features

### Row Level Security (RLS)
- Complete multi-tenant data isolation
- Role-based access control (admin, manager, user, viewer)
- Secure helper functions for policy evaluation
- No cross-company data leakage possible

### Role Hierarchy
- **Admin**: Full company data access
- **Manager**: Management operations with some restrictions
- **User**: Standard daily operations
- **Viewer**: Read-only access

### Audit Trail
- All changes logged in `activity_logs`
- Immutable transaction history
- User action tracking with IP and user agent

## 📊 Advanced Features

### Real-time Subscriptions
```typescript
// Subscribe to inventory changes
const subscription = supabase
  .channel('inventory_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public', 
    table: 'products',
    filter: `company_id=eq.${companyId}`
  }, handleInventoryChange)
  .subscribe()
```

### Automated Business Logic
- **Auto stock updates** when transactions are created
- **Low stock notifications** triggered automatically  
- **Party ledger updates** for customer/supplier balances
- **Dashboard metrics** updated in real-time
- **SKU generation** for new products

### Agricultural-Specific Features
- **Seasonal crop tracking** with harvest calendars
- **Quality parameters** for grade management
- **Market price tracking** and comparison
- **Crop yield analytics** and profitability reports
- **Storage location** and batch management

## 🎨 Dashboard Features

### Real-time Metrics
- Total sales, purchases, and profit
- Current inventory value
- Low stock and out-of-stock alerts
- Transaction counts and trends

### Smart Crop Visibility
- Automatically shows most recently traded crops
- Configurable visible crop count
- Search across all crops regardless of visibility
- Last traded date tracking for smart sorting

### Comprehensive Analytics
- **Profit/loss trending** by crop and time period
- **Buy vs sell volume** comparisons
- **Party-wise transaction** summaries
- **Seasonal performance** analysis
- **Market price vs selling price** tracking

## 🔧 Customization

### Adding New Fields
The schema is designed for easy extension:

```sql
-- Add new product fields
ALTER TABLE products ADD COLUMN organic_certified BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN supplier_rating INTEGER CHECK (supplier_rating >= 1 AND supplier_rating <= 5);

-- Add new transaction types
ALTER TYPE transaction_type ADD VALUE 'consignment';
```

### Custom Categories
```sql
-- Add company-specific categories
INSERT INTO categories (company_id, name, description, is_seasonal, growing_season)
VALUES ($1, 'Spices', 'Spice trading', false, 'Year-round');
```

### Custom Settings
```sql
-- Add company-specific settings
INSERT INTO settings (company_id, category, key, value, name, description)
VALUES ($1, 'custom', 'commission_rate', '2.5', 'Commission Rate %', 'Standard commission percentage');
```

## 📈 Performance Optimization

### Indexes
- Optimized indexes for all common query patterns
- Text search indexes for products, suppliers, customers
- Date-based indexes for transaction queries
- Company-based indexes for multi-tenant queries

### Materialized Views
```sql
-- Dashboard summary for performance
CREATE MATERIALIZED VIEW dashboard_summary AS
SELECT company_id, COUNT(*) as total_products, 
       SUM(current_stock * cost_price) as inventory_value
FROM products WHERE is_active = true 
GROUP BY company_id;
```

### Query Optimization Tips
- Use the provided utility functions for common queries
- Leverage the cached dashboard metrics
- Use appropriate date ranges for analytics
- Filter by company_id first in all queries

## 🔄 Migration from Existing Data

If you have existing data, the schema includes migration helpers:

```sql
-- Migrate existing crops to products table
INSERT INTO products (company_id, name, current_stock, price_per_40kg, ...)
SELECT $1, name, stock, "pricePerUnit", ...
FROM your_existing_crops_table;

-- Migrate existing transactions  
INSERT INTO transactions (company_id, product_id, action, quantity, ...)
SELECT $1, product_id, action, quantity, ...
FROM your_existing_transactions_table;
```

## 🚀 Production Deployment

### Pre-deployment Checklist
- [ ] Run `SELECT * FROM verify_setup();` to confirm all components
- [ ] Test RLS policies with different user roles
- [ ] Verify real-time subscriptions work
- [ ] Test backup and restore procedures
- [ ] Set up monitoring for performance

### Monitoring
- Monitor `activity_logs` for unusual patterns
- Track `dashboard_metrics` for business insights
- Watch `notifications` for system alerts
- Monitor query performance on main tables

### Backup Strategy
- Daily automated backups via Supabase
- Export critical data weekly
- Test restore procedures monthly
- Document recovery procedures

## 🤝 Contributing

This schema is designed to be comprehensive but extensible. Common customizations:

1. **Industry-specific fields** - Add fields relevant to your specific business
2. **Custom workflows** - Add tables for specific business processes  
3. **Integration hooks** - Add triggers for external system integration
4. **Reporting extensions** - Add views for specific reporting needs

## 📚 Further Reading

- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Trigger Documentation](https://www.postgresql.org/docs/current/triggers.html)
- [Multi-tenant Architecture Patterns](https://supabase.com/docs/guides/auth/row-level-security#multi-tenant-apps)

## 🆘 Support

For issues or questions:
1. Check the `verify_setup()` function output
2. Review the frontend integration guide
3. Test with the provided sample data
4. Check Supabase logs for RLS policy issues

## 📄 License

This database schema is designed for production use. Modify and extend as needed for your business requirements.

---

**Built with ❤️ for modern agricultural businesses using Next.js + Supabase**
