-- ============================================================
-- ADD ACCOUNT BALANCE HISTORY LOG
-- ============================================================
-- Version: 2.1.2
-- Date: 2025-01-05
-- Description: Track all account balance changes with history log
-- ============================================================

-- Create balance history table
CREATE TABLE IF NOT EXISTS account_balance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  old_balance DECIMAL(15, 2) NOT NULL,
  new_balance DECIMAL(15, 2) NOT NULL,
  change_amount DECIMAL(15, 2) NOT NULL,
  change_type TEXT CHECK (change_type IN ('increase', 'decrease', 'manual_adjustment')) NOT NULL,
  reason TEXT,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_balance_history_account ON account_balance_history(account_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_user ON account_balance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_created ON account_balance_history(created_at DESC);

COMMENT ON TABLE account_balance_history IS 'Log of all account balance changes';
COMMENT ON COLUMN account_balance_history.change_type IS 'Type of change: increase (income/deposit), decrease (expense/withdrawal), manual_adjustment';
COMMENT ON COLUMN account_balance_history.reason IS 'Human-readable reason for the change (e.g., "Transaction: Salary", "Manual adjustment", "Debt payment")';
COMMENT ON COLUMN account_balance_history.transaction_id IS 'Reference to transaction if change was caused by a transaction';

-- ============================================================
-- TRIGGER: Auto-log balance changes
-- ============================================================

-- Function to log balance changes WITH TRANSACTION CONTEXT
CREATE OR REPLACE FUNCTION log_account_balance_change()
RETURNS TRIGGER AS $$
DECLARE
  v_latest_transaction RECORD;
  v_reason TEXT := '✏️ Manual balance adjustment';
  v_transaction_id UUID := NULL;
BEGIN
  -- Only log if balance actually changed
  IF OLD.balance IS DISTINCT FROM NEW.balance THEN
    -- Try to find the most recent transaction that might have caused this change
    -- (within last 5 seconds to account for trigger timing)
    SELECT
      type,
      category,
      description,
      amount,
      id
    INTO v_latest_transaction
    FROM transactions
    WHERE account_id = NEW.id
      AND created_at >= NOW() - INTERVAL '5 seconds'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Build reason based on transaction if found
    IF v_latest_transaction.id IS NOT NULL THEN
      v_transaction_id := v_latest_transaction.id;

      IF v_latest_transaction.type = 'income' THEN
        v_reason := '💰 ' || COALESCE(v_latest_transaction.category, 'Income');
      ELSIF v_latest_transaction.type = 'expense' THEN
        v_reason := '💸 ' || COALESCE(v_latest_transaction.category, 'Expense');
      END IF;

      -- Add description if exists
      IF v_latest_transaction.description IS NOT NULL AND v_latest_transaction.description != '' THEN
        v_reason := v_reason || ': ' || v_latest_transaction.description;
      END IF;
    END IF;

    -- Insert balance history
    INSERT INTO account_balance_history (
      account_id,
      user_id,
      old_balance,
      new_balance,
      change_amount,
      change_type,
      reason,
      transaction_id
    ) VALUES (
      NEW.id,
      NEW.user_id,
      OLD.balance,
      NEW.balance,
      NEW.balance - OLD.balance,
      CASE
        WHEN NEW.balance > OLD.balance THEN 'increase'
        WHEN NEW.balance < OLD.balance THEN 'decrease'
        ELSE 'manual_adjustment'
      END,
      v_reason,
      v_transaction_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on accounts table
DROP TRIGGER IF EXISTS trigger_log_balance_change ON accounts;
CREATE TRIGGER trigger_log_balance_change
  AFTER UPDATE OF balance ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION log_account_balance_change();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE account_balance_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own balance history
CREATE POLICY "Users can view own balance history"
  ON account_balance_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own balance history (for manual logs)
CREATE POLICY "Users can insert own balance history"
  ON account_balance_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- HELPER FUNCTION: Get balance history for account
-- ============================================================

-- Function to get formatted balance history
CREATE OR REPLACE FUNCTION get_account_balance_history(
  p_account_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  old_balance DECIMAL(15, 2),
  new_balance DECIMAL(15, 2),
  change_amount DECIMAL(15, 2),
  change_type TEXT,
  reason TEXT,
  transaction_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.old_balance,
    h.new_balance,
    h.change_amount,
    h.change_type,
    h.reason,
    h.transaction_id,
    h.created_at
  FROM account_balance_history h
  WHERE h.account_id = p_account_id
    AND h.user_id = auth.uid()
  ORDER BY h.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SAMPLE QUERIES
-- ============================================================

-- Get balance history for specific account
-- SELECT * FROM get_account_balance_history('account-uuid-here', 20);

-- Get all balance changes in last 30 days
-- SELECT * FROM account_balance_history
-- WHERE user_id = auth.uid()
--   AND created_at >= NOW() - INTERVAL '30 days'
-- ORDER BY created_at DESC;

-- Get summary of balance changes per account
-- SELECT
--   a.account_name,
--   COUNT(*) as total_changes,
--   SUM(CASE WHEN h.change_type = 'increase' THEN 1 ELSE 0 END) as increases,
--   SUM(CASE WHEN h.change_type = 'decrease' THEN 1 ELSE 0 END) as decreases
-- FROM account_balance_history h
-- JOIN accounts a ON h.account_id = a.id
-- WHERE h.user_id = auth.uid()
-- GROUP BY a.account_name;
