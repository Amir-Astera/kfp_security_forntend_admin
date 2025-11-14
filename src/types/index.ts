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
  active?: boolean;
  house?: string;
  updatedAt?: string;
  version?: number;
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
  active?: boolean;
  updatedAt?: string;
  version?: number;
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
  version?: number;
  active?: boolean;
}

export interface AgencyApiItem {
  id: string;
  name: string;
  bin: string;
  directorFullName: string;
  legalAddress: string;
  phone: string;
  email: string;
  attachedBranchIds: string[];
  contractStart: string;
  contractEnd: string;
  loginEmail: string;
  active: boolean;
  version?: number;
  guardsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgencyListResponse {
  items: AgencyApiItem[];
  page: number;
  size: number;
  total: number;
}

export interface CreateAgencyRequest {
  name: string;
  bin: string;
  directorFullName: string;
  legalAddress: string;
  phone: string;
  email: string;
  attachedBranchIds: string[];
  contractStart: string;
  contractEnd: string;
  loginEmail: string;
  loginPassword: string;
  active: boolean;
}

export interface UpdateAgencyRequest {
  name?: string;
  bin?: string;
  directorFullName?: string;
  legalAddress?: string;
  phone?: string;
  email?: string;
  attachedBranchIds?: string[];
  contractStart?: string;
  contractEnd?: string;
  loginEmail?: string;
  newLoginPassword?: string;
  active?: boolean;
  version: number;
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
  version?: number;
  active?: boolean;
  workingDays?: string[];
  createdAt?: string;
  updatedAt?: string;
  currentShiftId?: string;
}

// ============================================
// СМЕНЫ ОХРАННИКОВ
// ============================================

export type GuardShiftStatus = "PLANNED" | "ACTIVE" | "DONE";

export interface GuardShiftEventDetail {
  status: GuardShiftStatus;
  shiftId?: string;
  startedAt?: string;
  finishedAt?: string;
}

declare global {
  interface WindowEventMap {
    "guard-shift-updated": CustomEvent<GuardShiftEventDetail>;
  }
}

export interface GuardApiItem {
  id: string;
  agencyId: string;
  branchId: string;
  checkpointId: string;
  fullName: string;
  iin: string;
  birthDate: string;
  phone: string;
  email?: string;
  loginEmail: string;
  shiftType: string;
  shiftStart: string;
  shiftEnd: string;
  workingDays: string[];
  active: boolean;
  status?: string;
  branchName?: string;
  checkpointName?: string;
  agencyName?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GuardListResponse {
  items: GuardApiItem[];
  page: number;
  size: number;
  total: number;
}

// ============================================
// ФОТО ВСТУПЛЕНИЯ НА СМЕНУ
// ============================================

export type ShiftPhotoKind = "START" | "FINISH" | string;

export interface ShiftPhotoApiItem {
  id: string;
  shiftId: string;
  guardId: string;
  branchId: string;
  checkpointId: string;
  kind: ShiftPhotoKind;
  takenAt: string;
  fileId: string;
  fileDirectory: string;
  fileFormat: string;
  fileUrl: string;
  previewUrl: string;
  createdAt: string;
}

export interface ShiftPhotoListResponse {
  items: ShiftPhotoApiItem[];
  page: number;
  size: number;
  total: number;
}

// ============================================
// ДАШБОРД ОХРАННИКА
// ============================================
export interface GuardDashboardCardsResponse {
  presentNow: number;
  arrivedThisShift: number;
  leftThisShift: number;
}

export interface AgencyDashboardCards {
  guardsTotal: number;
  guardsActive: number;
  contractedBranches: number;
  onVacation: number;
  onSickLeave: number;
  overtimeCount: number;
  screenTimeTodayMinutes: number;
  onShiftNow: number;
}

export interface AgencyDashboardStatusSummary {
  active: number;
  vacation: number;
  sick: number;
}

export interface AgencyDashboardScreenTimeItem {
  guardId: string;
  guardName: string;
  minutes: number;
  branchName?: string;
}

export interface AgencyDashboardOvertimeItem {
  guardId: string;
  guardName: string;
  overtimeMinutes: number;
  branchName?: string;
}

export interface AgencyDashboardGuardStat {
  guardId: string;
  fullName: string;
  branchName: string;
  checkpointName: string;
  shiftType: "day" | "night";
  shiftStart?: string;
  shiftEnd?: string;
  avgProcessingTime?: string;
  avgProcessingTimeMinutes?: number;
  lateCount: number;
  actualHours?: number;
  plannedHours?: number;
  actualMinutes?: number;
  plannedMinutes?: number;
  overtimeHours?: number;
  overtimeMinutes?: number;
  status: "active" | "inactive" | "vacation" | "sick";
}

export interface AgencyDashboardResponse {
  cards: AgencyDashboardCards;
  screenTimeToday: AgencyDashboardScreenTimeItem[];
  overtimeList: AgencyDashboardOvertimeItem[];
  statusSummary: AgencyDashboardStatusSummary;
  guardStatsTable: AgencyDashboardGuardStat[];
}

export type GuardGuestKindScope = "SHIFT" | "PRESENT";

export interface GuardGuestKindItem {
  kind: string;
  count: number;
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

