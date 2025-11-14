// ============================================
// KFP Security - SQLite Database Service
// ============================================

import type { 
  Branch, 
  Checkpoint, 
  Agency, 
  Guard, 
  Visit,
  CreateVisitRequest,
  UpdateVisitRequest,
  CreateGuardRequest,
  UpdateGuardRequest,
  DashboardStats
} from '../types';

const DB_KEY = 'kfp_security_db';

// Динамическая загрузка sql.js
async function loadSqlJs() {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
  
  return new Promise<any>((resolve, reject) => {
    script.onload = () => {
      const initSqlJs = (window as any).initSqlJs;
      if (initSqlJs) {
        resolve(initSqlJs);
      } else {
        reject(new Error('sql.js не загружен'));
      }
    };
    script.onerror = () => reject(new Error('Ошибка загрузки sql.js'));
    document.head.appendChild(script);
  });
}

class DatabaseService {
  private db: any = null;
  private SQL: any = null;

  /**
   * Инициализация базы данных
   */
  async initialize(): Promise<void> {
    try {
      // Загружаем sql.js динамически
      const initSqlJs = await loadSqlJs();
      
      // Инициализируем sql.js
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });
      

      // Пытаемся загрузить существующую БД из LocalStorage
      const savedDb = localStorage.getItem(DB_KEY);
      
