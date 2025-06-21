/*
  # Transaction Query Optimizations

  1. New Indexes
     - Add performance indexes for transaction filtering
     - Improve date range queries
     - Optimize category filtering

  2. Schema Improvements
     - Add check constraint for transaction types
     - Add default values for created_at
*/

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_type_category ON transactions(type, category);
CREATE INDEX IF NOT EXISTS idx_transactions_date_range ON transactions(date);

-- Add check constraint for transaction types (only if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_transaction_type'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT check_transaction_type
    CHECK (type IN ('income', 'expense'));
  END IF;
END $$;

-- Add default value for created_at (if not already set)
DO $$
DECLARE
  current_default TEXT;
BEGIN
  SELECT column_default INTO current_default
  FROM information_schema.columns
  WHERE table_name = 'transactions'
    AND column_name = 'created_at';

  IF current_default IS DISTINCT FROM 'CURRENT_TIMESTAMP' THEN
    ALTER TABLE transactions
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;