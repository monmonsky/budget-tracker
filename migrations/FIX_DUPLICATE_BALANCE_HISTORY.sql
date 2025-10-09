-- ============================================================
-- FIX DUPLICATE BALANCE HISTORY ENTRIES
-- ============================================================
-- Modified trigger to prevent duplicate balance history entries
-- for the same transaction
-- ============================================================

-- Drop and recreate the trigger function with duplicate prevention
CREATE OR REPLACE FUNCTION log_account_balance_change()
RETURNS TRIGGER AS $$
DECLARE
  v_latest_transaction RECORD;
  v_reason TEXT := '✏️ Manual balance adjustment';
  v_transaction_id UUID := NULL;
  v_existing_count INTEGER := 0;
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

      -- Check if we already logged this transaction
      -- This prevents duplicate entries for the same transaction
      SELECT COUNT(*)
      INTO v_existing_count
      FROM account_balance_history
      WHERE transaction_id = v_transaction_id
        AND account_id = NEW.id;

      -- If already logged, skip this entry
      IF v_existing_count > 0 THEN
        RAISE NOTICE 'Skipping duplicate balance history for transaction %', v_transaction_id;
        RETURN NEW;
      END IF;

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

-- Add unique constraint to prevent duplicates at database level
-- This will fail if duplicate exists, but good for future prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_balance_history_unique_transaction
  ON account_balance_history (account_id, transaction_id)
  WHERE transaction_id IS NOT NULL;

COMMENT ON INDEX idx_balance_history_unique_transaction IS 'Prevent duplicate balance history entries for the same transaction';
