-- Migration: Add Recurring Transactions Feature
-- Run this in Supabase SQL Editor if you already have an existing database
-- For new installations, use FULL_SCHEMA.sql instead

-- ============================================================
-- CREATE TABLE
-- ============================================================

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

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next_occurrence ON recurring_transactions(next_occurrence);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(is_active);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view all household recurring transactions" ON recurring_transactions;
DROP POLICY IF EXISTS "Users can insert recurring transactions" ON recurring_transactions;
DROP POLICY IF EXISTS "Users can update recurring transactions" ON recurring_transactions;
DROP POLICY IF EXISTS "Users can delete recurring transactions" ON recurring_transactions;

-- Create RLS policies (household access)
CREATE POLICY "Users can view all household recurring transactions" ON recurring_transactions
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert recurring transactions" ON recurring_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update recurring transactions" ON recurring_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete recurring transactions" ON recurring_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER update_recurring_transactions_updated_at
  BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE recurring_transactions IS 'Recurring transaction templates (auto-generate monthly/weekly/yearly transactions)';
COMMENT ON COLUMN recurring_transactions.template_name IS 'Friendly name for this recurring transaction (e.g., "Gaji Bulanan", "Netflix Subscription")';
COMMENT ON COLUMN recurring_transactions.frequency IS 'How often this recurs: daily, weekly, monthly, yearly, or custom';
COMMENT ON COLUMN recurring_transactions.custom_interval_days IS 'For custom frequency: number of days between occurrences';
COMMENT ON COLUMN recurring_transactions.next_occurrence IS 'Next date when this transaction should be generated';
COMMENT ON COLUMN recurring_transactions.last_generated IS 'Last date when a transaction was generated from this template';
COMMENT ON COLUMN recurring_transactions.auto_create IS 'If true, automatically create transaction when due (requires background job)';

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Verify table was created
SELECT 'recurring_transactions table created successfully!' as status
WHERE EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'recurring_transactions'
);
