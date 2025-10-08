-- ============================================================
-- ADD CREDIT CARD SUPPORT
-- ============================================================
-- Version: 2.1.1
-- Date: 2025-01-05
-- Description: Add credit card account type and credit limit field
-- ============================================================

-- Add credit_card to account_type enum and add credit_limit column
ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_account_type_check;

ALTER TABLE accounts
  ADD CONSTRAINT accounts_account_type_check
  CHECK (account_type IN ('checking', 'savings', 'investment', 'crypto', 'debt', 'credit_card'));

-- Add credit_limit column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'credit_limit'
  ) THEN
    ALTER TABLE accounts ADD COLUMN credit_limit DECIMAL(15, 2);
  END IF;
END $$;

COMMENT ON COLUMN accounts.credit_limit IS 'Credit limit for credit card accounts (NULL for non-credit card accounts)';

-- Example credit card accounts (commented out - uncomment to add default data)
-- INSERT INTO accounts (user_id, account_name, account_type, bank_name, balance, credit_limit, owner, is_active)
-- VALUES
--   (auth.uid(), 'Jenius Visa', 'credit_card', 'Jenius', -2500000, 50000000, 'husband', true),
--   (auth.uid(), 'BCA Mastercard', 'credit_card', 'BCA', -5000000, 100000000, 'wife', true),
--   (auth.uid(), 'Tokopedia CC', 'credit_card', 'Tokopedia', 0, 20000000, 'husband', true);

-- Note: Credit card balance should be negative for outstanding amount
-- Example: balance = -5000000 means you owe 5,000,000
-- Example: balance = 0 means no outstanding balance