  // Тип визита
  kind?: string;
  
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

export type DashboardPeriod = "TODAY" | "WEEK" | "MONTH" | "YEAR" | "CUSTOM";

export interface SuperDashboardCards {
  branchesActive: number;
  checkpoints: number;
  agenciesActive: number;
  guardsActive: number;
  guardsOnShiftNow: number;
  visitsThisMonth: number;
  visitsThisMonthDeltaPct?: number;
  visitsToday: number;
  onPremisesNow: number;
  avgStayMinutes: number;
}

export interface SuperDashboardVisitByDay {
  date: string;
  count: number;
}

export interface SuperDashboardMonthByBranch {
  branchId: string;
  branchName: string;
  count: number;
}

export interface SuperDashboardTopCompany {
  company: string;
  count: number;
}

export interface SuperDashboardPurposeShare {
  purpose: string;
  count: number;
  percent: number;
}

export interface SuperDashboardGuardHeatmap {
  guardId: string;
  guardName: string;
  hours: number[];
}

export interface SuperDashboardVisitSummary {
  id: string;
  entryAt: string;
  exitAt?: string | null;
  fullName: string;
  iin: string;
  company: string;
  purpose: string;
  branchName: string;
  checkpointName: string;
  status: string;
}

export interface SuperDashboardResponse {
  cards: SuperDashboardCards;
  visitsByDay7: SuperDashboardVisitByDay[];
  monthByBranch: SuperDashboardMonthByBranch[];
  topCompanies10: SuperDashboardTopCompany[];
  purposeShare: SuperDashboardPurposeShare[];
  guardHeatmap: SuperDashboardGuardHeatmap[];
  latestVisits: SuperDashboardVisitSummary[];
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
  password?: string;
  status?: "active" | "inactive" | "vacation" | "sick";
  active?: boolean;
  loginPassword?: string;
  workingDays?: string[];
}

export interface UpdateGuardRequest extends Partial<CreateGuardRequest> {
  status?: "active" | "inactive" | "vacation" | "sick";
}

// ============================================
// ФОТО СМЕН
// ============================================

export interface ShiftPhotoApiItem {
  id: string;
  shiftId: string;
  guardId: string;
  guardFullName?: string;
  guardName?: string;
  agencyId?: string;
  agencyName?: string;
  branchId?: string;
  branchName?: string;
  checkpointId?: string;
  checkpointName?: string;
  kind: "START" | "END";
  shiftType?: string | null;
  takenAt?: string | null;
  fileId?: string;
  fileDirectory?: string;
  fileFormat?: string;
  fileUrl?: string;
  previewUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftPhotoListResponse {
  items: ShiftPhotoApiItem[];
  page: number;
  size: number;
  total: number;
}
