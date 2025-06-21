/*
  # Create system_users table

  1. New Tables
    - `system_users`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `email` (text, unique, not null)
      - `username` (text, unique, not null)
      - `password_hash` (text, not null)
      - `role` (text, not null)
      - `department` (text)
      - `permissions` (text array)
      - `status` (text, default 'active')
      - `expiry` (date)
      - `force_password_change` (boolean, default false)
      - `created_at` (timestamp with time zone, default now())
      - `created_by` (text)
      - `last_login` (timestamp with time zone)
      - `reset_token` (text)
      - `reset_expiry` (timestamp with time zone)
      - `password_changed_at` (timestamp with time zone)
  2. Security
    - Enable RLS on `system_users` table
    - Add policy for authenticated users to read their own data
*/

CREATE TABLE IF NOT EXISTS system_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  email varchar(100) UNIQUE NOT NULL,
  username varchar(50) UNIQUE NOT NULL,
  password_hash varchar(255) NOT NULL,
  role varchar(20) NOT NULL,
  department varchar(50),
  permissions text[],
  status varchar(20) DEFAULT 'active',
  expiry date,
  force_password_change boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by varchar(50),
  last_login timestamptz,
  reset_token text,
  reset_expiry timestamptz,
  password_changed_at timestamptz
);

ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;

-- Permite a cada usuario leer solo su propia fila
CREATE POLICY "Users can read own data"
  ON system_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid()::uuid);

-- Permite a usuarios admin/super-admin gestionar toda la tabla
CREATE POLICY "Admin users can manage all users"
  ON system_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE id = auth.uid()::uuid AND role IN ('super-admin', 'admin')
    )
  );
-- Admin puede INSERT
CREATE POLICY "Admins can insert users"
  ON system_users
  FOR INSERT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users WHERE id = auth.uid()::uuid AND role IN ('super-admin', 'admin')
    )
  );

-- Admin puede UPDATE cualquier usuario
CREATE POLICY "Admins can update users"
  ON system_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users WHERE id = auth.uid()::uuid AND role IN ('super-admin', 'admin')
    )
  );

-- Usuario puede UPDATE su propia fila (ejemplo para actualizar last_login o password)
CREATE POLICY "Users can update own data"
  ON system_users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid()::uuid);

-- Admin puede DELETE
CREATE POLICY "Admins can delete users"
  ON system_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users WHERE id = auth.uid()::uuid AND role IN ('super-admin', 'admin')
    )
  );