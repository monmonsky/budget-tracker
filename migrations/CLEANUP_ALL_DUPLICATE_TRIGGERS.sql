-- ============================================================
-- CLEANUP ALL DUPLICATE TRIGGERS
-- ============================================================
-- Drop ALL existing triggers to clean slate
-- ============================================================

-- Drop all triggers found on transactions table
DROP TRIGGER IF EXISTS check_budget_after_transaction ON transactions CASCADE;
DROP TRIGGER IF EXISTS transaction_delete_balance_trigger ON transactions CASCADE;
DROP TRIGGER IF EXISTS transaction_insert_balance_trigger ON transactions CASCADE;
DROP TRIGGER IF EXISTS transaction_update_balance_trigger ON transactions CASCADE;
DROP TRIGGER IF EXISTS trigger_update_balance_on_delete ON transactions CASCADE;
DROP TRIGGER IF EXISTS trigger_update_balance_on_insert ON transactions CASCADE;
DROP TRIGGER IF EXISTS trigger_update_balance_on_update ON transactions CASCADE;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions CASCADE;

-- Drop any other potential duplicates
DROP TRIGGER IF EXISTS update_balance_on_insert ON transactions CASCADE;
DROP TRIGGER IF EXISTS auto_update_balance ON transactions CASCADE;
DROP TRIGGER IF EXISTS trigger_auto_update_balance ON transactions CASCADE;

-- ============================================================
-- RECREATE ONLY NECESSARY TRIGGERS
-- ============================================================

-- 1. Trigger to auto-update balance when transaction is inserted
CREATE TRIGGER trigger_update_balance_on_insert
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_insert();

-- 2. Trigger to auto-update balance when transaction is deleted
CREATE TRIGGER trigger_update_balance_on_delete
  AFTER DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_delete();

-- 3. Trigger to auto-update balance when transaction is updated
CREATE TRIGGER trigger_update_balance_on_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_update();

-- 4. Trigger to update updated_at timestamp
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Budget check trigger (if function exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'check_budget_after_transaction'
  ) THEN
    EXECUTE 'CREATE TRIGGER check_budget_after_transaction
      AFTER INSERT ON transactions
      FOR EACH ROW
      EXECUTE FUNCTION check_budget_after_transaction()';
  END IF;
END $$;

-- ============================================================
-- VERIFY CLEANUP
-- ============================================================

-- Should show only 4-5 triggers now
SELECT
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'transactions'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Expected result:
-- check_budget_after_transaction (if exists)
-- trigger_update_balance_on_delete
-- trigger_update_balance_on_insert
-- trigger_update_balance_on_update
-- update_transactions_updated_at
