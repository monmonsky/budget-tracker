-- ============================================================
-- DEBUG AND FIX DOUBLE BALANCE UPDATE
-- ============================================================

-- STEP 1: Check if there are duplicate triggers on transactions table
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'transactions'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- STEP 2: Drop ALL triggers on transactions to clean slate
DROP TRIGGER IF EXISTS trigger_update_balance_on_insert ON transactions CASCADE;
DROP TRIGGER IF EXISTS trigger_update_balance_on_delete ON transactions CASCADE;
DROP TRIGGER IF EXISTS trigger_update_balance_on_update ON transactions CASCADE;

-- Also drop any potential duplicates with different names
DROP TRIGGER IF EXISTS update_balance_on_insert ON transactions CASCADE;
DROP TRIGGER IF EXISTS auto_update_balance ON transactions CASCADE;
DROP TRIGGER IF EXISTS trigger_auto_update_balance ON transactions CASCADE;

-- STEP 3: Recreate the function with better logic and protection
CREATE OR REPLACE FUNCTION update_account_balance_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_current_balance DECIMAL(15, 2);
BEGIN
  -- Add protection: only update if not internal transfer
  -- and amount is positive
  IF NEW.is_internal_transfer = false AND NEW.amount > 0 THEN

    IF NEW.type = 'income' THEN
      -- Update balance for income
      UPDATE accounts
      SET balance = balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;

      RAISE NOTICE 'Income +% added to account %', NEW.amount, NEW.account_id;

    ELSIF NEW.type = 'expense' THEN
      -- Update balance for expense
      UPDATE accounts
      SET balance = balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;

      RAISE NOTICE 'Expense -% subtracted from account %', NEW.amount, NEW.account_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Create ONLY ONE trigger for INSERT
CREATE TRIGGER trigger_update_balance_on_insert
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_insert();

-- STEP 5: Recreate other triggers
CREATE OR REPLACE FUNCTION update_account_balance_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_internal_transfer = false THEN
    IF OLD.type = 'income' THEN
      UPDATE accounts
      SET balance = balance - OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE accounts
      SET balance = balance + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_balance_on_delete
  AFTER DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_delete();

CREATE OR REPLACE FUNCTION update_account_balance_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Reverse old transaction (if not internal transfer)
  IF OLD.is_internal_transfer = false THEN
    IF OLD.type = 'income' THEN
      UPDATE accounts
      SET balance = balance - OLD.amount
      WHERE id = OLD.account_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE accounts
      SET balance = balance + OLD.amount
      WHERE id = OLD.account_id;
    END IF;
  END IF;

  -- Apply new transaction (if not internal transfer)
  IF NEW.is_internal_transfer = false THEN
    IF NEW.type = 'income' THEN
      UPDATE accounts
      SET balance = balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE accounts
      SET balance = balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_balance_on_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_update();

-- STEP 6: Verify only 3 triggers exist
SELECT
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'transactions'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Should show exactly 3 triggers:
-- 1. trigger_update_balance_on_delete
-- 2. trigger_update_balance_on_insert
-- 3. trigger_update_balance_on_update
