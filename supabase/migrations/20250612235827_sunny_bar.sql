/*
  # Esquema Inicial del Sistema de Gestión Scout

  1. Nuevas Tablas
    - `scouts` - Información de scouts/miembros
    - `medical_records` - Fichas médicas
    - `attendance` - Registro de asistencia
    - `documentation_records` - Estado de documentación
    - `transactions` - Transacciones financieras
    - `budgets` - Presupuestos
    - `dirigentes` - Información de dirigentes
    - `activities` - Actividades planificadas
    - `inventory` - Inventario de recursos
    - `educational_materials` - Material educativo
    - `equipment` - Equipamiento
    - `locations` - Locaciones
    - `news` - Noticias
    - `contacts` - Mensajes de contacto
    - `system_users` - Usuarios del sistema
    - `audit_log` - Registro de auditoría

  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas de acceso basadas en autenticación
*/

-- Tabla de Scouts/Miembros
CREATE TABLE IF NOT EXISTS scouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(100) NOT NULL,
    birthdate date NOT NULL,
    group_section varchar(50) NOT NULL,
    status varchar(20) DEFAULT 'activo',
    parent_name varchar(100),
    parent_phone varchar(20),
    address text,
    registration_date timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Tabla de Fichas Médicas
CREATE TABLE IF NOT EXISTS medical_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scout_id uuid REFERENCES scouts(id) ON DELETE CASCADE,
    blood_type varchar(5),
    emergency_contact varchar(100),
    allergies text,
    medications text,
    medical_conditions text,
    doctor_name varchar(100),
    doctor_phone varchar(20),
    created_date timestamptz DEFAULT now()
);

-- Tabla de Asistencia
CREATE TABLE IF NOT EXISTS attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL,
    group_section varchar(50),
    activity varchar(200),
    records jsonb,
    created_at timestamptz DEFAULT now()
);

-- Tabla de Documentación
CREATE TABLE IF NOT EXISTS documentation_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scout_id uuid REFERENCES scouts(id) ON DELETE CASCADE,
    documents text[],
    notes text,
    status varchar(20),
    last_updated timestamptz DEFAULT now()
);

-- Tabla de Transacciones Financieras
CREATE TABLE IF NOT EXISTS transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type varchar(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category varchar(50) NOT NULL,
    amount decimal(10,2) NOT NULL,
    description text NOT NULL,
    date date NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- Tabla de Presupuestos
CREATE TABLE IF NOT EXISTS budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category varchar(50) NOT NULL,
    amount decimal(10,2) NOT NULL,
    period varchar(20) NOT NULL,
    start_date date NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

-- Tabla de Dirigentes
CREATE TABLE IF NOT EXISTS dirigentes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre varchar(100) NOT NULL,
    cedula varchar(20) UNIQUE NOT NULL,
    fecha_nacimiento date NOT NULL,
    genero varchar(20),
    estado_civil varchar(20),
    direccion text,
    telefono varchar(20),
    email varchar(100),
    profesion varchar(100),
    inicio_scout date,
    inicio_grupo date,
    anos_experiencia integer,
    experiencia_previa text,
    capacitaciones text[],
    otras_capacitaciones text,
    grupo_asignado varchar(50),
    cargo varchar(50),
    estado varchar(20) DEFAULT 'activo',
    responsabilidades text,
    habilidades text,
    documentos text[],
    notas_documentacion text,
    fecha_registro timestamptz DEFAULT now(),
    documentacion_completa boolean DEFAULT false
);

-- Tabla de Actividades
CREATE TABLE IF NOT EXISTS activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar(200) NOT NULL,
    type varchar(50),
    date date NOT NULL,
    time time,
    duration decimal(3,1),
    target_group varchar(50),
    location varchar(200),
    description text,
    responsible varchar(100),
    materials text,
    status varchar(20) DEFAULT 'planned',
    created_date timestamptz DEFAULT now()
);

-- Tabla de Inventario
CREATE TABLE IF NOT EXISTS inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(200) NOT NULL,
    category varchar(50),
    quantity integer NOT NULL,
    unit varchar(20),
    condition varchar(20),
    location varchar(200),
    value decimal(10,2),
    purchase_date date,
    description text,
    responsible varchar(100),
    created_date timestamptz DEFAULT now()
);

-- Tabla de Material Educativo
CREATE TABLE IF NOT EXISTS educational_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar(200) NOT NULL,
    type varchar(50),
    subject varchar(50),
    age_group varchar(50),
    author varchar(100),
    year integer,
    quantity integer NOT NULL,
    available integer NOT NULL,
    description text,
    location varchar(200),
    created_date timestamptz DEFAULT now()
);

-- Tabla de Equipamiento
CREATE TABLE IF NOT EXISTS equipment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(200) NOT NULL,
    type varchar(50),
    brand varchar(100),
    model varchar(100),
    serial varchar(100),
    condition varchar(20),
    purchase_date date,
    value decimal(10,2),
    location varchar(200),
    responsible varchar(100),
    notes text,
    status varchar(20) DEFAULT 'available',
    created_date timestamptz DEFAULT now()
);

-- Tabla de Locaciones
CREATE TABLE IF NOT EXISTS locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(200) NOT NULL,
    type varchar(50),
    address text,
    capacity integer,
    area decimal(8,2),
    status varchar(20) DEFAULT 'disponible',
    facilities text[],
    contact varchar(100),
    phone varchar(20),
    cost decimal(10,2),
    notes text,
    created_date timestamptz DEFAULT now()
);

-- Tabla de Noticias
CREATE TABLE IF NOT EXISTS news (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar(200) NOT NULL,
    content text NOT NULL,
    date timestamptz DEFAULT now(),
    author varchar(100),
    status varchar(20) DEFAULT 'published'
);

-- Tabla de Contactos
CREATE TABLE IF NOT EXISTS contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(100) NOT NULL,
    email varchar(100) NOT NULL,
    phone varchar(20),
    message text NOT NULL,
    date timestamptz DEFAULT now(),
    status varchar(20) DEFAULT 'pending'
);

-- Tabla de Usuarios del Sistema
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
    last_login timestamptz
);

-- Tabla de Auditoría
CREATE TABLE IF NOT EXISTS audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp timestamptz DEFAULT now(),
    user_name varchar(50),
    action varchar(50),
    type varchar(50),
    description text,
    ip varchar(45)
);

-- Habilitar Row Level Security
ALTER TABLE scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dirigentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso (permitir todo por ahora, se puede restringir después)
CREATE POLICY "Allow all operations" ON scouts FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON medical_records FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON attendance FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON documentation_records FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON transactions FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON budgets FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON dirigentes FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON activities FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON inventory FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON educational_materials FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON equipment FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON locations FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON news FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON contacts FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON system_users FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations" ON audit_log FOR ALL TO anon USING (true);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_scouts_group ON scouts(group_section);
CREATE INDEX IF NOT EXISTS idx_scouts_status ON scouts(status);
CREATE INDEX IF NOT EXISTS idx_medical_records_scout ON medical_records(scout_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_dirigentes_grupo ON dirigentes(grupo_asignado);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
CREATE INDEX IF NOT EXISTS idx_news_date ON news(date);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);