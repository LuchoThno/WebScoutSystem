-- Agrega las extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Transactions Table (con created_by)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_by uuid NOT NULL,  -- se relaciona con auth.uid()
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(created_by);

-- Crear tabla user_profiles para guardar el rol

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now()
);
-- Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  description TEXT,
  created_by uuid NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Financial Reports Table
CREATE TABLE IF NOT EXISTS financial_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  data JSONB NOT NULL,
  created_by uuid NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
--Auditoria
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id uuid,
  user_id uuid,
  timestamp timestamptz DEFAULT now(),
  details jsonb
);
-- log auditoria 
CREATE OR REPLACE FUNCTION log_audit_event() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_log (table_name, action, record_id, user_id, details)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    NEW.id,
    auth.uid(),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_transactions ON transactions;
CREATE TRIGGER trg_audit_transactions
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_budgets
AFTER INSERT OR UPDATE OR DELETE ON budgets
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_reports
AFTER INSERT OR UPDATE OR DELETE ON financial_reports
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['transactions', 'budgets', 'financial_reports'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Select own" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Insert own" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Update own" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Delete own" ON %I', tbl);
  END LOOP;
END $$;

-- Transactions Policies
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

-- Budgets Policies
CREATE POLICY "Select own" ON budgets
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Insert own" ON budgets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update own" ON budgets
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Delete own" ON budgets
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Financial Reports Policies
CREATE POLICY "Select own" ON financial_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Insert own" ON financial_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update own" ON financial_reports
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Delete own" ON financial_reports
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);
