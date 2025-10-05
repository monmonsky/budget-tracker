# Database Migration Notes

## Consolidated Schema

All database migrations have been consolidated into a single file: **`FULL_SCHEMA.sql`**

This file contains the complete, up-to-date database schema including all tables, columns, indexes, RLS policies, functions, triggers, and default data.

## Previously Separate Files (Now Deprecated)

The following files have been merged into `FULL_SCHEMA.sql`:

### 1. `supabase-schema.sql` (Base Schema)
- Core tables: profiles, accounts, transactions, categories, budgets
- Investment tracking: investments, investment_transactions
- KPR tracking: kpr_tracking
- Net worth: net_worth_snapshots
- Base RLS policies
- Indexes and triggers
- Default categories

### 2. `UPDATE_INVESTMENT_SCHEMA.sql`
**Additions to investments table:**
- `currency` - Support for IDR and USD (crypto)
- `current_price` - Current price per unit/coin
- `average_buy_price` - Average buy price per unit
- `total_units` - Total units/coins owned
- `unrealized_pnl` - Unrealized profit/loss calculation

### 3. `UPDATE_ACCOUNTS_SCHEMA.sql`
**Additions to accounts table:**
- `parent_account_id` - Reference to parent account
- `is_sub_account` - Flag for sub-accounts
- `sub_account_type` - Type: pocket, saver, wallet, virtual

### 4. `FIX_CATEGORIES_RLS.sql`
**Updated RLS policies for categories:**
- Allow all authenticated users to SELECT
- Allow all authenticated users to INSERT
- Allow all authenticated users to UPDATE
- Allow all authenticated users to DELETE

### 5. `FIX_KPR_RLS.sql`
**Updated RLS policies for kpr_tracking:**
- Users can only view their own KPR data
- Users can only insert their own KPR data
- Users can only update their own KPR data
- Users can only delete their own KPR data

### 6. `CREATE_SETTINGS_TABLE.sql`
**New table: app_settings**
- `app_title` - Custom application title
- `app_description` - Application description
- `default_currency` - IDR, USD, EUR, SGD, MYR
- `date_format` - Date display format
- `number_format` - Number locale format
- `fiscal_year_start` - Fiscal year starting month
- `dark_mode_default` - Default theme preference
- `show_dashboard_greeting` - Dashboard greeting display
- `dashboard_refresh_interval` - Refresh interval in ms
- RLS policies for user-specific settings

## How to Use

### For New Installations

Simply run `FULL_SCHEMA.sql` in Supabase SQL Editor:

```sql
-- Copy entire content from migrations/FULL_SCHEMA.sql
-- Paste in Supabase SQL Editor
-- Click RUN
```

### For Existing Databases

If you already ran the old migration files, you can:

1. **Option A: Fresh Start** (Recommended for development)
   - Drop all tables
   - Run `FULL_SCHEMA.sql`

2. **Option B: Keep Data**
   - Your database already has all changes
   - No action needed
   - `FULL_SCHEMA.sql` is for reference or new installations

## Schema Overview

### Tables Created

1. **profiles** - User authentication and profile data
2. **accounts** - Bank accounts with sub-account support (Jago Pockets, Jenius Flexy Saver)
3. **categories** - Income and expense categories (customizable)
4. **transactions** - All financial transactions (income, expense, transfers)
5. **budgets** - Budget allocations by category
6. **investments** - Investment portfolios with P&L calculation
7. **investment_transactions** - Investment transaction history
8. **kpr_tracking** - Mortgage tracking with bombing history
9. **net_worth_snapshots** - Historical net worth records
10. **app_settings** - User-specific application settings

### Security Features

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ User isolation (users only see their own data)
- ✅ Household access for shared data (accounts, transactions, investments)
- ✅ Public categories for all authenticated users
- ✅ Secure authentication via Supabase Auth

### Key Features

- **Sub-Accounts**: Create wallets under main accounts (Jago Pockets, Jenius Flexy Saver)
- **Multi-Currency**: Support for IDR, USD, EUR, SGD, MYR
- **P&L Tracking**: Automatic profit/loss calculation for investments
- **KPR Bombing**: Track mortgage with early payment strategy
- **Net Worth**: Historical snapshots with JSONB breakdown
- **Custom Settings**: Per-user app configuration

## Verification

After running the migration, verify all tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- accounts
- app_settings
- budgets
- categories
- investment_transactions
- investments
- kpr_tracking
- net_worth_snapshots
- profiles
- transactions

## Notes

- All timestamp columns use `TIMESTAMP WITH TIME ZONE` for timezone awareness
- UUIDs are generated using `uuid-ossp` extension
- `updated_at` columns are auto-updated via triggers
- Default categories are inserted automatically
- All money amounts use `DECIMAL(15, 2)` for precision
- Investment units use `DECIMAL(15, 6)` for crypto precision
