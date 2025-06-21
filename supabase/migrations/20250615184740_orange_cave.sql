/*
  # Financial Reporting Queries

  1. Purpose
     - Generate monthly financial summaries
     - Calculate category-based spending
     - Track budget compliance
     - Support financial decision making
*/

-- Monthly financial summary view
CREATE OR REPLACE VIEW monthly_financial_summary AS
WITH monthly_summary AS (
  SELECT
    date_trunc('month', date)::date AS month,
    type,
    SUM(amount) AS total
  FROM transactions
  WHERE date >= date_trunc('year', CURRENT_DATE)
  GROUP BY month, type
)
SELECT
  TO_CHAR(month, 'Month YYYY') AS month_name,
  month,
  ROUND(SUM(CASE WHEN type = 'income' THEN total ELSE 0 END), 2) AS total_income,
  ROUND(SUM(CASE WHEN type = 'expense' THEN total ELSE 0 END), 2) AS total_expense,
  ROUND(SUM(CASE WHEN type = 'income' THEN total ELSE -total END), 2) AS balance
FROM monthly_summary
GROUP BY month, month_name
ORDER BY month DESC;

-- Category spending analysis view
CREATE OR REPLACE VIEW category_spending_analysis AS
SELECT
  category,
  ROUND(SUM(amount), 2) AS total_spent,
  COUNT(*) AS transaction_count,
  ROUND(AVG(amount), 2) AS average_transaction,
  MIN(date) AS first_transaction,
  MAX(date) AS last_transaction
FROM transactions
WHERE type = 'expense'
  AND date >= date_trunc('month', CURRENT_DATE)
GROUP BY category
ORDER BY total_spent DESC;

-- Budget compliance check view
CREATE OR REPLACE VIEW budget_compliance AS
WITH budget_totals AS (
  SELECT
    b.category,
    b.amount AS budget_amount,
    COALESCE(SUM(t.amount), 0) AS spent_amount
  FROM budgets b
  LEFT JOIN transactions t 
    ON t.category = b.category 
   AND t.type = 'expense'
   AND t.date >= date_trunc('month', CURRENT_DATE)
  GROUP BY b.category, b.amount
)
SELECT
  category,
  budget_amount,
  spent_amount,
  ROUND(budget_amount - spent_amount, 2) AS remaining,
  spent_amount > budget_amount AS over_budget,
  CASE 
    WHEN budget_amount = 0 THEN 0
    ELSE ROUND((spent_amount / budget_amount) * 100, 2)
  END AS percentage_used
FROM budget_totals
ORDER BY percentage_used DESC;