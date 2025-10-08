-- ============================================================
-- MONTHLY BUDGET TRACKER - COMPLETE DATABASE SCHEMA
-- ============================================================
-- Version: 2.3.0
-- Last Updated: 2025-01-05
-- Description: Complete Supabase PostgreSQL schema for Monthly Budget Tracker
--
-- IMPORTANT: This is the BASE schema. After running this, you MUST run
-- the following additional migrations in order:
--
-- 1. ADD_CREDIT_CARD_SUPPORT.sql - Credit card accounts with utilization tracking
-- 2. ADD_BALANCE_HISTORY_LOG.sql - Transaction-linked balance change history
-- 3. ADD_GOALS_AND_BILLS.sql - Savings goals and bill reminders
-- 4. ADD_BUDGET_TEMPLATES_AND_HEALTH_SCORE.sql - Budget templates & health scoring
--
-- Features in BASE schema:
-- - Multi-user support with RLS (Row Level Security)
-- - Accounts with sub-accounts (pockets, savers, wallets)
-- - Transactions (income, expense, transfers)
-- - Transaction Attachments (receipts, invoices)
-- - Categories with parent/child hierarchy
-- - Budgets (monthly/yearly) with Budget Alerts
-- - Budget Alert Notifications with Email
-- - Recurring Transactions (auto-generate)
-- - Investments (Bibit, Binance, etc.)
-- - KPR/Mortgage tracking with payment schedule
-- - Cash flow projections
-- - Multi-currency support
-- - SMTP Email configuration per user
--
-- Features in ADDITIONAL migrations:
-- - Credit card accounts with credit limit & utilization (v2.1.0)
-- - Balance history with transaction context (v2.1.2)
-- - Savings goals with progress tracking (v2.2.0)
-- - Bill reminders with payment history (v2.2.0)
-- - Budget templates (50/30/20, Zero-Based) (v2.3.0)
-- - Financial health score (0-100) (v2.3.0)
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CUSTOM FUNCTIONS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLES
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('primary', 'partner')) DEFAULT 'primary',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profiles linked to auth.users';
COMMENT ON COLUMN profiles.role IS 'User role: primary (main user) or partner (spouse/co-user)';

-- ------------------------------------------------------------
-- 2. APP SETTINGS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  app_title TEXT DEFAULT 'Monthly Budget Tracker',
  app_description TEXT DEFAULT 'Track your personal finances and achieve your financial goals',
  default_currency TEXT DEFAULT 'IDR',
  date_format TEXT DEFAULT 'dd/MM/yyyy',
  number_format TEXT DEFAULT 'id-ID',
  fiscal_year_start INTEGER DEFAULT 1,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT,
  smtp_pass TEXT,
  smtp_from TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE app_settings IS 'Application settings per user';
COMMENT ON COLUMN app_settings.smtp_host IS 'SMTP server hostname for email notifications';
COMMENT ON COLUMN app_settings.smtp_port IS 'SMTP server port (default: 587 for TLS, 465 for SSL)';
COMMENT ON COLUMN app_settings.smtp_user IS 'SMTP authentication username (email address)';
COMMENT ON COLUMN app_settings.smtp_pass IS 'SMTP authentication password';
COMMENT ON COLUMN app_settings.smtp_from IS 'Email FROM address with optional name (e.g., "Budget Tracker <noreply@example.com>")';

