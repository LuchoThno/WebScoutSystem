-- Migración para tablas financieras, con creación condicional y seguridad básica

-- Tabla transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID NOT NULL  -- Control de propietario
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type_category ON transactions(type, category);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);

-- Tabla budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period);
CREATE INDEX IF NOT EXISTS idx_budgets_created_by ON budgets(created_by);

-- Tabla financial_reports
CREATE TABLE IF NOT EXISTS financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  data JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_financial_reports_type ON financial_reports(type);
CREATE INDEX IF NOT EXISTS idx_financial_reports_date_range ON financial_reports(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_financial_reports_created_by ON financial_reports(created_by);

-- Habilitar Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- Políticas RLS con control por propietario y roles

DO $$
BEGIN
  -- Transactions policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transactions' AND policyname='select_transactions') THEN
    CREATE POLICY select_transactions ON transactions
      FOR SELECT TO anon, authenticated_user
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transactions' AND policyname='modify_transactions') THEN
    CREATE POLICY modify_transactions ON transactions
      FOR INSERT, UPDATE, DELETE TO authenticated_user
      USING (created_by = current_setting('app.current_user_id')::uuid)
      WITH CHECK (created_by = current_setting('app.current_user_id')::uuid);
  END IF;

  -- Budgets policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='budgets' AND policyname='select_budgets') THEN
    CREATE POLICY select_budgets ON budgets
      FOR SELECT TO anon, authenticated_user
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='budgets' AND policyname='modify_budgets') THEN
    CREATE POLICY modify_budgets ON budgets
      FOR INSERT, UPDATE, DELETE TO authenticated_user
      USING (created_by = current_setting('app.current_user_id')::uuid)
      WITH CHECK (created_by = current_setting('app.current_user_id')::uuid);
  END IF;

  -- Financial Reports policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financial_reports' AND policyname='select_reports') THEN
    CREATE POLICY select_reports ON financial_reports
      FOR SELECT TO anon, authenticated_user
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financial_reports' AND policyname='modify_reports') THEN
    CREATE POLICY modify_reports ON financial_reports
      FOR INSERT, UPDATE, DELETE TO authenticated_user
      USING (created_by = current_setting('app.current_user_id')::uuid)
      WITH CHECK (created_by = current_setting('app.current_user_id')::uuid);
  END IF;
END
$$;

-- Vistas para análisis financiero

CREATE OR REPLACE VIEW monthly_financial_summary AS
WITH monthly_summary AS (
  SELECT
    date_trunc('month', date) AS month,
    type,
    SUM(amount) AS total
  FROM transactions
  WHERE date >= date_trunc('year', CURRENT_DATE)
  GROUP BY month, type
)
SELECT
  to_char(month, 'Month YYYY') AS month_name,
  month,
  SUM(CASE WHEN type = 'income' THEN total ELSE 0 END) AS income,
  SUM(CASE WHEN type = 'expense' THEN total ELSE 0 END) AS expenses,
  SUM(CASE WHEN type = 'income' THEN total ELSE -total END) AS balance
FROM monthly_summary
GROUP BY month, month_name
ORDER BY month DESC;

CREATE OR REPLACE VIEW category_spending_analysis AS
SELECT
  category,
  SUM(amount) AS total_spent,
  COUNT(*) AS transaction_count,
  AVG(amount) AS average_transaction,
  MIN(date) AS first_transaction,
  MAX(date) AS last_transaction
FROM transactions
WHERE type = 'expense'
  AND date >= date_trunc('month', CURRENT_DATE)
GROUP BY category
ORDER BY total_spent DESC;

CREATE OR REPLACE VIEW budget_compliance AS
WITH budget_totals AS (
  SELECT
    b.category,
    b.amount AS budget_amount,
    COALESCE(SUM(t.amount), 0) AS spent_amount
  FROM budgets b
  LEFT JOIN transactions t ON 
    b.category = t.category
    AND t.type = 'expense'
    AND t.date >= date_trunc('month', CURRENT_DATE)
  WHERE b.period = 'monthly'
  GROUP BY b.category, b.amount
)
SELECT
  category,
  budget_amount,
  spent_amount,
  budget_amount - spent_amount AS remaining,
  (spent_amount > budget_amount) AS over_budget,
  CASE WHEN budget_amount = 0 THEN 0 ELSE ROUND((spent_amount / budget_amount)*100, 2) END AS percentage_used
FROM budget_totals
ORDER BY percentage_used DESC;