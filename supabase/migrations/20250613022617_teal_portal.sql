-- Asegura RLS activado en todas las tablas
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_reports ENABLE ROW LEVEL SECURITY;

-- Crear políticas solo si no existen
DO $$
BEGIN
  -- TRANSACTIONS
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' AND policyname = 'Allow all operations for anon'
  ) THEN
    CREATE POLICY "Allow all operations for anon" ON public.transactions
      FOR ALL TO anon
      USING (true)
      WITH CHECK (true);
  END IF;

  -- BUDGETS
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'budgets' AND policyname = 'Allow all operations for anon'
  ) THEN
    CREATE POLICY "Allow all operations for anon" ON public.budgets
      FOR ALL TO anon
      USING (true)
      WITH CHECK (true);
  END IF;

  -- FINANCIAL REPORTS
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'financial_reports' AND policyname = 'Allow all operations for anon'
  ) THEN
    CREATE POLICY "Allow all operations for anon" ON public.financial_reports
      FOR ALL TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;