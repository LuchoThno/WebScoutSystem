/*
  # Financial Management Tables

  1. New Tables
    - `transactions` - Stores all financial transactions (income and expenses)
    - `budgets` - Stores budget configurations for different categories
    - `financial_reports` - Stores generated financial reports

  2. Security
    - Enable RLS on all tables
    - Add policies for basic access
*/

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period);

-- Financial Reports Table
CREATE TABLE IF NOT EXISTS financial_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  data JSONB NOT NULL,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_reports_type ON financial_reports(type);
CREATE INDEX IF NOT EXISTS idx_financial_reports_date_range ON financial_reports(start_date, end_date);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE financial_reports ALTER COLUMN created_by TYPE uuid USING created_by::uuid;

--Borra las políticas abiertas a anon
DROP POLICY IF EXISTS "Allow all operations for anon" ON transactions;
DROP POLICY IF EXISTS "Allow all operations for anon" ON budgets;
DROP POLICY IF EXISTS "Allow all operations for anon" ON financial_reports;

--Crea politicas por usuarios
CREATE POLICY "Select own" ON transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Insert own" ON transactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update own" ON transactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Delete own" ON transactions
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);



-- In a production environment, you would create more restrictive policies
-- For example:
-- CREATE POLICY "Allow read for authenticated users" ON transactions FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Allow write for admin users" ON transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));