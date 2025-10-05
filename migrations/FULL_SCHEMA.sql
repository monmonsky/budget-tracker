-- Monthly Budget Tracker - Complete Database Schema
-- Consolidated migration file for Supabase PostgreSQL
-- This file contains all tables, columns, indexes, RLS policies, and default data

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('primary', 'partner')) DEFAULT 'primary',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts table with sub-account support
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('checking', 'savings', 'investment', 'crypto', 'debt')) NOT NULL,
  bank_name TEXT NOT NULL,
  balance DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'IDR',
  owner TEXT CHECK (owner IN ('husband', 'wife', 'joint')) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  parent_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  is_sub_account BOOLEAN DEFAULT FALSE,
  sub_account_type TEXT CHECK (sub_account_type IN ('pocket', 'saver', 'wallet', 'virtual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  icon TEXT,
  color TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense', 'transfer')) NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  merchant TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  is_internal_transfer BOOLEAN DEFAULT FALSE,
  transfer_pair_id UUID REFERENCES transactions(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  period TEXT CHECK (period IN ('monthly', 'yearly')) DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investments table with P&L calculation support
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT CHECK (platform IN ('bibit', 'binance', 'other')) NOT NULL,
  portfolio_name TEXT NOT NULL,
  portfolio_type TEXT CHECK (portfolio_type IN ('goals', 'retirement', 'emergency', 'crypto')) NOT NULL,
  asset_type TEXT CHECK (asset_type IN ('stocks', 'mixed', 'money_market', 'crypto')) NOT NULL,
  currency TEXT DEFAULT 'IDR' CHECK (currency IN ('IDR', 'USD')),
  current_value DECIMAL(15, 2) DEFAULT 0,
  current_price DECIMAL(15, 2) DEFAULT 0,
  average_buy_price DECIMAL(15, 2) DEFAULT 0,
  total_units DECIMAL(15, 6) DEFAULT 0,
  initial_investment DECIMAL(15, 2) DEFAULT 0,
  total_contribution DECIMAL(15, 2) DEFAULT 0,
  return_percentage DECIMAL(5, 2) DEFAULT 0,
  unrealized_pnl DECIMAL(15, 2) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investment transactions table
CREATE TABLE investment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT CHECK (type IN ('buy', 'sell', 'dividend', 'fee')) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  units DECIMAL(15, 6),
  price_per_unit DECIMAL(15, 2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recurring transactions table
CREATE TABLE recurring_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  merchant TEXT,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')) NOT NULL,
  custom_interval_days INTEGER,
  start_date DATE NOT NULL,
  end_date DATE,
  next_occurrence DATE NOT NULL,
  last_generated DATE,
  is_active BOOLEAN DEFAULT TRUE,
  auto_create BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KPR tracking table
CREATE TABLE kpr_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  principal_amount DECIMAL(15, 2) NOT NULL,
  current_balance DECIMAL(15, 2) NOT NULL,
  monthly_payment DECIMAL(15, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL,
  tenor_years INTEGER NOT NULL,
  start_date DATE NOT NULL,
  expected_payoff_date DATE NOT NULL,
  bombing_history JSONB DEFAULT '[]'::jsonb,
  total_interest_saved DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Net worth snapshots table
CREATE TABLE net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_assets DECIMAL(15, 2) NOT NULL,
  total_liabilities DECIMAL(15, 2) NOT NULL,
  net_worth DECIMAL(15, 2) NOT NULL,
  breakdown JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- App settings table for user preferences
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  app_title TEXT DEFAULT 'Monthly Budget Tracker',
  app_description TEXT DEFAULT 'Track your personal finances and achieve your financial goals',
  default_currency TEXT DEFAULT 'IDR' CHECK (default_currency IN ('IDR', 'USD', 'EUR', 'SGD', 'MYR')),
  date_format TEXT DEFAULT 'dd/MM/yyyy',
  number_format TEXT DEFAULT 'id-ID',
  fiscal_year_start INTEGER DEFAULT 1 CHECK (fiscal_year_start >= 1 AND fiscal_year_start <= 12),
  dark_mode_default BOOLEAN DEFAULT FALSE,
  show_dashboard_greeting BOOLEAN DEFAULT TRUE,
  dashboard_refresh_interval INTEGER DEFAULT 300000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_investments_user_id ON investments(user_id);
CREATE INDEX idx_net_worth_user_date ON net_worth_snapshots(user_id, snapshot_date);
CREATE INDEX idx_app_settings_user_id ON app_settings(user_id);
CREATE INDEX idx_recurring_user_id ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_next_occurrence ON recurring_transactions(next_occurrence);
CREATE INDEX idx_recurring_active ON recurring_transactions(is_active);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpr_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Accounts policies (household access)
CREATE POLICY "Users can view all household accounts" ON accounts
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update accounts" ON accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Transactions policies (household access)
CREATE POLICY "Users can view all household transactions" ON transactions
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Categories policies (all authenticated users)
CREATE POLICY "Users can view categories" ON categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert categories" ON categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update categories" ON categories
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete categories" ON categories
  FOR DELETE TO authenticated USING (true);

-- Budgets policies (own data only)
CREATE POLICY "Users can view own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Investments policies (household access)
CREATE POLICY "Users can view all household investments" ON investments
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert investments" ON investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update investments" ON investments
  FOR UPDATE USING (auth.uid() = user_id);

-- Investment transactions policies (household access)
CREATE POLICY "Users can view all household investment transactions" ON investment_transactions
  FOR SELECT USING (TRUE);

-- Recurring transactions policies (household access)
CREATE POLICY "Users can view all household recurring transactions" ON recurring_transactions
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert recurring transactions" ON recurring_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update recurring transactions" ON recurring_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete recurring transactions" ON recurring_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- KPR tracking policies (own data only)
CREATE POLICY "Users can view own KPR" ON kpr_tracking
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KPR" ON kpr_tracking
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KPR" ON kpr_tracking
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own KPR" ON kpr_tracking
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Net worth snapshots policies (household access)
CREATE POLICY "Users can view all household net worth" ON net_worth_snapshots
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert net worth snapshots" ON net_worth_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- App settings policies (own settings only)
CREATE POLICY "Users can view own settings" ON app_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON app_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON app_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON app_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function for auto-updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_transactions_updated_at BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kpr_tracking_updated_at BEFORE UPDATE ON kpr_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DEFAULT DATA
-- ============================================================

-- Insert default categories
INSERT INTO categories (name, type, icon, color) VALUES
  -- Income categories
  ('Gaji', 'income', '💰', '#10b981'),
  ('Bonus Cash', 'income', '💵', '#10b981'),
  ('Bonus 4-bulanan', 'income', '🎁', '#10b981'),
  ('Investment Return', 'income', '📈', '#10b981'),
  ('Other Income', 'income', '💸', '#10b981'),

  -- Expense categories
  ('Housing', 'expense', '🏠', '#ef4444'),
  ('Insurance & Healthcare', 'expense', '🏥', '#f59e0b'),
  ('Communication', 'expense', '📱', '#3b82f6'),
  ('Subscription', 'expense', '📺', '#8b5cf6'),
  ('Groceries', 'expense', '🛒', '#ec4899'),
  ('Lifestyle', 'expense', '🍔', '#f97316'),
  ('Transportation', 'expense', '⛽', '#14b8a6'),
  ('KPR', 'expense', '🏡', '#dc2626'),
  ('Education', 'expense', '🎓', '#6366f1'),
  ('Other Expense', 'expense', '💳', '#6b7280');

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE profiles IS 'User profiles and authentication data';
COMMENT ON TABLE accounts IS 'Financial accounts with sub-account support (pockets, savers, wallets)';
COMMENT ON TABLE categories IS 'Income and expense categories for transactions';
COMMENT ON TABLE transactions IS 'All financial transactions (income, expense, transfers)';
COMMENT ON TABLE budgets IS 'Budget allocations by category and time period';
COMMENT ON TABLE investments IS 'Investment portfolios with P&L tracking';
COMMENT ON TABLE investment_transactions IS 'Individual investment transactions (buy, sell, dividend, fee)';
COMMENT ON TABLE recurring_transactions IS 'Recurring transaction templates (auto-generate monthly/weekly/yearly transactions)';
COMMENT ON TABLE kpr_tracking IS 'Mortgage (KPR) tracking with bombing history';
COMMENT ON TABLE net_worth_snapshots IS 'Historical net worth snapshots';
COMMENT ON TABLE app_settings IS 'Application settings and preferences for each user';

COMMENT ON COLUMN accounts.parent_account_id IS 'Reference to parent account if this is a sub-account';
COMMENT ON COLUMN accounts.is_sub_account IS 'True if this is a sub-account/wallet';
COMMENT ON COLUMN accounts.sub_account_type IS 'Type of sub-account: pocket (Jago), saver (Jenius), wallet, virtual';

COMMENT ON COLUMN investments.currency IS 'Currency: IDR untuk Bibit/stocks, USD untuk crypto';
COMMENT ON COLUMN investments.current_price IS 'Harga sekarang per unit/koin (untuk crypto tracking)';
COMMENT ON COLUMN investments.average_buy_price IS 'Harga beli rata-rata per unit';
COMMENT ON COLUMN investments.total_units IS 'Total unit/koin yang dimiliki';
COMMENT ON COLUMN investments.unrealized_pnl IS 'Profit/Loss yang belum direalisasi = (current_price - avg_buy_price) * total_units';
