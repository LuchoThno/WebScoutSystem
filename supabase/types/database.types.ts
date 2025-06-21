/**
 * Tipos TypeScript para la base de datos Supabase
 * Generados automáticamente basados en el esquema
 */

export interface Database {
  public: {
    Tables: {
      scouts: {
        Row: {
          id: string;
          name: string;
          birthdate: string;
          group_section: string;
          status: string;
          parent_name: string | null;
          parent_phone: string | null;
          address: string | null;
          registration_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          birthdate: string;
          group_section: string;
          status?: string;
          parent_name?: string | null;
          parent_phone?: string | null;
          address?: string | null;
          registration_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          birthdate?: string;
          group_section?: string;
          status?: string;
          parent_name?: string | null;
          parent_phone?: string | null;
          address?: string | null;
          registration_date?: string;
          created_at?: string;
        };
      };
      system_users: {
        Row: {
          id: string;
          name: string;
          email: string;
          username: string;
          password_hash: string;
          role: string;
          department: string | null;
          permissions: string[] | null;
          status: string;
          expiry: string | null;
          force_password_change: boolean;
          created_at: string;
          created_by: string | null;
          last_login: string | null;
          reset_token: string | null;
          reset_expiry: string | null;
          password_changed_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          username: string;
          password_hash: string;
          role: string;
          department?: string | null;
          permissions?: string[] | null;
          status?: string;
          expiry?: string | null;
          force_password_change?: boolean;
          created_at?: string;
          created_by?: string | null;
          last_login?: string | null;
          reset_token?: string | null;
          reset_expiry?: string | null;
          password_changed_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          username?: string;
          password_hash?: string;
          role?: string;
          department?: string | null;
          permissions?: string[] | null;
          status?: string;
          expiry?: string | null;
          force_password_change?: boolean;
          created_at?: string;
          created_by?: string | null;
          last_login?: string | null;
          reset_token?: string | null;
          reset_expiry?: string | null;
          password_changed_at?: string | null;
        };
      };
      medical_records: {
        Row: {
          id: string;
          scout_id: string;
          blood_type: string | null;
          emergency_contact: string | null;
          allergies: string | null;
          medications: string | null;
          medical_conditions: string | null;
          doctor_name: string | null;
          doctor_phone: string | null;
          created_date: string;
        };
        Insert: {
          id?: string;
          scout_id: string;
          blood_type?: string | null;
          emergency_contact?: string | null;
          allergies?: string | null;
          medications?: string | null;
          medical_conditions?: string | null;
          doctor_name?: string | null;
          doctor_phone?: string | null;
          created_date?: string;
        };
        Update: {
          id?: string;
          scout_id?: string;
          blood_type?: string | null;
          emergency_contact?: string | null;
          allergies?: string | null;
          medications?: string | null;
          medical_conditions?: string | null;
          doctor_name?: string | null;
          doctor_phone?: string | null;
          created_date?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          type: 'income' | 'expense';
          category: string;
          amount: number;
          description: string;
          date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: 'income' | 'expense';
          category: string;
          amount: number;
          description: string;
          date: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: 'income' | 'expense';
          category?: string;
          amount?: number;
          description?: string;
          date?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      dirigentes: {
        Row: {
          id: string;
          nombre: string;
          cedula: string;
          fecha_nacimiento: string;
          genero: string | null;
          estado_civil: string | null;
          direccion: string | null;
          telefono: string | null;
          email: string | null;
          profesion: string | null;
          inicio_scout: string | null;
          inicio_grupo: string | null;
          anos_experiencia: number | null;
          experiencia_previa: string | null;
          capacitaciones: string[] | null;
          otras_capacitaciones: string | null;
          grupo_asignado: string | null;
          cargo: string | null;
          estado: string;
          responsabilidades: string | null;
          habilidades: string | null;
          documentos: string[] | null;
          notas_documentacion: string | null;
          fecha_registro: string;
          documentacion_completa: boolean;
        };
        Insert: {
          id?: string;
          nombre: string;
          cedula: string;
          fecha_nacimiento: string;
          genero?: string | null;
          estado_civil?: string | null;
          direccion?: string | null;
          telefono?: string | null;
          email?: string | null;
          profesion?: string | null;
          inicio_scout?: string | null;
          inicio_grupo?: string | null;
          anos_experiencia?: number | null;
          experiencia_previa?: string | null;
          capacitaciones?: string[] | null;
          otras_capacitaciones?: string | null;
          grupo_asignado?: string | null;
          cargo?: string | null;
          estado?: string;
          responsabilidades?: string | null;
          habilidades?: string | null;
          documentos?: string[] | null;
          notas_documentacion?: string | null;
          fecha_registro?: string;
          documentacion_completa?: boolean;
        };
        Update: {
          id?: string;
          nombre?: string;
          cedula?: string;
          fecha_nacimiento?: string;
          genero?: string | null;
          estado_civil?: string | null;
          direccion?: string | null;
          telefono?: string | null;
          email?: string | null;
          profesion?: string | null;
          inicio_scout?: string | null;
          inicio_grupo?: string | null;
          anos_experiencia?: number | null;
          experiencia_previa?: string | null;
          capacitaciones?: string[] | null;
          otras_capacitaciones?: string | null;
          grupo_asignado?: string | null;
          cargo?: string | null;
          estado?: string;
          responsabilidades?: string | null;
          habilidades?: string | null;
          documentos?: string[] | null;
          notas_documentacion?: string | null;
          fecha_registro?: string;
          documentacion_completa?: boolean;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}