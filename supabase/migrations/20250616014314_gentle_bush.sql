/*
  # Financial Management Schema - Mejorado y Optimizado
  
  1. Tablas con auditoría y control de propietario (created_by)
  2. RLS con políticas segregadas para lectura y escritura
  3. Variables de sesión para control fino de acceso
  4. Vistas para análisis financiero
*/

-- Tabla Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL,  -- Dueño / creador del registro
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type_category ON transactions(type, category);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);

-- Tabla Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE, -- Opcional para límite de vigencia
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period);
CREATE INDEX IF NOT EXISTS idx_budgets_created_by ON budgets(created_by);

-- Tabla Financial Reports
CREATE TABLE IF NOT EXISTS financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  data JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_financial_reports_type ON financial_reports(type);
CREATE INDEX IF NOT EXISTS idx_financial_reports_date_range ON financial_reports(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_financial_reports_created_by ON financial_reports(created_by);

-- Activar Row Level Security en tablas
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay (para evitar duplicados)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'transactions_select') THEN
    DROP POLICY transactions_select ON transactions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'transactions_modify') THEN
    DROP POLICY transactions_modify ON transactions;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budgets' AND policyname = 'budgets_select') THEN
    DROP POLICY budgets_select ON budgets;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budgets' AND policyname = 'budgets_modify') THEN
    DROP POLICY budgets_modify ON budgets;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financial_reports' AND policyname = 'financial_reports_select') THEN
    DROP POLICY financial_reports_select ON financial_reports;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financial_reports' AND policyname = 'financial_reports_modify') THEN
    DROP POLICY financial_reports_modify ON financial_reports;
  END IF;
END $$;

-- Políticas para Transactions
-- Permitir SELECT a todos (anon)
CREATE POLICY transactions_select ON transactions FOR SELECT TO anon USING (true);

-- Permitir INSERT, UPDATE, DELETE solo a usuarios autenticados si created_by coincide con el user actual
CREATE POLICY transactions_modify ON transactions FOR INSERT, UPDATE, DELETE TO authenticated_user
  USING (created_by = current_setting('app.current_user_id')::uuid)
  WITH CHECK (created_by = current_setting('app.current_user_id')::uuid);

-- Políticas para Budgets
CREATE POLICY budgets_select ON budgets FOR SELECT TO anon USING (true);
CREATE POLICY budgets_modify ON budgets FOR INSERT, UPDATE, DELETE TO authenticated_user
  USING (created_by = current_setting('app.current_user_id')::uuid)
  WITH CHECK (created_by = current_setting('app.current_user_id')::uuid);

-- Políticas para Financial Reports
CREATE POLICY financial_reports_select ON financial_reports FOR SELECT TO anon USING (true);
CREATE POLICY financial_reports_modify ON financial_reports FOR INSERT, UPDATE, DELETE TO authenticated_user
  USING (created_by = current_setting('app.current_user_id')::uuid)
  WITH CHECK (created_by = current_setting('app.current_user_id')::uuid);

-- Vistas para análisis financiero

-- Resumen mensual de ingresos y gastos
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

-- Análisis de gastos por categoría (mes actual)
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

-- Cumplimiento de presupuesto mensual
CREATE OR REPLACE VIEW budget_compliance AS
WITH budget_totals AS (
  SELECT
    b.category,
    b.amount AS budget_amount,
    COALESCE(SUM(t.amount), 0) AS spent_amount
  FROM budgets b
  LEFT JOIN transactions t ON 
    b.category = t.category AND
    t.type = 'expense' AND
    t.date >= date_trunc('month', CURRENT_DATE)
  WHERE b.period = 'monthly' AND (b.end_date IS NULL OR b.end_date >= CURRENT_DATE)
  GROUP BY b.category, b.amount
)
SELECT
  category,
  budget_amount,
  spent_amount,
  budget_amount - spent_amount AS remaining,
  CASE WHEN spent_amount > budget_amount THEN true ELSE false END AS over_budget,
  ROUND((spent_amount / NULLIF(budget_amount, 0)) * 100, 2) AS percentage_used
FROM budget_totals
ORDER BY percentage_used DESC;