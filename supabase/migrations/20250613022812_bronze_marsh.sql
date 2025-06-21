/*
  # Comprehensive Policy Fix

  1. Policy Cleanup
    - Drops all existing policies on all tables
    - Uses dynamic SQL to avoid hardcoding table names
  
  2. Security
    - Re-enables RLS on all tables
    - Creates consistent policies with unique names
  
  3. Error Handling
    - Uses PL/pgSQL exception handling
    - Logs any errors that occur during execution
*/

-- Create a temporary table to log errors
CREATE TEMPORARY TABLE IF NOT EXISTS migration_log (
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  operation TEXT,
  table_name TEXT,
  message TEXT
);

-- Main migration function
DO $$
DECLARE
  table_record RECORD;
  policy_record RECORD;
  policy_count INT;
  error_message TEXT;
BEGIN
  -- Log start of migration
  INSERT INTO migration_log (operation, message)
  VALUES ('START', 'Beginning comprehensive policy fix');

  -- First pass: Drop all existing policies on all tables
  FOR table_record IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    BEGIN
      -- Get all policies for this table
      FOR policy_record IN
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = table_record.tablename
      LOOP
        BEGIN
          -- Drop each policy
         EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.%I', 
               policy_record.policyname, 
               table_record.tablename);
          
          -- Log successful policy drop
          INSERT INTO migration_log (operation, table_name, message)
          VALUES ('DROP_POLICY', table_record.tablename, 
                  'Successfully dropped policy: ' || policy_record.policyname);
        EXCEPTION WHEN OTHERS THEN
          -- Log error if policy drop fails
          GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
          INSERT INTO migration_log (operation, table_name, message)
          VALUES ('ERROR', table_record.tablename, 
                  'Failed to drop policy ' || policy_record.policyname || ': ' || error_message);
        END;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      -- Log error if policy enumeration fails
      GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
      INSERT INTO migration_log (operation, table_name, message)
      VALUES ('ERROR', table_record.tablename, 
              'Failed to enumerate policies: ' || error_message);
    END;
  END LOOP;

  -- Second pass: Enable RLS and create new policies for all tables
  FOR table_record IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    BEGIN
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', 
                     table_record.tablename);
      
      -- Create a new unified policy with a unique name for each table
      EXECUTE format('CREATE POLICY "unified_access_policy_%I" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', 
                     table_record.tablename,
                     table_record.tablename);
      
      -- Log successful policy creation
      INSERT INTO migration_log (operation, table_name, message)
      VALUES ('CREATE_POLICY', table_record.tablename, 
              'Successfully created unified policy for table');
    EXCEPTION WHEN OTHERS THEN
      -- Log error if policy creation fails
      GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
      INSERT INTO migration_log (operation, table_name, message)
      VALUES ('ERROR', table_record.tablename, 
              'Failed to create policy: ' || error_message);
    END;
  END LOOP;

  -- Log completion
  INSERT INTO migration_log (operation, message)
  VALUES ('COMPLETE', 'Comprehensive policy fix completed');
  
  -- Output log summary
  RAISE NOTICE 'Migration completed. See migration_log table for details.';
END $$;

-- Output the migration log for review
SELECT * FROM migration_log ORDER BY timestamp;

-- Clean up temporary table
DROP TABLE IF EXISTS migration_log;