import { createClient } from '@supabase/supabase-js';

class DataMigration {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.prefix = 'grupo_scout_';
    this.migrationLog = [];
  }

  async migrateAllData() {
    try {
      this.logInfo('Starting full data migration');
      await this.migrateFinancialData();
      await this.migrateScoutsData();
      await this.migrateDirigentesData();
      this.logInfo('Migration completed successfully');
      return { success: true, log: this.migrationLog };
    } catch (error) {
      this.logError('Migration failed', error);
      return { success: false, error: error.message, log: this.migrationLog };
    }
  }

  async migrateFinancialData() {
    this.logInfo('Starting financial data migration');
    await this.migrateTransactions();
    await this.migrateBudgets();
    this.logInfo('Financial data migration completed');
  }

  async migrateTransactions() {
    try {
      const transactions = this.getFromLocalStorage('transactions') ?? [];
      if (!transactions.length) {
        this.logInfo('No transactions to migrate');
        return;
      }
      this.logInfo(`Migrating ${transactions.length} transactions`);

      const batchSize = 50;
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize).map(tx => ({
          id: tx.id ?? undefined,
          type: tx.type,
          category: tx.category,
          amount: Number(tx.amount),
          description: tx.description,
          date: tx.date,
          notes: tx.notes ?? null,
          created_at: tx.created_at ?? new Date().toISOString(),
        }));

        const { error } = await this.supabase
          .from('transactions')
          .upsert(batch, { onConflict: 'id' });

        if (error) throw error;
        this.logInfo(`Migrated batch ${Math.floor(i / batchSize) + 1} of transactions`);
      }
      this.logInfo('Transactions migration completed');
    } catch (error) {
      this.logError('Error migrating transactions', error);
      throw error;
    }
  }

  async migrateBudgets() {
    try {
      const budgetsObj = this.getFromLocalStorage('budgets') ?? {};
      const budgets = Object.values(budgetsObj);
      if (!budgets.length) {
        this.logInfo('No budgets to migrate');
        return;
      }
      this.logInfo(`Migrating ${budgets.length} budgets`);

      const validBudgets = budgets.map(b => ({
        id: b.id ?? undefined,
        category: b.category,
        amount: Number(b.amount),
        period: b.period,
        start_date: b.start_date,
        description: b.description ?? null,
        created_at: b.created_at ?? new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('budgets')
        .upsert(validBudgets, { onConflict: 'id' });

      if (error) throw error;
      this.logInfo('Budgets migration completed');
    } catch (error) {
      this.logError('Error migrating budgets', error);
      throw error;
    }
  }

  async migrateScoutsData() {
    try {
      const scouts = this.getFromLocalStorage('scouts') ?? [];
      if (!scouts.length) {
        this.logInfo('No scouts to migrate');
        return;
      }
      this.logInfo(`Migrating ${scouts.length} scouts`);

      const batchSize = 50;
      for (let i = 0; i < scouts.length; i += batchSize) {
        const batch = scouts.slice(i, i + batchSize).map(scout => ({
          id: scout.id ?? undefined,
          name: scout.name,
          birthdate: scout.birthdate,
          group_section: scout.group ?? scout.group_section,
          status: scout.status ?? 'activo',
          parent_name: scout.parent_name ?? scout.parentName ?? null,
          parent_phone: scout.parent_phone ?? scout.parentPhone ?? null,
          address: scout.address ?? null,
          registration_date: scout.registration_date ?? new Date().toISOString(),
          created_at: scout.created_at ?? new Date().toISOString(),
        }));

        const { error } = await this.supabase
          .from('scouts')
          .upsert(batch, { onConflict: 'id' });

        if (error) throw error;
        this.logInfo(`Migrated batch ${Math.floor(i / batchSize) + 1} of scouts`);
      }
      this.logInfo('Scouts migration completed');

      await this.migrateMedicalRecords();
      await this.migrateDocumentationRecords();
    } catch (error) {
      this.logError('Error migrating scouts', error);
      throw error;
    }
  }

  async migrateMedicalRecords() {
    try {
      const medicalRecords = this.getFromLocalStorage('medicalRecords') ?? [];
      if (!medicalRecords.length) {
        this.logInfo('No medical records to migrate');
        return;
      }
      this.logInfo(`Migrating ${medicalRecords.length} medical records`);

      const validRecords = medicalRecords.map(r => ({
        id: r.id ?? undefined,
        scout_id: r.scout_id,
        blood_type: r.blood_type,
        emergency_contact: r.emergency_contact,
        allergies: r.allergies ?? null,
        medications: r.medications ?? null,
        medical_conditions: r.medical_conditions ?? null,
        doctor_name: r.doctor_name ?? null,
        doctor_phone: r.doctor_phone ?? null,
        created_date: r.created_date ?? new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('medical_records')
        .upsert(validRecords, { onConflict: 'id' });

      if (error) throw error;
      this.logInfo('Medical records migration completed');
    } catch (error) {
      this.logError('Error migrating medical records', error);
      throw error;
    }
  }

  async migrateDocumentationRecords() {
    try {
      const documentationRecords = this.getFromLocalStorage('documentationRecords') ?? [];
      if (!documentationRecords.length) {
        this.logInfo('No documentation records to migrate');
        return;
      }
      this.logInfo(`Migrating ${documentationRecords.length} documentation records`);

      const validRecords = documentationRecords.map(r => ({
        id: r.id ?? undefined,
        scout_id: r.scout_id,
        documents: r.documents ?? [],
        notes: r.notes ?? null,
        status: r.status ?? 'pending',
        last_updated: r.last_updated ?? new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('documentation_records')
        .upsert(validRecords, { onConflict: 'id' });

      if (error) throw error;
      this.logInfo('Documentation records migration completed');
    } catch (error) {
      this.logError('Error migrating documentation records', error);
      throw error;
    }
  }

  async migrateDirigentesData() {
    try {
      const dirigentes = this.getFromLocalStorage('dirigentes') ?? [];
      if (!dirigentes.length) {
        this.logInfo('No dirigentes to migrate');
        return;
      }
      this.logInfo(`Migrating ${dirigentes.length} dirigentes`);

      const batchSize = 50;
      for (let i = 0; i < dirigentes.length; i += batchSize) {
        const batch = dirigentes.slice(i, i + batchSize).map(d => ({
          id: d.id ?? undefined,
          nombre: d.nombre,
          cedula: d.cedula,
          fecha_nacimiento: d.fechaNacimiento,
          genero: d.genero ?? null,
          estado_civil: d.estadoCivil ?? null,
          direccion: d.direccion ?? null,
          telefono: d.telefono ?? null,
          email: d.email ?? null,
          profesion: d.profesion ?? null,
          inicio_scout: d.inicioScout ?? null,
          inicio_grupo: d.inicioGrupo ?? null,
          anos_experiencia: d.anosExperiencia ?? null,
          experiencia_previa: d.experienciaPrevia ?? null,
          capacitaciones: d.capacitaciones ?? [],
          otras_capacitaciones: d.otrasCapacitaciones ?? null,
          grupo_asignado: d.grupoAsignado ?? null,
          cargo: d.cargo ?? null,
          estado: d.estado ?? 'activo',
          responsabilidades: d.responsabilidades ?? null,
          habilidades: d.habilidades ?? null,
          documentos: d.documentos ?? [],
          notas_documentacion: d.notasDocumentacion ?? null,
          fecha_registro: d.fechaRegistro ?? new Date().toISOString(),
          documentacion_completa: d.documentacionCompleta ?? false,
        }));

        const { error } = await this.supabase
          .from('dirigentes')
          .upsert(batch, { onConflict: 'id' });

        if (error) throw error;
        this.logInfo(`Migrated batch ${Math.floor(i / batchSize) + 1} of dirigentes`);
      }
      this.logInfo('Dirigentes migration completed');
    } catch (error) {
      this.logError('Error migrating dirigentes', error);
      throw error;
    }
  }

  getFromLocalStorage(key) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      this.logError(`Error getting ${key} from localStorage`, error);
      return null;
    }
  }

  logInfo(message) {
    const entry = { timestamp: new Date().toISOString(), level: 'info', message };
    this.migrationLog.push(entry);
    console.info(`[Migration] ${message}`);
  }

  logError(message, error) {
    const entry = { timestamp: new Date().toISOString(), level: 'error', message, error: error.message };
    this.migrationLog.push(entry);
    console.error(`[Migration] ${message}:`, error);
  }
}

export default DataMigration;
