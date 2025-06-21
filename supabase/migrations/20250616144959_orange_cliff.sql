-- 1. Añadir columnas para reset de contraseña si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_users' AND column_name = 'reset_token'
  ) THEN
    ALTER TABLE system_users ADD COLUMN reset_token TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_users' AND column_name = 'reset_expiry'
  ) THEN
    ALTER TABLE system_users ADD COLUMN reset_expiry TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_users' AND column_name = 'password_changed_at'
  ) THEN
    ALTER TABLE system_users ADD COLUMN password_changed_at TIMESTAMPTZ;
  END IF;
END
$$;

-- 2. Crear índices parciales para acelerar búsquedas solo en filas con token/expiry
CREATE INDEX IF NOT EXISTS idx_system_users_reset_token ON system_users(reset_token) WHERE reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_system_users_reset_expiry ON system_users(reset_expiry) WHERE reset_expiry IS NOT NULL;

-- 3. Función para limpiar tokens expirados (puedes programarla con pg_cron o tarea externa)
CREATE OR REPLACE FUNCTION clean_expired_reset_tokens() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM system_users
  WHERE reset_expiry IS NOT NULL AND reset_expiry < now();
END;
$$;

-- 4. Trigger para actualizar password_changed_at al modificar la contraseña
CREATE OR REPLACE FUNCTION update_password_changed_at() RETURNS trigger AS $$
BEGIN
  IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
    NEW.password_changed_at = now();
    -- Opcional: limpiar tokens al cambiar la contraseña
    NEW.reset_token = NULL;
    NEW.reset_expiry = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asociar trigger AFTER UPDATE en password_hash
DROP TRIGGER IF EXISTS trg_update_password_changed_at ON system_users;
CREATE TRIGGER trg_update_password_changed_at
BEFORE UPDATE ON system_users
FOR EACH ROW EXECUTE FUNCTION update_password_changed_at();