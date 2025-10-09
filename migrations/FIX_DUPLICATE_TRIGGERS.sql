-- ============================================================
-- FIX DUPLICATE TRIGGER ISSUE
-- ============================================================
-- This script ensures only ONE trigger exists for each action
-- Run this to fix duplicate balance updates
-- ============================================================

-- Drop all existing triggers first to clean up
DROP TRIGGER IF EXISTS trigger_update_balance_on_insert ON transactions;
DROP TRIGGER IF EXISTS trigger_update_balance_on_delete ON transactions;
DROP TRIGGER IF EXISTS trigger_update_balance_on_update ON transactions;
DROP TRIGGER IF EXISTS trigger_log_balance_change ON accounts;

-- Re-create balance update triggers on transactions table
CREATE TRIGGER trigger_update_balance_on_insert
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_insert();

CREATE TRIGGER trigger_update_balance_on_delete
  AFTER DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_delete();

CREATE TRIGGER trigger_update_balance_on_update
  AFTER UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_update();

-- Re-create balance history logging trigger on accounts table
CREATE TRIGGER trigger_log_balance_change
  AFTER UPDATE OF balance ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION log_account_balance_change();

-- Verify triggers
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table IN ('transactions', 'accounts')
  AND trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