      if (savedDb) {
        const binaryArray = new Uint8Array(
          JSON.parse(savedDb)
        );
        this.db = new this.SQL.Database(binaryArray);
        
        // Выполняем миграции для существующей БД
        await this.runMigrations();
      } else {
        // Создаем новую БД
        this.db = new this.SQL.Database();
        await this.createSchema();
        await this.seedData();
        this.saveToLocalStorage();
      }
    } catch (error) {
      console.error('❌ Ошибка инициализации БД:', error);
      throw error;
    }
  }

  /**
   * Миграции базы данных
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('База данных не инициализирована');

    try {
      // Миграция 1: Добавление поля password в таблицу guards
      const result = this.db.exec("PRAGMA table_info(guards)");
      if (result.length > 0) {
        const columns = result[0].values.map((row: any) => row[1]);
        if (!columns.includes('password')) {
          
          // Добавляем колонку
          this.db.run("ALTER TABLE guards ADD COLUMN password TEXT");
          
          // Устанавливаем пароли для всех существующих охранников
          this.db.run("UPDATE guards SET password = 'password123' WHERE password IS NULL OR password = ''");
          
          // Для тестового охранника устанавливаем guard123
          this.db.run("UPDATE guards SET password = 'guard123' WHERE login_email = 'guard@kfp.kz'");
          
          this.saveToLocalStorage();
        }
      }
    } catch (error) {
      console.error('❌ Ошибка выполнения миграций:', error);
      // Не прерываем работу, если миграция не удалась
    }
  }

  /**
   * Создание схемы базы данных
   */
  private async createSchema(): Promise<void> {
    if (!this.db) throw new Error('База данных не инициализирована');

    // Таблица филиалов
    this.db.run(`
      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        region TEXT NOT NULL,
        street TEXT NOT NULL,
        building TEXT NOT NULL,
        latitude TEXT,
        longitude TEXT,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      )
    `);

    // Таблица КПП
    this.db.run(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
      )
    `);

    // Таблица агентств
    this.db.run(`
      CREATE TABLE IF NOT EXISTS agencies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        bin TEXT NOT NULL UNIQUE,
        director TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        legal_address TEXT NOT NULL,
        contract_start TEXT NOT NULL,
        contract_end TEXT NOT NULL,
        login_email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      )
    `);

    // Связь агенств и филиалов (многие ко многим)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS agency_branches (
        agency_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        PRIMARY KEY (agency_id, branch_id),
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
      )
    `);

    // Таблица охранников
    this.db.run(`
      CREATE TABLE IF NOT EXISTS guards (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        iin TEXT NOT NULL UNIQUE,
        birth_date TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        photo TEXT,
        agency_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        checkpoint_id TEXT NOT NULL,
        shift_type TEXT NOT NULL,
        shift_start TEXT NOT NULL,
        shift_end TEXT NOT NULL,
        work_days TEXT NOT NULL,
        hire_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        login_email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        last_activity TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id) ON DELETE CASCADE
      )
    `);

    // Таблица визитов
    this.db.run(`
      CREATE TABLE IF NOT EXISTS visits (
        id TEXT PRIMARY KEY,
        entry_time TEXT NOT NULL,
        exit_time TEXT,
        full_name TEXT NOT NULL,
        iin TEXT NOT NULL,
        company TEXT NOT NULL,
        phone TEXT NOT NULL,
        purpose TEXT NOT NULL,
        places TEXT NOT NULL,
        has_vehicle INTEGER NOT NULL DEFAULT 0,
        vehicle_number TEXT,
        tech_passport TEXT,
        ttn TEXT,
        cargo_type TEXT,
        branch_id TEXT NOT NULL,
        checkpoint_id TEXT NOT NULL,
        guard_id TEXT NOT NULL,
        agency_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'on-site',
        created_at TEXT NOT NULL,
        updated_at TEXT,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id) ON DELETE CASCADE,
        FOREIGN KEY (guard_id) REFERENCES guards(id) ON DELETE CASCADE,
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE
      )
    `);

  }

  /**
   * Заполнение тестовыми данными
   */
  private async seedData(): Promise<void> {
    if (!this.db) throw new Error('База данных не инициализирован');

    const now = new Date().toISOString();

    // Филиалы
    const branches = [
      {
        id: 'branch-1',
        name: 'Центральный завод (Алматы)',
        city: 'Алматы',
        region: 'Алматинская область',
        street: 'пр. Абая',
        building: '150',
        phone: '+7 727 250 1234',
        email: 'almaty@kfp.kz',
        status: 'active',
        created_at: now
      },
      {
        id: 'branch-2',
        name: 'Производство муки (Астана)',
        city: 'Астана',
        region: 'Акмолинская область',
        street: 'ул. Кенесары',
        building: '45',
        phone: '+7 7172 555 678',
        email: 'astana@kfp.kz',
        status: 'active',
        created_at: now
      },
      {
        id: 'branch-3',
        name: 'Склад готовой продукции (Шымкент)',
        city: 'Шымкент',
        region: 'Туркестанская область',
        street: 'ул. Байтурсынова',
        building: '23',
        phone: '+7 7252 300 456',
        email: 'shymkent@kfp.kz',
        status: 'active',
        created_at: now
      },
      {
        id: 'branch-4',
        name: 'Логистический центр (Актобе)',
        city: 'Актобе',
        region: 'Актюбинская область',
        street: 'пр. Абылхаир хана',
        building: '78',
        phone: '+7 7132 400 789',
        email: 'aktobe@kfp.kz',
        status: 'active',
        created_at: now
      }
    ];

    for (const branch of branches) {
      this.db.run(
        `INSERT INTO branches VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          branch.id,
          branch.name,
          branch.city,
          branch.region,
          branch.street,
          branch.building,
          null,
          null,
          branch.phone,
          branch.email,
          branch.status,
          branch.created_at
        ]
      );
    }

    // КПП
    const checkpoints = [
      { id: 'cp-1', name: 'КПП №1 (Главный въезд)', branch_id: 'branch-1', type: 'entry' },
      { id: 'cp-2', name: 'КПП №2 (Выезд со склада)', branch_id: 'branch-1', type: 'exit' },
      { id: 'cp-3', name: 'КПП №3 (Универсальный)', branch_id: 'branch-1', type: 'universal' },
      { id: 'cp-4', name: 'КПП №1 (Главный)', branch_id: 'branch-2', type: 'universal' },
      { id: 'cp-5', name: 'КПП №2 (Грузовой)', branch_id: 'branch-2', type: 'entry' },
      { id: 'cp-6', name: 'КПП №1 (Складской)', branch_id: 'branch-3', type: 'universal' },
      { id: 'cp-7', name: 'КПП №1 (Логистика)', branch_id: 'branch-4', type: 'entry' },
    ];

    for (const cp of checkpoints) {
      this.db.run(
        `INSERT INTO checkpoints VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [cp.id, cp.name, cp.branch_id, cp.type, null, 'active', now]
      );
    }

    // Агентства
    const agencies = [
      {
        id: 'agency-1',
        name: 'ТОО "Казахстан Секьюрити"',
        bin: '123456789012',
        director: 'Абдуллаев Нурлан Серикович',
        phone: '+7 727 555 0001',
        email: 'info@kzsecurity.kz',
        legal_address: 'г. Алматы, ул. Манаса, д. 34',
        contract_start: '2024-01-01',
        contract_end: '2025-12-31',
        login_email: 'admin@kzsecurity.kz',
        password: 'password123',
        status: 'active'
      },
      {
        id: 'agency-2',
        name: 'ТОО "Охрана Плюс"',
        bin: '987654321098',
        director: 'Смирнов Алексей Викторович',
        phone: '+7 7172 444 0002',
        email: 'contact@ohranaplus.kz',
        legal_address: 'г. Астана, пр. Кабанбай батыра, д. 56',
        contract_start: '2024-03-01',
        contract_end: '2025-02-28',
        login_email: 'admin@ohranaplus.kz',
        password: 'password123',
        status: 'active'
      },
      {
        id: 'agency-3',
        name: 'ТОО "Беркут Секюрити"',
        bin: '456789123456',
        director: 'Темиров Ерлан Маратович',
        phone: '+7 7252 333 0003',
        email: 'info@berkut.kz',
        legal_address: 'г. Шымкент, ул. Тауке хана, д. 12',
        contract_start: '2024-06-01',
        contract_end: '2026-05-31',
        login_email: 'admin@berkut.kz',
        password: 'password123',
        status: 'active'
      }
    ];

    for (const agency of agencies) {
      this.db.run(
        `INSERT INTO agencies VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          agency.id,
          agency.name,
          agency.bin,
          agency.director,
          agency.phone,
          agency.email,
          agency.legal_address,
          agency.contract_start,
          agency.contract_end,
          agency.login_email,
          agency.password,
          agency.status,
          now
        ]
      );
    }

    // Связ�� агентств и филиалов
    const agencyBranches = [
      { agency_id: 'agency-1', branch_id: 'branch-1' },
      { agency_id: 'agency-1', branch_id: 'branch-2' },
      { agency_id: 'agency-2', branch_id: 'branch-2' },
      { agency_id: 'agency-2', branch_id: 'branch-3' },
      { agency_id: 'agency-3', branch_id: 'branch-3' },
      { agency_id: 'agency-3', branch_id: 'branch-4' },
    ];

    for (const ab of agencyBranches) {
      this.db.run(
        `INSERT INTO agency_branches VALUES (?, ?)`,
        [ab.agency_id, ab.branch_id]
      );
    }

    // Охранники
    const guards = [
      {
        id: 'guard-1',
        full_name: 'Ибрагимов Марат Асланович',
        iin: '850615301234',
        birth_date: '15.06.1985',
        phone: '+7 (701) 123 45 67',
        agency_id: 'agency-1',
        branch_id: 'branch-1',
        checkpoint_id: 'cp-1',
        shift_type: 'day',
        shift_start: '08:00',
        shift_end: '20:00',
        work_days: JSON.stringify(['ПН', 'СР', 'ПТ']),
        hire_date: '2024-01-15',
        login_email: 'ibragimov.m@kzsecurity.kz',
        password: 'password123'
      },
      {
        id: 'guard-2',
        full_name: 'Петров Дмитрий Николаевич',
        iin: '900320401234',
        birth_date: '20.03.1990',
        phone: '+7 (702) 234 56 78',
        agency_id: 'agency-1',
        branch_id: 'branch-1',
        checkpoint_id: 'cp-1',
        shift_type: 'night',
        shift_start: '20:00',
        shift_end: '08:00',
        work_days: JSON.stringify(['ПН', 'СР', 'ПТ']),
        hire_date: '2024-01-20',
        login_email: 'petrov.d@kzsecurity.kz',
        password: 'password123'
      },
      {
        id: 'guard-3',
        full_name: 'Каримов Бахтияр Жанатович',
        iin: '880910501234',
        birth_date: '10.09.1988',
        phone: '+7 (703) 345 67 89',
        agency_id: 'agency-1',
        branch_id: 'branch-1',
        checkpoint_id: 'cp-2',
        shift_type: 'day',
        shift_start: '08:00',
        shift_end: '20:00',
        work_days: JSON.stringify(['ВТ', 'ЧТ', 'СБ']),
        hire_date: '2024-02-01',
        login_email: 'karimov.b@kzsecurity.kz',
        password: 'password123'
      },
      {
        id: 'guard-4',
        full_name: 'Сидоров Олег Викторович',
        iin: '920512601234',
        birth_date: '12.05.1992',
        phone: '+7 (704) 456 78 90',
        agency_id: 'agency-2',
        branch_id: 'branch-2',
        checkpoint_id: 'cp-4',
        shift_type: 'day',
        shift_start: '08:00',
        shift_end: '20:00',
        work_days: JSON.stringify(['ПН', 'СР', 'ПТ', 'ВС']),
        hire_date: '2024-03-10',
        login_email: 'sidorov.o@ohranaplus.kz',
        password: 'password123'
      },
      {
        id: 'guard-5',
        full_name: 'Нурмуханов Алмас Ерланович',
        iin: '870825701234',
        birth_date: '25.08.1987',
        phone: '+7 (705) 567 89 01',
        agency_id: 'agency-2',
        branch_id: 'branch-3',
        checkpoint_id: 'cp-6',
        shift_type: 'night',
        shift_start: '20:00',
        shift_end: '08:00',
        work_days: JSON.stringify(['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ']),
        hire_date: '2024-03-15',
        login_email: 'nurmukhanov.a@ohranaplus.kz',
        password: 'password123'
      },
      {
        id: 'guard-6',
        full_name: 'Жумабеков Ерлан Маратович',
        iin: '910304801234',
        birth_date: '04.03.1991',
        phone: '+7 (706) 678 90 12',
        agency_id: 'agency-3',
        branch_id: 'branch-3',
        checkpoint_id: 'cp-6',
        shift_type: 'day',
        shift_start: '08:00',
        shift_end: '20:00',
        work_days: JSON.stringify(['ПН', 'ВТ', 'СР']),
        hire_date: '2024-06-05',
        login_email: 'zhumabekov.e@berkut.kz',
        password: 'password123'
      },
      {
        id: 'guard-test',
        full_name: 'Тестовый Охранник Иванович',
        iin: '950101301234',
        birth_date: '01.01.1995',
        phone: '+7 (777) 123 45 67',
        agency_id: 'agency-1',
        branch_id: 'branch-1',
        checkpoint_id: 'cp-1',
        shift_type: 'day',
        shift_start: '09:00',
        shift_end: '18:00',
        work_days: JSON.stringify(['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ']),
        hire_date: '2024-01-01',
        login_email: 'guard@kfp.kz',
        password: 'guard123'
      }
    ];

    for (const guard of guards) {
      this.db.run(
        `INSERT INTO guards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          guard.id,
          guard.full_name,
          guard.iin,
          guard.birth_date,
          guard.phone,
          null,
          null,
          guard.agency_id,
          guard.branch_id,
          guard.checkpoint_id,
          guard.shift_type,
          guard.shift_start,
          guard.shift_end,
          guard.work_days,
          guard.hire_date,
          'active',
          guard.login_email,
          guard.password,
          null,
          now
        ]
      );
    }

    // Визиты (последние 30 дней)
    const purposes = [
      'Деловая встреча',
      'Поставка товаров',
      'Монтажные работы',
      'Сервисное обслуживание',
      'Проверка оборудования'
    ];
    
    const companies = [
      'ТОО "Логистика КЗ"',
      'АО "Транс Сервис"',
      'ТОО "Техно Плюс"',
      'ИП Сергеев А.В.',
      'ТОО "Поставка Про"'
    ];

    const visitCount = 50;
    for (let i = 1; i <= visitCount; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - daysAgo);
      entryDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
      
      const hasLeft = Math.random() > 0.3;
      let exitDate = null;
      
      if (hasLeft) {
        exitDate = new Date(entryDate);
        exitDate.setHours(entryDate.getHours() + 1 + Math.floor(Math.random() * 6));
      }

      const hasVehicle = Math.random() > 0.5;
      const guardId = guards[Math.floor(Math.random() * guards.length)].id;
      const guard = guards.find(g => g.id === guardId)!;

      this.db.run(
        `INSERT INTO visits VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `visit-${i}`,
          this.formatDateTime(entryDate),
          exitDate ? this.formatDateTime(exitDate) : null,
          `Гость №${i}`,
          `${800000000000 + i}`,
          companies[Math.floor(Math.random() * companies.length)],
          `+7 70${i % 10} ${String(i).padStart(3, '0')} ${String(i * 2).padStart(4, '0')}`,
          purposes[Math.floor(Math.random() * purposes.length)],
          JSON.stringify(['Офис', 'Склад']),
          hasVehicle ? 1 : 0,
          hasVehicle ? `${i % 2 === 0 ? '01' : '02'}KZ${String(1000 + i).padStart(4, '0')}A` : null,
          hasVehicle && Math.random() > 0.5 ? `ТП-${String(100000 + i).padStart(6, '0')}` : null,
          hasVehicle && Math.random() > 0.5 ? `ТТН-${String(200000 + i).padStart(6, '0')}` : null,
          hasVehicle && Math.random() > 0.7 ? 'Строительные материалы' : null,
          guard.branch_id,
          guard.checkpoint_id,
          guardId,
          guard.agency_id,
          hasLeft ? 'left' : 'on-site',
          entryDate.toISOString(),
          exitDate ? exitDate.toISOString() : null
        ]
      );
    }

  }

  /**
   * Форматирование даты в DD.MM.YYYY HH:MM
   */
  private formatDateTime(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  /**
   * Сохранение БД в LocalStorage
   */
  saveToLocalStorage(): void {
    if (!this.db) return;
    
    try {
      const data = this.db.export();
      const buffer = Array.from(data);
      localStorage.setItem(DB_KEY, JSON.stringify(buffer));
    } catch (error) {
      console.error('❌ Ошибка сохранения БД:', error);
    }
  }

  /**
   * Экспорт БД в файл
   */
  exportDatabase(): void {
    if (!this.db) return;
    
    try {
      const data = this.db.export();
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kfp_security_${new Date().toISOString().split('T')[0]}.db`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ Ошибка экспорта БД:', error);
    }
  }

  /**
   * Импорт БД из файла
   */
  async importDatabase(file: File): Promise<void> {
    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      
      if (this.db) {
        this.db.close();
      }
      
      this.db = new this.SQL.Database(data);
      this.saveToLocalStorage();
    } catch (error) {
      console.error('❌ Ошибка импорта БД:', error);
      throw error;
    }
  }

  /**
   * Очистка базы данных
   */
  clearDatabase(): void {
    localStorage.removeItem(DB_KEY);
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ============================================
  // ФИЛИАЛЫ
  // ============================================

  getBranches(): Branch[] {
    if (!this.db) return [];

    const results = this.db.exec(`
      SELECT 
        b.*,
        COUNT(DISTINCT c.id) as checkpoints_count
      FROM branches b
      LEFT JOIN checkpoints c ON b.id = c.branch_id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);

    if (!results.length) return [];

    return results[0].values.map((row: any) => ({
      id: row[0],
      name: row[1],
      city: row[2],
      region: row[3],
      street: row[4],
      building: row[5],
      latitude: row[6],
      longitude: row[7],
      phone: row[8],
      email: row[9],
      status: row[10],
      createdAt: row[11],
      checkpointsCount: row[12] || 0
    }));
  }

  getBranchById(id: string): Branch | null {
    if (!this.db) return null;

    const results = this.db.exec(`
      SELECT 
        b.*,
        COUNT(DISTINCT c.id) as checkpoints_count
      FROM branches b
      LEFT JOIN checkpoints c ON b.id = c.branch_id
      WHERE b.id = ?
      GROUP BY b.id
    `, [id]);

    if (!results.length || !results[0].values.length) return null;

    const row = results[0].values[0];
    return {
      id: row[0],
      name: row[1],
      city: row[2],
      region: row[3],
      street: row[4],
      building: row[5],
      latitude: row[6],
      longitude: row[7],
      phone: row[8],
      email: row[9],
      status: row[10],
      createdAt: row[11],
      checkpointsCount: row[12] || 0
    };
  }

  createBranch(data: Omit<Branch, 'id' | 'createdAt' | 'checkpointsCount'>): Branch {
    if (!this.db) throw new Error('База данных не инициализирована');

    const id = `branch-${Date.now()}`;
    const createdAt = new Date().toISOString();

    this.db.run(
      `INSERT INTO branches VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.city,
        data.region,
        data.street,
        data.building,
        data.latitude || null,
        data.longitude || null,
        data.phone,
        data.email,
        data.status,
        createdAt
      ]
    );

    this.saveToLocalStorage();

    return {
      ...data,
      id,
      createdAt,
      checkpointsCount: 0
    };
  }

  updateBranch(id: string, data: Partial<Branch>): Branch | null {
    if (!this.db) throw new Error('База данных не инициализирована');

    const existing = this.getBranchById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.city !== undefined) {
      updates.push('city = ?');
      values.push(data.city);
    }
    if (data.region !== undefined) {
      updates.push('region = ?');
      values.push(data.region);
    }
    if (data.street !== undefined) {
      updates.push('street = ?');
      values.push(data.street);
    }
    if (data.building !== undefined) {
      updates.push('building = ?');
      values.push(data.building);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    if (updates.length > 0) {
      values.push(id);
      this.db.run(
        `UPDATE branches SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      this.saveToLocalStorage();
    }

    return this.getBranchById(id);
  }

  deleteBranch(id: string): boolean {
    if (!this.db) throw new Error('База данных не инициализирована');

    this.db.run('DELETE FROM branches WHERE id = ?', [id]);
    this.saveToLocalStorage();
    return true;
  }

  // ============================================
  // КПП
  // ============================================

  getCheckpoints(): Checkpoint[] {
    if (!this.db) return [];

    const results = this.db.exec(`
      SELECT 
        c.*,
        b.name as branch_name,
        COUNT(DISTINCT g.id) as guards_count
      FROM checkpoints c
      LEFT JOIN branches b ON c.branch_id = b.id
      LEFT JOIN guards g ON c.id = g.checkpoint_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    if (!results.length) return [];

    return results[0].values.map((row: any) => ({
      id: row[0],
      name: row[1],
      branchId: row[2],
      type: row[3],
      description: row[4],
      status: row[5],
      createdAt: row[6],
      branchName: row[7],
      guardsCount: row[8] || 0
    }));
  }

  getCheckpointById(id: string): Checkpoint | null {
    if (!this.db) return null;

    const results = this.db.exec(`
      SELECT 
        c.*,
        b.name as branch_name,
        COUNT(DISTINCT g.id) as guards_count
      FROM checkpoints c
      LEFT JOIN branches b ON c.branch_id = b.id
      LEFT JOIN guards g ON c.id = g.checkpoint_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);

    if (!results.length || !results[0].values.length) return null;

    const row = results[0].values[0];
    return {
      id: row[0],
      name: row[1],
      branchId: row[2],
      type: row[3],
      description: row[4],
      status: row[5],
      createdAt: row[6],
      branchName: row[7],
      guardsCount: row[8] || 0
    };
  }

  getCheckpointsByBranchId(branchId: string): Checkpoint[] {
    if (!this.db) return [];

    const results = this.db.exec(`
      SELECT 
        c.*,
        b.name as branch_name,
        COUNT(DISTINCT g.id) as guards_count
      FROM checkpoints c
      LEFT JOIN branches b ON c.branch_id = b.id
      LEFT JOIN guards g ON c.id = g.checkpoint_id
      WHERE c.branch_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [branchId]);

    if (!results.length) return [];

    return results[0].values.map((row: any) => ({
      id: row[0],
      name: row[1],
      branchId: row[2],
      type: row[3],
      description: row[4],
      status: row[5],
      createdAt: row[6],
      branchName: row[7],
      guardsCount: row[8] || 0
    }));
  }

  createCheckpoint(data: Omit<Checkpoint, 'id' | 'createdAt' | 'branchName' | 'guardsCount'>): Checkpoint {
    if (!this.db) throw new Error('База данных не инициализирована');

    const id = `cp-${Date.now()}`;
    const createdAt = new Date().toISOString();

    this.db.run(
      `INSERT INTO checkpoints VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.branchId, data.type, data.description || null, data.status, createdAt]
    );

    this.saveToLocalStorage();

    const branch = this.getBranchById(data.branchId);
    return {
      ...data,
      id,
      createdAt,
      branchName: branch?.name || '',
      guardsCount: 0
    };
  }

  updateCheckpoint(id: string, data: Partial<Checkpoint>): Checkpoint | null {
    if (!this.db) throw new Error('База данных не инициализирована');

    const existing = this.getCheckpointById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.branchId !== undefined) {
      updates.push('branch_id = ?');
      values.push(data.branchId);
    }
    if (data.type !== undefined) {
      updates.push('type = ?');
      values.push(data.type);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    if (updates.length > 0) {
      values.push(id);
      this.db.run(
        `UPDATE checkpoints SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      this.saveToLocalStorage();
    }

    return this.getCheckpointById(id);
  }

  deleteCheckpoint(id: string): boolean {
    if (!this.db) throw new Error('База данных не инициализирована');

    this.db.run('DELETE FROM checkpoints WHERE id = ?', [id]);
    this.saveToLocalStorage();
    return true;
  }

  // ============================================
  // СТАТИСТИКА ДАШБОРДА
  // ============================================

  getDashboardStats(): DashboardStats {
    if (!this.db) {
      return {
        totalVisits: 0,
        onSiteNow: 0,
        totalBranches: 0,
        totalCheckpoints: 0,
        totalAgencies: 0,
        totalGuards: 0,
        activeGuards: 0,
        avgTimeOnSite: '0ч 0м'
      };
    }

    // Общее количество визитов
    let totalVisits = 0;
    const totalVisitsResult = this.db.exec('SELECT COUNT(*) FROM visits');
    if (totalVisitsResult.length && totalVisitsResult[0].values.length) {
      totalVisits = totalVisitsResult[0].values[0][0] as number;
    }

    // На территории сейчас
    let onSiteNow = 0;
    const onSiteResult = this.db.exec('SELECT COUNT(*) FROM visits WHERE status = ?', ['on-site']);
    if (onSiteResult.length && onSiteResult[0].values.length) {
      onSiteNow = onSiteResult[0].values[0][0] as number;
    }

    // Всего филиалов
    let totalBranches = 0;
    const branchesResult = this.db.exec('SELECT COUNT(*) FROM branches WHERE status = ?', ['active']);
    if (branchesResult.length && branchesResult[0].values.length) {
      totalBranches = branchesResult[0].values[0][0] as number;
    }

    // Всего КПП
    let totalCheckpoints = 0;
    const checkpointsResult = this.db.exec('SELECT COUNT(*) FROM checkpoints WHERE status = ?', ['active']);
    if (checkpointsResult.length && checkpointsResult[0].values.length) {
      totalCheckpoints = checkpointsResult[0].values[0][0] as number;
    }

    // Всего агентств
    let totalAgencies = 0;
    const agenciesResult = this.db.exec('SELECT COUNT(*) FROM agencies WHERE status = ?', ['active']);
    if (agenciesResult.length && agenciesResult[0].values.length) {
      totalAgencies = agenciesResult[0].values[0][0] as number;
    }

    // Всего охранников
    let totalGuards = 0;
    const guardsResult = this.db.exec('SELECT COUNT(*) FROM guards');
    if (guardsResult.length && guardsResult[0].values.length) {
      totalGuards = guardsResult[0].values[0][0] as number;
    }

    // Активных охранников
    let activeGuards = 0;
    const activeGuardsResult = this.db.exec('SELECT COUNT(*) FROM guards WHERE status = ?', ['active']);
    if (activeGuardsResult.length && activeGuardsResult[0].values.length) {
      activeGuards = activeGuardsResult[0].values[0][0] as number;
    }

    // Среднее время на территории
    let avgTimeOnSite = '0ч 0м';
    const avgTimeResult = this.db.exec(`
      SELECT entry_time, exit_time 
      FROM visits 
      WHERE exit_time IS NOT NULL
      LIMIT 100
    `);

    if (avgTimeResult.length && avgTimeResult[0].values.length) {
      let totalMinutes = 0;
      let count = 0;

      for (const row of avgTimeResult[0].values) {
        try {
          const entry = this._parseDateTime(row[0] as string);
          const exit = this._parseDateTime(row[1] as string);
          const diffMinutes = (exit.getTime() - entry.getTime()) / (1000 * 60);
          totalMinutes += diffMinutes;
          count++;
        } catch (e) {
          // Пропускаем некорректные даты
        }
      }

      if (count > 0) {
        const avgMinutes = Math.floor(totalMinutes / count);
        const hours = Math.floor(avgMinutes / 60);
        const minutes = avgMinutes % 60;
        avgTimeOnSite = `${hours}ч ${minutes}м`;
      }
    }

    return {
      totalVisits,
      onSiteNow,
      totalBranches,
      totalCheckpoints,
      totalAgencies,
      totalGuards,
      activeGuards,
      avgTimeOnSite
    };
  }

  // Вспомогательная функция для парсинга даты формата DD.MM.YYYY HH:MM
  private _parseDateTime(dateStr: string): Date {
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
  }

  // Продолжение следует в следующем сообщении...
}

// Singleton instance
export const db = new DatabaseService();