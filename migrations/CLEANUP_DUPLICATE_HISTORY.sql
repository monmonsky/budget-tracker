-- ============================================================
-- CLEANUP DUPLICATE BALANCE HISTORY ENTRIES
-- ============================================================
-- Remove duplicate entries keeping only the oldest one
-- Run this BEFORE applying the fix
-- ============================================================

-- First, let's see what duplicates exist
SELECT
  transaction_id,
  account_id,
  COUNT(*) as duplicate_count
FROM account_balance_history
WHERE transaction_id IS NOT NULL
GROUP BY transaction_id, account_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Delete duplicate entries, keeping only the first one (oldest created_at)
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY transaction_id, account_id
      ORDER BY created_at ASC
    ) as rn
  FROM account_balance_history
  WHERE transaction_id IS NOT NULL
)
DELETE FROM account_balance_history
WHERE id IN (
  SELECT id
  FROM duplicates
  WHERE rn > 1
);

-- Verify cleanup
SELECT
  'Total entries' as metric,
  COUNT(*) as count
FROM account_balance_history
UNION ALL
SELECT
  'Entries with transaction_id' as metric,
  COUNT(*) as count
FROM account_balance_history
WHERE transaction_id IS NOT NULL
UNION ALL
SELECT
  'Duplicate entries' as metric,
  COUNT(*) as count
FROM (
  SELECT transaction_id, account_id
  FROM account_balance_history
  WHERE transaction_id IS NOT NULL
  GROUP BY transaction_id, account_id
  HAVING COUNT(*) > 1
) duplicates;