-- ------------------------------------------------------------
-- 3. ACCOUNTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('checking', 'savings', 'investment', 'crypto', 'debt', 'credit_card')) NOT NULL,
  bank_name TEXT NOT NULL,
  balance DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'IDR',
  credit_limit DECIMAL(15, 2),
  owner TEXT CHECK (owner IN ('husband', 'wife', 'joint')) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  parent_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  is_sub_account BOOLEAN DEFAULT FALSE,
  sub_account_type TEXT CHECK (sub_account_type IN ('pocket', 'saver', 'wallet', 'virtual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE accounts IS 'Bank accounts with support for sub-accounts (pockets, savers, wallets) and credit cards';
COMMENT ON COLUMN accounts.parent_account_id IS 'References parent account if this is a sub-account';
COMMENT ON COLUMN accounts.sub_account_type IS 'Type of sub-account: pocket, saver, wallet, virtual';
COMMENT ON COLUMN accounts.credit_limit IS 'Credit limit for credit card accounts (NULL for non-credit card accounts)';

-- ------------------------------------------------------------
-- 4. CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  icon TEXT,
  color TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE categories IS 'Transaction categories with optional parent/child hierarchy';
COMMENT ON COLUMN categories.parent_id IS 'References parent category for subcategories';

-- ------------------------------------------------------------
-- 5. TRANSACTIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
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

COMMENT ON TABLE transactions IS 'All financial transactions (income, expense, transfers)';
COMMENT ON COLUMN transactions.is_internal_transfer IS 'True if this is a transfer between user accounts';
COMMENT ON COLUMN transactions.transfer_pair_id IS 'Links to the paired transaction for transfers';

-- ------------------------------------------------------------
-- 6. TRANSACTION ATTACHMENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE transaction_attachments IS 'File attachments for transactions (receipts, invoices, images)';
COMMENT ON COLUMN transaction_attachments.file_size IS 'File size in bytes';
COMMENT ON COLUMN transaction_attachments.file_type IS 'MIME type (e.g., image/jpeg, application/pdf)';

-- ------------------------------------------------------------
-- 7. RECURRING TRANSACTIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_transactions (
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

COMMENT ON TABLE recurring_transactions IS 'Templates for recurring transactions (salaries, subscriptions, etc.)';
COMMENT ON COLUMN recurring_transactions.frequency IS 'daily, weekly, monthly, yearly, or custom';
COMMENT ON COLUMN recurring_transactions.auto_create IS 'Automatically create transaction when due (requires background job)';
COMMENT ON COLUMN recurring_transactions.next_occurrence IS 'Next date when transaction should be generated';

-- ------------------------------------------------------------
-- 8. BUDGETS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
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

COMMENT ON TABLE budgets IS 'Budget limits for categories (monthly or yearly)';

-- ------------------------------------------------------------
-- 9. BUDGET ALERTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  threshold_percentage INTEGER DEFAULT 80,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE budget_alerts IS 'Alert configurations for budgets (trigger at 80%, 100%, etc.)';
COMMENT ON COLUMN budget_alerts.threshold_percentage IS 'Percentage threshold to trigger alert (e.g., 80, 100)';

-- ------------------------------------------------------------
-- 10. ALERT NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  alert_type TEXT CHECK (alert_type IN ('warning', 'exceeded', 'info')) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE alert_notifications IS 'Log of sent budget alert notifications';
COMMENT ON COLUMN alert_notifications.alert_type IS 'warning (80%), exceeded (100%), or info';

-- ------------------------------------------------------------
-- 11. INVESTMENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investments (
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
  total_profit_loss DECIMAL(15, 2) DEFAULT 0,
  profit_loss_percentage DECIMAL(5, 2) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE investments IS 'Investment portfolios (stocks, crypto, mutual funds)';
COMMENT ON COLUMN investments.platform IS 'Investment platform: bibit, binance, or other';

-- ------------------------------------------------------------
-- 12. KPR (MORTGAGE) TRACKING
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kpr (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  property_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  loan_amount DECIMAL(15, 2) NOT NULL,
  down_payment DECIMAL(15, 2) DEFAULT 0,
  interest_rate DECIMAL(5, 2) NOT NULL,
  loan_term_months INTEGER NOT NULL,
  monthly_installment DECIMAL(15, 2) NOT NULL,
  remaining_balance DECIMAL(15, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE kpr IS 'Mortgage/KPR tracking with payment schedules';
COMMENT ON COLUMN kpr.loan_term_months IS 'Loan duration in months (e.g., 240 for 20 years)';

-- ------------------------------------------------------------
-- 13. KPR PAYMENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kpr_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpr_id UUID REFERENCES kpr(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  principal_amount DECIMAL(15, 2) NOT NULL,
  interest_amount DECIMAL(15, 2) NOT NULL,
  total_payment DECIMAL(15, 2) NOT NULL,
  remaining_balance DECIMAL(15, 2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP WITH TIME ZONE,
  transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE kpr_payments IS 'Payment schedule for mortgages/KPR';
COMMENT ON COLUMN kpr_payments.payment_number IS 'Sequential payment number (1, 2, 3, ...)';

-- ============================================================
-- INDEXES
-- ============================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_parent_id ON accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active) WHERE is_active = TRUE;

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- Transaction Attachments
CREATE INDEX IF NOT EXISTS idx_attachments_transaction_id ON transaction_attachments(transaction_id);

-- Recurring Transactions
CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next_occurrence ON recurring_transactions(next_occurrence);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(is_active) WHERE is_active = TRUE;

-- Budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period);

-- Budget Alerts
CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_id ON budget_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_budget_id ON budget_alerts(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_enabled ON budget_alerts(is_enabled) WHERE is_enabled = TRUE;

-- Alert Notifications
CREATE INDEX IF NOT EXISTS idx_alert_notifications_budget_id ON alert_notifications(budget_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_created_at ON alert_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_unread ON alert_notifications(is_read) WHERE is_read = FALSE;

-- Investments
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_platform ON investments(platform);

-- KPR
CREATE INDEX IF NOT EXISTS idx_kpr_user_id ON kpr(user_id);
CREATE INDEX IF NOT EXISTS idx_kpr_active ON kpr(is_active) WHERE is_active = TRUE;

-- KPR Payments
CREATE INDEX IF NOT EXISTS idx_kpr_payments_kpr_id ON kpr_payments(kpr_id);
CREATE INDEX IF NOT EXISTS idx_kpr_payments_date ON kpr_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_kpr_payments_unpaid ON kpr_payments(is_paid) WHERE is_paid = FALSE;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpr ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpr_payments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- App Settings policies
CREATE POLICY "Users can view own settings" ON app_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON app_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON app_settings FOR UPDATE USING (auth.uid() = user_id);

-- Accounts policies (household access - all users can view all accounts)
CREATE POLICY "Users can view all household accounts" ON accounts FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete accounts" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- Categories policies (shared across household)
CREATE POLICY "Everyone can view categories" ON categories FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can insert categories" ON categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update categories" ON categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete categories" ON categories FOR DELETE USING (auth.role() = 'authenticated');

-- Transactions policies (household access)
CREATE POLICY "Users can view all household transactions" ON transactions FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete all household transactions" ON transactions FOR DELETE USING (TRUE);

-- Transaction Attachments policies
CREATE POLICY "Users can view own attachments" ON transaction_attachments FOR SELECT USING (
  transaction_id IN (SELECT id FROM transactions WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own attachments" ON transaction_attachments FOR INSERT WITH CHECK (
  transaction_id IN (SELECT id FROM transactions WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own attachments" ON transaction_attachments FOR DELETE USING (
  transaction_id IN (SELECT id FROM transactions WHERE user_id = auth.uid())
);

-- Recurring Transactions policies
CREATE POLICY "Users can view all household recurring transactions" ON recurring_transactions FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert recurring transactions" ON recurring_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update recurring transactions" ON recurring_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete recurring transactions" ON recurring_transactions FOR DELETE USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users can view all household budgets" ON budgets FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert budgets" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update budgets" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete budgets" ON budgets FOR DELETE USING (TRUE);

-- Budget Alerts policies
CREATE POLICY "Users can view own budget alerts" ON budget_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budget alerts" ON budget_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budget alerts" ON budget_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budget alerts" ON budget_alerts FOR DELETE USING (auth.uid() = user_id);

-- Alert Notifications policies
CREATE POLICY "Users can view all household notifications" ON alert_notifications FOR SELECT USING (TRUE);
CREATE POLICY "Users can update notifications" ON alert_notifications FOR UPDATE USING (TRUE);
CREATE POLICY "Users can insert notifications" ON alert_notifications FOR INSERT WITH CHECK (TRUE);

-- Investments policies
CREATE POLICY "Users can view all household investments" ON investments FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert investments" ON investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update investments" ON investments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete investments" ON investments FOR DELETE USING (auth.uid() = user_id);

-- KPR policies
CREATE POLICY "Users can view all household KPR" ON kpr FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert KPR" ON kpr FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update KPR" ON kpr FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete KPR" ON kpr FOR DELETE USING (auth.uid() = user_id);

-- KPR Payments policies
CREATE POLICY "Users can view all household KPR payments" ON kpr_payments FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert KPR payments" ON kpr_payments FOR INSERT WITH CHECK (
  kpr_id IN (SELECT id FROM kpr WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update KPR payments" ON kpr_payments FOR UPDATE USING (
  kpr_id IN (SELECT id FROM kpr WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete KPR payments" ON kpr_payments FOR DELETE USING (
  kpr_id IN (SELECT id FROM kpr WHERE user_id = auth.uid())
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recurring_transactions_updated_at BEFORE UPDATE ON recurring_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_alerts_updated_at BEFORE UPDATE ON budget_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kpr_updated_at BEFORE UPDATE ON kpr FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ACCOUNT BALANCE AUTO-UPDATE TRIGGERS
-- ============================================================

-- Function to update account balance when transaction is inserted
CREATE OR REPLACE FUNCTION update_account_balance_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'income' THEN
    UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
  ELSIF NEW.type = 'expense' THEN
    UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update account balance when transaction is deleted
CREATE OR REPLACE FUNCTION update_account_balance_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type = 'income' THEN
    UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
  ELSIF OLD.type = 'expense' THEN
    UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update account balance when transaction is updated
CREATE OR REPLACE FUNCTION update_account_balance_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Reverse old transaction
  IF OLD.type = 'income' THEN
    UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
  ELSIF OLD.type = 'expense' THEN
    UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
  END IF;

  -- Apply new transaction
  IF NEW.type = 'income' THEN
    UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
  ELSIF NEW.type = 'expense' THEN
    UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for balance auto-update
CREATE TRIGGER trigger_update_balance_on_insert
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_insert();

CREATE TRIGGER trigger_update_balance_on_delete
  AFTER DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_delete();

CREATE TRIGGER trigger_update_balance_on_update
  AFTER UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_update();

-- ============================================================
-- DEFAULT CATEGORIES
-- ============================================================

-- Income Categories
INSERT INTO categories (name, type, icon, color) VALUES
  ('Salary', 'income', '💼', '#10b981'),
  ('Freelance', 'income', '💻', '#059669'),
  ('Business', 'income', '🏢', '#047857'),
  ('Investment Returns', 'income', '📈', '#065f46'),
  ('Gifts', 'income', '🎁', '#34d399'),
  ('Other Income', 'income', '💰', '#6ee7b7')
ON CONFLICT DO NOTHING;

-- Expense Categories
INSERT INTO categories (name, type, icon, color) VALUES
  ('Food & Dining', 'expense', '🍔', '#ef4444'),
  ('Transportation', 'expense', '🚗', '#dc2626'),
  ('Shopping', 'expense', '🛍️', '#b91c1c'),
  ('Entertainment', 'expense', '🎬', '#991b1b'),
  ('Bills & Utilities', 'expense', '📄', '#f87171'),
  ('Healthcare', 'expense', '🏥', '#fca5a5'),
  ('Education', 'expense', '📚', '#f59e0b'),
  ('Personal Care', 'expense', '💅', '#d97706'),
  ('Gifts & Donations', 'expense', '🎁', '#b45309'),
  ('Travel', 'expense', '✈️', '#92400e'),
  ('Housing', 'expense', '🏠', '#3b82f6'),
  ('Insurance', 'expense', '🛡️', '#2563eb'),
  ('Other Expenses', 'expense', '📦', '#1e40af')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STORAGE BUCKETS (Run in Supabase Dashboard > Storage)
-- ============================================================

-- Create storage bucket for transaction attachments
-- INSERT INTO storage.buckets (id, name, public) VALUES ('transaction-attachments', 'transaction-attachments', false);

-- Storage RLS policies (Run in Supabase Dashboard > Storage > transaction-attachments > Policies)
/*
-- Users can upload to own folder
CREATE POLICY "Users can upload own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'transaction-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view own attachments
CREATE POLICY "Users can view own attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transaction-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete own attachments
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'transaction-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
*/

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check all tables were created
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 'app_settings', 'accounts', 'categories', 'transactions',
    'transaction_attachments', 'recurring_transactions', 'budgets',
    'budget_alerts', 'alert_notifications', 'investments', 'kpr', 'kpr_payments'
  )
ORDER BY table_name;

-- Check RLS is enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'app_settings', 'accounts', 'categories', 'transactions',
    'transaction_attachments', 'recurring_transactions', 'budgets',
    'budget_alerts', 'alert_notifications', 'investments', 'kpr', 'kpr_payments'
  )
ORDER BY tablename;

-- ============================================================
-- END OF SCHEMA
-- ============================================================

SELECT 'Database schema created successfully! ✅' as status;
