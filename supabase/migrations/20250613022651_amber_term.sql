-- Asegura que todas las tablas existen con la columna `created_by` para control por usuario
ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS created_by uuid NOT NULL;
ALTER TABLE IF EXISTS public.budgets ADD COLUMN IF NOT EXISTS created_by uuid NOT NULL;
ALTER TABLE IF EXISTS public.financial_reports ADD COLUMN IF NOT EXISTS created_by uuid NOT NULL;

-- Habilita RLS en todas las tablas
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

-- Elimina todas las políticas existentes
DO $$
DECLARE
  policy_name text;
  table_name text;
BEGIN
  FOR table_name IN SELECT unnest(ARRAY['transactions', 'budgets', 'financial_reports']) LOOP
    FOR policy_name IN
      SELECT policyname FROM pg_policies WHERE tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS "%I" ON public.%I', policy_name, table_name);
    END LOOP;
  END LOOP;
END $$;

-- Políticas de seguridad por usuario

-- Transactions
CREATE POLICY "Select own" ON public.transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Insert own" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update own" ON public.transactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Delete own" ON public.transactions
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Budgets
CREATE POLICY "Select own" ON public.budgets
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Insert own" ON public.budgets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update own" ON public.budgets
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Delete own" ON public.budgets
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Financial Reports
CREATE POLICY "Select own" ON public.financial_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Insert own" ON public.financial_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update own" ON public.financial_reports
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Delete own" ON public.financial_reports
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);