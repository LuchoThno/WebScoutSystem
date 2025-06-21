/*
  # Scout Data Optimization

  1. New Indexes
     - Add performance indexes for scout filtering
     - Improve name search functionality
     - Optimize group and status filtering

  2. Schema Improvements
     - Add check constraint for scout status
     - Add default values for registration_date and status
     - Add foreign key constraints for related tables
*/

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_scouts_name ON scouts(name);
CREATE INDEX IF NOT EXISTS idx_scouts_group_status ON scouts(group_section, status);

-- Add check constraint for scout status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_scout_status'
      AND conrelid = 'scouts'::regclass
  ) THEN
    ALTER TABLE scouts
    ADD CONSTRAINT check_scout_status
    CHECK (status IN ('activo', 'inactivo', 'suspendido'));
  END IF;
END $$;

-- Add default values if not already present
DO $$
DECLARE
  current_default TEXT;
BEGIN
  -- Set default for status
  SELECT column_default INTO current_default
  FROM information_schema.columns
  WHERE table_name = 'scouts' AND column_name = 'status';

  IF current_default IS DISTINCT FROM '''activo''' THEN
    ALTER TABLE scouts
    ALTER COLUMN status SET DEFAULT 'activo';
  END IF;

  -- Set default for registration_date
  SELECT column_default INTO current_default
  FROM information_schema.columns
  WHERE table_name = 'scouts' AND column_name = 'registration_date';

  IF current_default IS DISTINCT FROM 'CURRENT_TIMESTAMP' THEN
    ALTER TABLE scouts
    ALTER COLUMN registration_date SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Add foreign key constraints if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_medical_records_scout'
      AND table_name = 'medical_records'
  ) THEN
    ALTER TABLE medical_records
    ADD CONSTRAINT fk_medical_records_scout
    FOREIGN KEY (scout_id) REFERENCES scouts(id)
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_documentation_records_scout'
      AND table_name = 'documentation_records'
  ) THEN
    ALTER TABLE documentation_records
    ADD CONSTRAINT fk_documentation_records_scout
    FOREIGN KEY (scout_id) REFERENCES scouts(id)
    ON DELETE CASCADE;
  END IF;
END $$;