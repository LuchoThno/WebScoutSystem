/*
  # Financial management tables

  1. New Tables
    - `transactions` - Stores income and expense transactions
    - `budgets` - Stores budget allocations by category
    - `financial_reports` - Stores generated financial reports

  2. Security
    - Enable RLS on all tables
    - Add policies for anonymous access (for development)
*/

-- Create transactions table
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

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  period VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create financial reports table
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

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- Create basic policies for development
CREATE POLICY "Allow all operations for anon" ON transactions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON budgets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON financial_reports FOR ALL TO anon USING (true) WITH CHECK (true);