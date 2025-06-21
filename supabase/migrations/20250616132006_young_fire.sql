-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  period VARCHAR(20) NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Financial Reports Table
CREATE TABLE IF NOT EXISTS financial_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  data JSONB NOT NULL,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) if not enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'transactions' AND n.nspname = 'public' AND c.relrowsecurity
  ) THEN
    EXECUTE 'ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'budgets' AND n.nspname = 'public' AND c.relrowsecurity
  ) THEN
    EXECUTE 'ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'financial_reports' AND n.nspname = 'public' AND c.relrowsecurity
  ) THEN
    EXECUTE 'ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;';
  END IF;
END $$;

-- Create unified access policies for role "anon" if not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'unified_access_policy_transactions'
  ) THEN
    EXECUTE 'CREATE POLICY unified_access_policy_transactions ON transactions FOR ALL TO anon USING (true) WITH CHECK (true);';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'budgets' AND policyname = 'unified_access_policy_budgets'
  ) THEN
    EXECUTE 'CREATE POLICY unified_access_policy_budgets ON budgets FOR ALL TO anon USING (true) WITH CHECK (true);';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_reports' AND policyname = 'unified_access_policy_financial_reports'
  ) THEN
    EXECUTE 'CREATE POLICY unified_access_policy_financial_reports ON financial_reports FOR ALL TO anon USING (true) WITH CHECK (true);';
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type_category ON transactions(type, category);

CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period);

CREATE INDEX IF NOT EXISTS idx_financial_reports_type ON financial_reports(type);
CREATE INDEX IF NOT EXISTS idx_financial_reports_date_range ON financial_reports(start_date, end_date);