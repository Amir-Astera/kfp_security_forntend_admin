// ============================================
// KFP Security - TypeScript Types
// ============================================

// ============================================
// АВТОРИЗАЦИЯ
// ============================================

export interface AuthPrincipal {
  userId: string;
  role: string;
  email: string;
}

export interface AuthResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  principal: AuthPrincipal;
}

// ============================================
// ФИЛИАЛЫ
// ============================================
export interface Branch {
  id: string;
  name: string;
  city: string;
  region: string;
  street: string;
  building: string;
  latitude?: string;
  longitude?: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
  createdAt: string;
  checkpointsCount: number;
}

// ============================================
// КПП
// ============================================
export interface Checkpoint {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  type: "entry" | "exit" | "universal";
  description?: string;
  status: "active" | "inactive";
  createdAt: string;
  guardsCount: number;
}

// ============================================
// АГЕНТСТВА
// ============================================
export interface Agency {
  id: string;
  name: string;
  bin: string;
  director: string;
  phone: string;
  email: string;
  legalAddress: string;
  branches: string[];
  branchNames: string[];
  contractStart: string;
  contractEnd: string;
  loginEmail: string;
  password: string;
  status: "active" | "inactive";
  createdAt: string;
  guardsCount: number;
}

// ============================================
// ОХРАННИКИ
// ============================================
export interface Guard {
  id: string;
  fullName: string;
  iin: string;
  birthDate: string;
  phone: string;
  email?: string;
  photo?: string;
  agencyId: string;
  agencyName: string;
  branchId: string;
  branchName: string;
  checkpointId: string;
  checkpointName: string;
  shiftType: "day" | "night";
  shiftStart: string; // HH:MM
  shiftEnd: string; // HH:MM
  workDays: string[]; // ["ПН", "ВТ", ...]
  hireDate: string;
  status: "active" | "inactive" | "vacation" | "sick";
  loginEmail: string;
  password?: string; // Только для внутреннего использования, не отдавать в API
  visitsCount: number; // Количество зарегистрированных визитов
  lastActivity?: string; // Дата последней активности
}

// ============================================
// ВИЗИТЫ
// ============================================
export interface Visit {
  id: string;
  
  // Временные данные
  entryTime: string; // DD.MM.YYYY HH:MM
  exitTime?: string; // DD.MM.YYYY HH:MM или null
  timeOnSite?: string; // Время на территории (расчетное)
  
  // Данные гостя
  fullName: string;
  iin: string;
  company: string;
  phone: string;
  
  // Цель визита
  purpose: string; // Деловая встреча, Поставка товаров и т.д.
  places: string[]; // Места посещения
  
  // Транспорт (опционально)
  hasVehicle: boolean;
  vehicleNumber?: string;
  techPassport?: string;
  ttn?: string;
  cargoType?: string;
  
  // Привязки
  branchId: string;
  branchName: string;
  checkpointId: string;
  checkpointName: string;
  guardId: string;
  guardName: string;
  agencyId: string;
  agencyName: string;
  
  // Статус
  status: "on-site" | "left";
  
  // Метаданные
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// СТАТИСТИКА ДАШБОРДА
// ============================================
export interface DashboardStats {
  totalVisits: number;
  onSiteNow: number;
  totalBranches: number;
  totalCheckpoints: number;
  totalAgencies: number;
  totalGuards: number;
  activeGuards: number;
  avgTimeOnSite: string;
}

// ============================================
// ФИЛЬТРЫ
// ============================================
export interface VisitFilters {
  search?: string;
  branchId?: string;
  checkpointId?: string;
  agencyId?: string;
  status?: "all" | "on-site" | "left";
  dateFrom?: string;
  dateTo?: string;
  hasVehicle?: boolean;
  purpose?: string;
}

export interface GuardFilters {
  search?: string;
  agencyId?: string;
  branchId?: string;
  checkpointId?: string;
  status?: "all" | "active" | "inactive" | "vacation" | "sick";
  shiftType?: "all" | "day" | "night";
}

// ============================================
// API RESPONSES
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// API REQUESTS
// ============================================
export interface CreateVisitRequest {
  fullName: string;
  iin: string;
  company: string;
  phone: string;
  purpose: string;
  places: string[];
  branchId: string;
  checkpointId: string;
  guardId: string;
  hasVehicle: boolean;
  vehicleNumber?: string;
  techPassport?: string;
  ttn?: string;
  cargoType?: string;
}

export interface UpdateVisitRequest extends Partial<CreateVisitRequest> {
  exitTime?: string;
  status?: "on-site" | "left";
}

export interface CreateGuardRequest {
  fullName: string;
  iin: string;
  birthDate: string;
  phone: string;
  email?: string;
  photo?: string;
  agencyId: string;
  branchId: string;
  checkpointId: string;
  shiftType: "day" | "night";
  shiftStart: string;
  shiftEnd: string;
  workDays: string[];
  loginEmail: string;
}

export interface UpdateGuardRequest extends Partial<CreateGuardRequest> {
  status?: "active" | "inactive" | "vacation" | "sick";
}