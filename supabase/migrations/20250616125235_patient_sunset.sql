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

CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type_category ON transactions(type, category);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_reports_type ON financial_reports(type);
CREATE INDEX IF NOT EXISTS idx_financial_reports_date_range ON financial_reports(start_date, end_date);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (replace 'authenticated' role as needed)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transactions' AND policyname = 'unified_access_policy_transactions'
    ) THEN
        CREATE POLICY unified_access_policy_transactions ON transactions
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'budgets' AND policyname = 'unified_access_policy_budgets'
    ) THEN
        CREATE POLICY unified_access_policy_budgets ON budgets
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'financial_reports' AND policyname = 'unified_access_policy_financial_reports'
    ) THEN
        CREATE POLICY unified_access_policy_financial_reports ON financial_reports
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Views

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
  COALESCE(SUM(CASE WHEN type = 'income' THEN total END), 0) AS income,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN total END), 0) AS expenses,
  COALESCE(SUM(CASE WHEN type = 'income' THEN total ELSE -total END), 0) AS balance
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
  CASE 
    WHEN budget_amount > 0 THEN ROUND((spent_amount / budget_amount) * 100, 2)
    ELSE 0
  END AS percentage_used
FROM budget_totals
ORDER BY percentage_used DESC;