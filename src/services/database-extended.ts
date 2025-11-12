// ============================================
// KFP Security - Database Service Extended
// Продолжение методов для работы с БД
// ============================================

import type { Agency, Guard, Visit, Branch } from '../types';
import { db } from './database';

// Этот файл содержит расширенные методы для database service
// Методы будут добавлены в основной класс DatabaseService

export interface DatabaseExtendedMethods {
  // Агентства
  getAgencies(): Agency[];
  getAgencyById(id: string): Agency | null;
  createAgency(data: any): Agency;
  updateAgency(id: string, data: Partial<Agency>): Agency | null;
  deleteAgency(id: string): boolean;

  // Охранники
  getGuards(): Guard[];
  getGuardById(id: string): Guard | null;
  getGuardsByAgencyId(agencyId: string): Guard[];
  getGuardsByBranchId(branchId: string): Guard[];
  createGuard(data: any): Guard;
  updateGuard(id: string, data: Partial<Guard>): Guard | null;
  deleteGuard(id: string): boolean;

  // Визиты
  getVisits(): Visit[];
  getVisitById(id: string): Visit | null;
  getVisitsByAgencyId(agencyId: string): Visit[];
  getVisitsByGuardId(guardId: string): Visit[];
  createVisit(data: any): Visit;
  updateVisit(id: string, data: any): Visit | null;
  deleteVisit(id: string): boolean;

  // Филиалы
  getBranches(): Branch[];
  getBranchById(id: string): Branch | null;
}

