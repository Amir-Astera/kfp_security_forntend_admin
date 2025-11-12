// ============================================
// KFP Security - Database Service Index
// Экспорт всех методов работы с БД
// ============================================

import { db } from './database';
import { extendDatabaseService } from './database-extended';

// Расширяем базовый сервис методами для агентств, охранников и визитов
extendDatabaseService();

// Экспортируем расширенный сервис
export { db };
export * from './database';
export * from './database-extended';
