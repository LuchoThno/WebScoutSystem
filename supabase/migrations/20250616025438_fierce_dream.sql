CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_name varchar(50),
  action varchar(50),
  type varchar(50),
  description text,
  ip varchar(45)
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Permitir a usuarios autenticados leer todos los registros
CREATE POLICY "Authenticated users can read all audit logs"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir a usuarios autenticados insertar registros en audit_log
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Índices para mejorar rendimiento en consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_name ON audit_log (user_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);