// Расширяем методы database service
export function extendDatabaseService() {
  const dbInstance = db as any;

  // ============================================
  // АГЕНТСТВА
  // ============================================

  dbInstance.getAgencies = function(): Agency[] {
    if (!this.db) return [];

    const results = this.db.exec(`
      SELECT 
        a.*,
        COUNT(DISTINCT g.id) as guards_count,
        GROUP_CONCAT(DISTINCT ab.branch_id) as branch_ids
      FROM agencies a
      LEFT JOIN guards g ON a.id = g.agency_id
      LEFT JOIN agency_branches ab ON a.id = ab.agency_id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);

    if (!results.length) return [];

    return results[0].values.map((row: any) => {
      // row[13] = guards_count, row[14] = branch_ids
      const branchIdsString = row[14];
      const branchIds = branchIdsString && typeof branchIdsString === 'string' ? branchIdsString.split(',') : [];
      const branches: string[] = [];
      const branchNames: string[] = [];

      if (branchIds.length > 0 && branchIds[0]) {
        const branchResults = this.db.exec(`
          SELECT id, name FROM branches WHERE id IN (${branchIds.map(() => '?').join(',')})
        `, branchIds);

        if (branchResults.length) {
          branchResults[0].values.forEach((b: any) => {
            branches.push(b[0]);
            branchNames.push(b[1]);
          });
        }
      }

      return {
        id: row[0],
        name: row[1],
        bin: row[2],
        director: row[3],
        phone: row[4],
        email: row[5],
        legalAddress: row[6],
        contractStart: row[7],
        contractEnd: row[8],
        loginEmail: row[9],
        password: row[10],
        status: row[11],
        createdAt: row[12],
        branches,
        branchNames,
        guardsCount: row[13] || 0
      };
    });
  };

  dbInstance.getAgencyById = function(id: string): Agency | null {
    if (!this.db) return null;

    const results = this.db.exec(`
      SELECT 
        a.*,
        COUNT(DISTINCT g.id) as guards_count,
        GROUP_CONCAT(DISTINCT ab.branch_id) as branch_ids
      FROM agencies a
      LEFT JOIN guards g ON a.id = g.agency_id
      LEFT JOIN agency_branches ab ON a.id = ab.agency_id
      WHERE a.id = ?
      GROUP BY a.id
    `, [id]);

    if (!results.length || !results[0].values.length) return null;

    const row = results[0].values[0];
    // row[13] = guards_count, row[14] = branch_ids
    const branchIdsString = row[14];
    const branchIds = branchIdsString && typeof branchIdsString === 'string' ? branchIdsString.split(',') : [];
    const branches: string[] = [];
    const branchNames: string[] = [];

    if (branchIds.length > 0 && branchIds[0]) {
      const branchResults = this.db.exec(`
        SELECT id, name FROM branches WHERE id IN (${branchIds.map(() => '?').join(',')})
      `, branchIds);

      if (branchResults.length) {
        branchResults[0].values.forEach((b: any) => {
          branches.push(b[0]);
          branchNames.push(b[1]);
        });
      }
    }

    return {
      id: row[0],
      name: row[1],
      bin: row[2],
      director: row[3],
      phone: row[4],
      email: row[5],
      legalAddress: row[6],
      contractStart: row[7],
      contractEnd: row[8],
      loginEmail: row[9],
      password: row[10],
      status: row[11],
      createdAt: row[12],
      branches,
      branchNames,
      guardsCount: row[13] || 0
    };
  };

  dbInstance.createAgency = function(data: any): Agency {
    if (!this.db) throw new Error('База данных не инициализирована');

    const id = `agency-${Date.now()}`;
    const createdAt = new Date().toISOString();

    this.db.run(
      `INSERT INTO agencies VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.bin,
        data.director,
        data.phone,
        data.email,
        data.legalAddress,
        data.contractStart,
        data.contractEnd,
        data.loginEmail,
        data.password,
        data.status,
        createdAt
      ]
    );

    // Связь с филиалами
    if (data.branches && data.branches.length > 0) {
      for (const branchId of data.branches) {
        this.db.run(
          `INSERT INTO agency_branches VALUES (?, ?)`,
          [id, branchId]
        );
      }
    }

    this.saveToLocalStorage();
    return this.getAgencyById(id)!;
  };

  dbInstance.updateAgency = function(id: string, data: any): Agency | null {
    if (!this.db) throw new Error('База данных не инициализирована');

    const existing = this.getAgencyById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.bin !== undefined) {
      updates.push('bin = ?');
      values.push(data.bin);
    }
    if (data.director !== undefined) {
      updates.push('director = ?');
      values.push(data.director);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.legalAddress !== undefined) {
      updates.push('legal_address = ?');
      values.push(data.legalAddress);
    }
    if (data.contractStart !== undefined) {
      updates.push('contract_start = ?');
      values.push(data.contractStart);
    }
    if (data.contractEnd !== undefined) {
      updates.push('contract_end = ?');
      values.push(data.contractEnd);
    }
    if (data.loginEmail !== undefined) {
      updates.push('login_email = ?');
      values.push(data.loginEmail);
    }
    if (data.password !== undefined) {
      updates.push('password = ?');
      values.push(data.password);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    if (updates.length > 0) {
      values.push(id);
      this.db.run(
        `UPDATE agencies SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    // Обновляем связи с филиалами
    if (data.branches !== undefined) {
      this.db.run('DELETE FROM agency_branches WHERE agency_id = ?', [id]);
      
      if (data.branches.length > 0) {
        for (const branchId of data.branches) {
          this.db.run(
            `INSERT INTO agency_branches VALUES (?, ?)`,
            [id, branchId]
          );
        }
      }
    }

    this.saveToLocalStorage();
    return this.getAgencyById(id);
  };

  dbInstance.deleteAgency = function(id: string): boolean {
    if (!this.db) throw new Error('База данных не инициализирована');

    this.db.run('DELETE FROM agencies WHERE id = ?', [id]);
    this.saveToLocalStorage();
    return true;
  };

  // ============================================
  // ОХРАННИКИ
  // ============================================

  dbInstance.getGuards = function(): Guard[] {
    if (!this.db) return [];

    const results = this.db.exec(`
      SELECT 
        g.*,
        a.name as agency_name,
        b.name as branch_name,
        c.name as checkpoint_name,
        COUNT(DISTINCT v.id) as visits_count
      FROM guards g
      LEFT JOIN agencies a ON g.agency_id = a.id
      LEFT JOIN branches b ON g.branch_id = b.id
      LEFT JOIN checkpoints c ON g.checkpoint_id = c.id
      LEFT JOIN visits v ON g.id = v.guard_id
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `);

    if (!results.length) return [];

    return results[0].values.map((row: any) => ({
      id: row[0],
      fullName: row[1],
      iin: row[2],
      birthDate: row[3],
      phone: row[4],
      email: row[5],
      photo: row[6],
      agencyId: row[7],
      branchId: row[8],
      checkpointId: row[9],
      shiftType: row[10],
      shiftStart: row[11],
      shiftEnd: row[12],
      workDays: JSON.parse(row[13]),
      hireDate: row[14],
      status: row[15],
      loginEmail: row[16],
      password: row[17],
      lastActivity: row[18],
      agencyName: row[20],
      branchName: row[21],
      checkpointName: row[22],
      visitsCount: row[23] || 0
    }));
  };

  dbInstance.getGuardById = function(id: string): Guard | null {
    if (!this.db) return null;

    const results = this.db.exec(`
      SELECT 
        g.*,
        a.name as agency_name,
        b.name as branch_name,
        c.name as checkpoint_name,
        COUNT(DISTINCT v.id) as visits_count
      FROM guards g
      LEFT JOIN agencies a ON g.agency_id = a.id
      LEFT JOIN branches b ON g.branch_id = b.id
      LEFT JOIN checkpoints c ON g.checkpoint_id = c.id
      LEFT JOIN visits v ON g.id = v.guard_id
      WHERE g.id = ?
      GROUP BY g.id
    `, [id]);

    if (!results.length || !results[0].values.length) return null;

    const row = results[0].values[0];
    return {
      id: row[0],
      fullName: row[1],
      iin: row[2],
      birthDate: row[3],
      phone: row[4],
      email: row[5],
      photo: row[6],
      agencyId: row[7],
      branchId: row[8],
      checkpointId: row[9],
      shiftType: row[10],
      shiftStart: row[11],
      shiftEnd: row[12],
      workDays: JSON.parse(row[13]),
      hireDate: row[14],
      status: row[15],
      loginEmail: row[16],
      password: row[17],
      lastActivity: row[18],
      agencyName: row[20],
      branchName: row[21],
      checkpointName: row[22],
      visitsCount: row[23] || 0
    };
  };

  dbInstance.getGuardsByAgencyId = function(agencyId: string): Guard[] {
    if (!this.db) return [];

    const results = this.db.exec(`
      SELECT 
        g.*,
        a.name as agency_name,
        b.name as branch_name,
        c.name as checkpoint_name,
        COUNT(DISTINCT v.id) as visits_count
      FROM guards g
      LEFT JOIN agencies a ON g.agency_id = a.id
      LEFT JOIN branches b ON g.branch_id = b.id
      LEFT JOIN checkpoints c ON g.checkpoint_id = c.id
      LEFT JOIN visits v ON g.id = v.guard_id
      WHERE g.agency_id = ?
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `, [agencyId]);

    if (!results.length) return [];

    return results[0].values.map((row: any) => ({
      id: row[0],
      fullName: row[1],
      iin: row[2],
      birthDate: row[3],
      phone: row[4],
      email: row[5],
      photo: row[6],
      agencyId: row[7],
      branchId: row[8],
      checkpointId: row[9],
      shiftType: row[10],
      shiftStart: row[11],
      shiftEnd: row[12],
      workDays: JSON.parse(row[13]),
      hireDate: row[14],
      status: row[15],
      loginEmail: row[16],
      password: row[17],
      lastActivity: row[18],
      agencyName: row[20],
      branchName: row[21],
      checkpointName: row[22],
      visitsCount: row[23] || 0
    }));
  };

  dbInstance.getGuardsByBranchId = function(branchId: string): Guard[] {
    if (!this.db) return [];

    const results = this.db.exec(`
      SELECT 
        g.*,
        a.name as agency_name,
        b.name as branch_name,
        c.name as checkpoint_name,
        COUNT(DISTINCT v.id) as visits_count
      FROM guards g
      LEFT JOIN agencies a ON g.agency_id = a.id
      LEFT JOIN branches b ON g.branch_id = b.id
      LEFT JOIN checkpoints c ON g.checkpoint_id = c.id
      LEFT JOIN visits v ON g.id = v.guard_id
      WHERE g.branch_id = ?
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `, [branchId]);

    if (!results.length) return [];

    return results[0].values.map((row: any) => ({
      id: row[0],
      fullName: row[1],
      iin: row[2],
      birthDate: row[3],
      phone: row[4],
      email: row[5],
      photo: row[6],
      agencyId: row[7],
      branchId: row[8],
      checkpointId: row[9],
      shiftType: row[10],
      shiftStart: row[11],
      shiftEnd: row[12],
      workDays: JSON.parse(row[13]),
      hireDate: row[14],
      status: row[15],
      loginEmail: row[16],
      password: row[17],
      lastActivity: row[18],
      agencyName: row[20],
      branchName: row[21],
      checkpointName: row[22],
      visitsCount: row[23] || 0
    }));
  };

  dbInstance.createGuard = function(data: any): Guard {
    if (!this.db) throw new Error('База данных не инициализирована');

    const id = `guard-${Date.now()}`;
    const createdAt = new Date().toISOString();

    // Гарантируем, что пароль всегда установлен
    const password = data.password && data.password.trim() !== '' 
      ? data.password 
      : 'password123';

    console.log('📝 Создание охранника:', {
      loginEmail: data.loginEmail,
      password: password,
      hasPassword: !!password
    });

    this.db.run(
      `INSERT INTO guards (
        id, full_name, iin, birth_date, phone, email, photo,
        agency_id, branch_id, checkpoint_id, shift_type,
        shift_start, shift_end, work_days, hire_date, status,
        login_email, password, last_activity, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.fullName,
        data.iin,
        data.birthDate,
        data.phone,
        data.email || null,
        data.photo || null,
        data.agencyId,
        data.branchId,
        data.checkpointId,
        data.shiftType,
        data.shiftStart,
        data.shiftEnd,
        JSON.stringify(data.workDays),
        data.hireDate,
        'active',
        data.loginEmail,
        password,
        null,
        createdAt
      ]
    );

    this.saveToLocalStorage();
    return this.getGuardById(id)!;
  };

  dbInstance.updateGuard = function(id: string, data: any): Guard | null {
    if (!this.db) throw new Error('База данных не инициализирована');

    const existing = this.getGuardById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.fullName !== undefined) {
      updates.push('full_name = ?');
      values.push(data.fullName);
    }
    if (data.iin !== undefined) {
      updates.push('iin = ?');
      values.push(data.iin);
    }
    if (data.birthDate !== undefined) {
      updates.push('birth_date = ?');
      values.push(data.birthDate);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.photo !== undefined) {
      updates.push('photo = ?');
      values.push(data.photo);
    }
    if (data.agencyId !== undefined) {
      updates.push('agency_id = ?');
      values.push(data.agencyId);
    }
    if (data.branchId !== undefined) {
      updates.push('branch_id = ?');
      values.push(data.branchId);
    }
    if (data.checkpointId !== undefined) {
      updates.push('checkpoint_id = ?');
      values.push(data.checkpointId);
    }
    if (data.shiftType !== undefined) {
      updates.push('shift_type = ?');
      values.push(data.shiftType);
    }
    if (data.shiftStart !== undefined) {
      updates.push('shift_start = ?');
      values.push(data.shiftStart);
    }
    if (data.shiftEnd !== undefined) {
      updates.push('shift_end = ?');
      values.push(data.shiftEnd);
    }
    if (data.workDays !== undefined) {
      updates.push('work_days = ?');
      values.push(JSON.stringify(data.workDays));
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.loginEmail !== undefined) {
      updates.push('login_email = ?');
      values.push(data.loginEmail);
    }
    if (data.password !== undefined && data.password !== '') {
      updates.push('password = ?');
      values.push(data.password);
    }

    if (updates.length > 0) {
      values.push(id);
      this.db.run(
        `UPDATE guards SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      this.saveToLocalStorage();
    }

    return this.getGuardById(id);
  };

  dbInstance.deleteGuard = function(id: string): boolean {
    if (!this.db) throw new Error('База данных не инициализирована');

    this.db.run('DELETE FROM guards WHERE id = ?', [id]);
    this.saveToLocalStorage();
    return true;
  };

  // ============================================
  // ВИЗИТЫ
  // ============================================

  dbInstance.getVisits = function(): Visit[] {
    if (!this.db) return [];

    const results = this.db.exec(`
      SELECT 
        v.*,
        b.name as branch_name,
        c.name as checkpoint_name,
        g.full_name as guard_name,
        a.name as agency_name
      FROM visits v
      LEFT JOIN branches b ON v.branch_id = b.id
      LEFT JOIN checkpoints c ON v.checkpoint_id = c.id
      LEFT JOIN guards g ON v.guard_id = g.id
      LEFT JOIN agencies a ON v.agency_id = a.id
      ORDER BY v.created_at DESC
    `);

    if (!results.length) return [];

    return results[0].values.map((row: any) => this._mapVisitRow(row));
  };

  dbInstance.getVisitById = function(id: string): Visit | null {
    if (!this.db) return null;

    const results = this.db.exec(`
      SELECT 
        v.*,
        b.name as branch_name,
        c.name as checkpoint_name,
        g.full_name as guard_name,
        a.name as agency_name
      FROM visits v
      LEFT JOIN branches b ON v.branch_id = b.id
      LEFT JOIN checkpoints c ON v.checkpoint_id = c.id
      LEFT JOIN guards g ON v.guard_id = g.id
      LEFT JOIN agencies a ON v.agency_id = a.id
      WHERE v.id = ?
    `, [id]);

    if (!results.length || !results[0].values.length) return null;

    return this._mapVisitRow(results[0].values[0]);
  };

  dbInstance.getVisitsByAgencyId = function(agencyId: string): Visit[] {
    if (!this.db) return [];

    const results = this.db.exec(`
      SELECT 
        v.*,
        b.name as branch_name,
        c.name as checkpoint_name,
        g.full_name as guard_name,
        a.name as agency_name
      FROM visits v
      LEFT JOIN branches b ON v.branch_id = b.id
      LEFT JOIN checkpoints c ON v.checkpoint_id = c.id
      LEFT JOIN guards g ON v.guard_id = g.id
      LEFT JOIN agencies a ON v.agency_id = a.id
      WHERE v.agency_id = ?
      ORDER BY v.created_at DESC
    `, [agencyId]);

    if (!results.length) return [];

    return results[0].values.map((row: any) => this._mapVisitRow(row));
  };

  dbInstance.getVisitsByGuardId = function(guardId: string): Visit[] {
    if (!this.db) return [];

    const results = this.db.exec(`
      SELECT 
        v.*,
        b.name as branch_name,
        c.name as checkpoint_name,
        g.full_name as guard_name,
        a.name as agency_name
      FROM visits v
      LEFT JOIN branches b ON v.branch_id = b.id
      LEFT JOIN checkpoints c ON v.checkpoint_id = c.id
      LEFT JOIN guards g ON v.guard_id = g.id
      LEFT JOIN agencies a ON v.agency_id = a.id
      WHERE v.guard_id = ?
      ORDER BY v.created_at DESC
    `, [guardId]);

    if (!results.length) return [];

    return results[0].values.map((row: any) => this._mapVisitRow(row));
  };

  dbInstance.createVisit = function(data: any): Visit {
    if (!this.db) throw new Error('База данных не инициализирована');

    const id = `visit-${Date.now()}`;
    const now = new Date();
    const createdAt = now.toISOString();
    const entryTime = this.formatDateTime(now);

    // Получаем данные охранника для привязки
    const guard = this.getGuardById(data.guardId);
    if (!guard) throw new Error('Охранник не найден');

    this.db.run(
      `INSERT INTO visits VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entryTime,
        null,
        data.fullName,
        data.iin,
        data.company,
        data.phone,
        data.purpose,
        JSON.stringify(data.places),
        data.hasVehicle ? 1 : 0,
        data.vehicleNumber || null,
        data.techPassport || null,
        data.ttn || null,
        data.cargoType || null,
        data.branchId,
        data.checkpointId,
        data.guardId,
        guard.agencyId,
        'on-site',
        createdAt,
        null
      ]
    );

    this.saveToLocalStorage();
    return this.getVisitById(id)!;
  };

  dbInstance.updateVisit = function(id: string, data: any): Visit | null {
    if (!this.db) throw new Error('База данных не инициализирована');

    const existing = this.getVisitById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.exitTime !== undefined) {
      updates.push('exit_time = ?');
      values.push(data.exitTime);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.fullName !== undefined) {
      updates.push('full_name = ?');
      values.push(data.fullName);
    }
    if (data.company !== undefined) {
      updates.push('company = ?');
      values.push(data.company);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone);
    }
    if (data.purpose !== undefined) {
      updates.push('purpose = ?');
      values.push(data.purpose);
    }
    if (data.places !== undefined) {
      updates.push('places = ?');
      values.push(JSON.stringify(data.places));
    }
    if (data.hasVehicle !== undefined) {
      updates.push('has_vehicle = ?');
      values.push(data.hasVehicle ? 1 : 0);
    }
    if (data.vehicleNumber !== undefined) {
      updates.push('vehicle_number = ?');
      values.push(data.vehicleNumber);
    }
    if (data.techPassport !== undefined) {
      updates.push('tech_passport = ?');
      values.push(data.techPassport);
    }
    if (data.ttn !== undefined) {
      updates.push('ttn = ?');
      values.push(data.ttn);
    }
    if (data.cargoType !== undefined) {
      updates.push('cargo_type = ?');
      values.push(data.cargoType);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      this.db.run(
        `UPDATE visits SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      this.saveToLocalStorage();
    }

    return this.getVisitById(id);
  };

  dbInstance.deleteVisit = function(id: string): boolean {
    if (!this.db) throw new Error('База данных не инициализирована');

    this.db.run('DELETE FROM visits WHERE id = ?', [id]);
    this.saveToLocalStorage();
    return true;
  };

  // Вспомогательная функция для маппинга визитов
  dbInstance._mapVisitRow = function(row: any): Visit {
    const entryTime = row[1];
    const exitTime = row[2];
    let timeOnSite: string | undefined;

    if (exitTime) {
      try {
        const entry = this._parseDateTime(entryTime);
        const exit = this._parseDateTime(exitTime);
        const diffMs = exit.getTime() - entry.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        timeOnSite = `${hours}ч ${minutes}м`;
      } catch (e) {
        timeOnSite = undefined;
      }
    }

    return {
      id: row[0],
      entryTime: row[1],
      exitTime: row[2],
      timeOnSite,
      fullName: row[3],
      iin: row[4],
      company: row[5],
      phone: row[6],
      purpose: row[7],
      places: JSON.parse(row[8]),
      hasVehicle: row[9] === 1,
      vehicleNumber: row[10],
      techPassport: row[11],
      ttn: row[12],
      cargoType: row[13],
      branchId: row[14],
      checkpointId: row[15],
      guardId: row[16],
      agencyId: row[17],
      status: row[18],
      createdAt: row[19],
      updatedAt: row[20],
      branchName: row[21],
      checkpointName: row[22],
      guardName: row[23],
      agencyName: row[24]
    };
  };

  // Вспомогательная функция для парсинга даты формата DD.MM.YYYY HH:MM
  dbInstance._parseDateTime = function(dateStr: string): Date {
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('.');
    const [hours, minutes] = timePart.split(':');
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    );
  };

  // ============================================
  // ФИЛИАЛЫ
  // ============================================

  dbInstance.getBranches = function(): Branch[] {
    if (!this.db) throw new Error('База данных не инициализирована');
    
    const result = this.db.exec('SELECT * FROM branches ORDER BY name ASC');
    
    if (result.length === 0) return [];
    
    return result[0].values.map(row => ({
      id: row[0] as string,
      name: row[1] as string,
      address: row[2] as string,
      phoneNumber: row[3] as string,
      managerName: row[4] as string,
      status: row[5] as 'active' | 'inactive',
      createdAt: row[6] as string
    }));
  };

  dbInstance.getBranchById = function(id: string): Branch | null {
    if (!this.db) throw new Error('База данных не инициализирована');
    
    const result = this.db.exec('SELECT * FROM branches WHERE id = ?', [id]);
    
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row = result[0].values[0];
    return {
      id: row[0] as string,
      name: row[1] as string,
      address: row[2] as string,
      phoneNumber: row[3] as string,
      managerName: row[4] as string,
      status: row[5] as 'active' | 'inactive',
      createdAt: row[6] as string
    };
  };
}