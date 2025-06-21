-- Extensión necesaria para UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla: transactions
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

CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- Tabla: budgets
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

-- Tabla: financial_reports
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

-- Habilita RLS (no se puede condicionar directamente, se aplica igual)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- Políticas (condicionales por nombre)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow all operations for anon'
    AND tablename = 'transactions'
  ) THEN
    CREATE POLICY "Allow all operations for anon" 
    ON transactions FOR ALL TO anon 
    USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow all operations for anon'
    AND tablename = 'budgets'
  ) THEN
    CREATE POLICY "Allow all operations for anon" 
    ON budgets FOR ALL TO anon 
    USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow all operations for anon'
    AND tablename = 'financial_reports'
  ) THEN
    CREATE POLICY "Allow all operations for anon" 
    ON financial_reports FOR ALL TO anon 
    USING (true) WITH CHECK (true);
  END IF;
END $$;