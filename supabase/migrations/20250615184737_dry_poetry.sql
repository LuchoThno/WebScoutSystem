/*
  # Dirigentes Data Optimization

  1. New Indexes
     - Add performance indexes for dirigentes filtering
     - Improve name search functionality
     - Optimize cargo and grupo filtering

  2. Schema Improvements
     - Add check constraint for dirigente estado
     - Add default values for estado, documentacion_completa y fecha_registro
*/

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_dirigentes_nombre ON dirigentes(nombre);
CREATE INDEX IF NOT EXISTS idx_dirigentes_cargo_grupo ON dirigentes(cargo, grupo_asignado);

-- Add check constraint for dirigente estado if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_dirigente_estado'
      AND conrelid = 'dirigentes'::regclass
  ) THEN
    ALTER TABLE dirigentes
    ADD CONSTRAINT check_dirigente_estado
    CHECK (estado IN ('activo', 'inactivo', 'licencia', 'suspendido'));
  END IF;
END $$;

-- Add default values if not already set
DO $$
DECLARE
  current_default TEXT;
BEGIN
  -- Default for estado
  SELECT column_default INTO current_default
  FROM information_schema.columns
  WHERE table_name = 'dirigentes' AND column_name = 'estado';

  IF current_default IS DISTINCT FROM '''activo''' THEN
    ALTER TABLE dirigentes
    ALTER COLUMN estado SET DEFAULT 'activo';
  END IF;

  -- Default for documentacion_completa
  SELECT column_default INTO current_default
  FROM information_schema.columns
  WHERE table_name = 'dirigentes' AND column_name = 'documentacion_completa';

  IF current_default IS DISTINCT FROM 'false' THEN
    ALTER TABLE dirigentes
    ALTER COLUMN documentacion_completa SET DEFAULT false;
  END IF;

  -- Default for fecha_registro
  SELECT column_default INTO current_default
  FROM information_schema.columns
  WHERE table_name = 'dirigentes' AND column_name = 'fecha_registro';

  IF current_default IS DISTINCT FROM 'CURRENT_TIMESTAMP' THEN
    ALTER TABLE dirigentes
    ALTER COLUMN fecha_registro SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;