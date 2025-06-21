/*
  # Fix policy conflicts - Versión corregida

  1. Cambios:
     - Elimina políticas existentes de forma segura
     - Crea nuevas políticas unificadas con nombre estándar
     - Asegura que RLS esté habilitado en todas las tablas relevantes

  2. Seguridad:
     - Aplica políticas abiertas (usar con precaución en producción)
     - Todas las tablas tienen acceso TOTAL para "anon"
*/

-- Paso 1: Eliminar políticas conflictivas existentes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE tablename IN (
            'transactions', 'budgets', 'financial_reports', 'scouts', 'medical_records',
            'attendance', 'documentation_records', 'dirigentes', 'activities', 'inventory',
            'educational_materials', 'equipment', 'locations', 'news', 'contacts',
            'system_users', 'audit_log'
        )
        AND policyname IN ('Allow all operations', 'Allow all operations for anon', 'Allow all operations for all users')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%I" ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Paso 2: Crear políticas nuevas unificadas
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'transactions', 'budgets', 'financial_reports', 'scouts', 'medical_records',
            'attendance', 'documentation_records', 'dirigentes', 'activities', 'inventory',
            'educational_materials', 'equipment', 'locations', 'news', 'contacts',
            'system_users', 'audit_log'
        ])
    LOOP
        EXECUTE format('
            CREATE POLICY "Allow all operations for all users" ON public.%I
            FOR ALL TO anon
            USING (true)
            WITH CHECK (true);
        ', t);
    END LOOP;
END $$;

-- Paso 3: Asegurar que RLS está habilitado en todas las tablas
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;