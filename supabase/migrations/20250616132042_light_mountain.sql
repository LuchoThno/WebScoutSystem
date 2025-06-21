-- Crear tabla system_users si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_users') THEN
    CREATE TABLE system_users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL,
      department VARCHAR(50),
      permissions TEXT[],
      status VARCHAR(20) DEFAULT 'active',
      expiry DATE,
      force_password_change BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by UUID,
      last_login TIMESTAMPTZ
    );

    -- Habilitar Row Level Security
    ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;

    -- Políticas para que admins gestionen usuarios
    CREATE POLICY "Admin users can manage all users" ON system_users
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM system_users u
        WHERE u.id = auth.uid() AND u.role IN ('super-admin', 'admin')
      ));

    -- Política para que usuarios lean solo su propia info
    CREATE POLICY "Users can read own data" ON system_users
      FOR SELECT TO authenticated
      USING (auth.uid() = id);

    -- Puedes agregar otras políticas según necesidades
  END IF;
END
$$;

-- Insertar usuario admin por defecto, con password hasheada
-- Recuerda que en producción debes usar un hash seguro y no texto plano
INSERT INTO system_users (
  name, 
  email, 
  username, 
  password_hash, 
  role, 
  department, 
  permissions, 
  status,
  force_password_change,
  created_at,
  created_by
)
VALUES (
  'Administrator', 
  'admin@gruposcout.org', 
  'admin', 
  crypt('admin123', gen_salt('bf')), -- bcrypt hash (requerido módulo pgcrypto)
  'super-admin', 
  'administracion', 
  ARRAY[
    'dashboard.view', 'dashboard.stats',
    'members.view', 'members.create', 'members.edit', 'members.delete',
    'planning.view', 'planning.create', 'planning.edit',
    'resources.view', 'resources.manage',
    'finance.view', 'finance.transactions', 'finance.reports',
    'leaders.view', 'leaders.manage',
    'admin.users', 'admin.system'
  ], 
  'active',
  false,
  now(),
  NULL
)
ON CONFLICT (username) DO NOTHING;

-- NOTA:
-- Para que el hashing funcione, asegúrate que la extensión pgcrypto esté instalada:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- La función auth.uid() debe estar definida en tu sistema de autenticación para obtener el UUID del usuario autenticado.
-- Ajusta los roles y permisos según tu modelo de seguridad.