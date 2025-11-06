import {
  Guard,
  CreateGuardRequest,
  UpdateGuardRequest,
  GuardFilters,
  PaginatedResponse,
  Agency,
  Branch,
  Checkpoint,
} from "../types";
import { readCollection, writeCollection, STORAGE_KEYS } from "../utils/storage";
import {
  initialAgencies,
  initialBranches,
  initialCheckpoints,
  initialGuards,
} from "../data/initialData";
import { generateId } from "../utils/id";

// ============================================
// STORAGE HELPERS
// ============================================

const getGuardsFromStorage = (): Guard[] =>
  readCollection<Guard>(STORAGE_KEYS.guards, initialGuards);

const saveGuardsToStorage = (guards: Guard[]) =>
  writeCollection<Guard>(STORAGE_KEYS.guards, guards);

const getAgencyById = (id: string): Agency | undefined =>
  readCollection<Agency>(STORAGE_KEYS.agencies, initialAgencies).find(
    (agency) => agency.id === id
  );

const getBranchById = (id: string): Branch | undefined =>
  readCollection<Branch>(STORAGE_KEYS.branches, initialBranches).find(
    (branch) => branch.id === id
  );

const getCheckpointById = (id: string): Checkpoint | undefined =>
  readCollection<Checkpoint>(STORAGE_KEYS.checkpoints, initialCheckpoints).find(
    (checkpoint) => checkpoint.id === id
  );

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Получить список охранников с фильтрами и пагинацией
 */
export async function getGuards(
  filters?: GuardFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<Guard>> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  let filteredGuards = [...getGuardsFromStorage()];

  // Применяем фильтры
  if (filters) {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredGuards = filteredGuards.filter(
        (guard) =>
          guard.fullName.toLowerCase().includes(searchLower) ||
          guard.iin.includes(searchLower) ||
          guard.phone.includes(searchLower) ||
          guard.email?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.agencyId) {
      filteredGuards = filteredGuards.filter(
        (guard) => guard.agencyId === filters.agencyId
      );
    }

    if (filters.branchId) {
      filteredGuards = filteredGuards.filter(
        (guard) => guard.branchId === filters.branchId
      );
    }

    if (filters.checkpointId) {
      filteredGuards = filteredGuards.filter(
        (guard) => guard.checkpointId === filters.checkpointId
      );
    }

    if (filters.status && filters.status !== "all") {
      filteredGuards = filteredGuards.filter(
        (guard) => guard.status === filters.status
      );
    }

    if (filters.shiftType && filters.shiftType !== "all") {
      filteredGuards = filteredGuards.filter(
        (guard) => guard.shiftType === filters.shiftType
      );
    }
  }

  // Пагинация
  const total = filteredGuards.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = filteredGuards.slice(start, end);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Получить охранника по ID
 */
export async function getGuardById(id: string): Promise<Guard | null> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return getGuardsFromStorage().find((guard) => guard.id === id) || null;
}

/**
 * Создать нового охранника
 */
export async function createGuard(data: CreateGuardRequest): Promise<Guard> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const guards = getGuardsFromStorage();
  const agency = getAgencyById(data.agencyId);
  const branch = getBranchById(data.branchId);
  const checkpoint = getCheckpointById(data.checkpointId);

  const newGuard: Guard = {
    id: generateId("guard"),
    ...data,
    agencyName: agency?.name ?? "—",
    branchName: branch?.name ?? "—",
    checkpointName: checkpoint?.name ?? "—",
    status: "active",
    visitsCount: 0,
    hireDate: new Date().toLocaleDateString("ru-RU"),
  };

  guards.push(newGuard);
  saveGuardsToStorage(guards);
  return newGuard;
}

/**
 * Обновить охранника
 */
export async function updateGuard(
  id: string,
  data: UpdateGuardRequest
): Promise<Guard> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const guards = getGuardsFromStorage();
  const index = guards.findIndex((guard) => guard.id === id);
  if (index === -1) {
    throw new Error("Guard not found");
  }

  const existing = guards[index];
  const agency = data.agencyId
    ? getAgencyById(data.agencyId) ?? { name: existing.agencyName }
    : undefined;
  const branch = data.branchId
    ? getBranchById(data.branchId) ?? { name: existing.branchName }
    : undefined;
  const checkpoint = data.checkpointId
    ? getCheckpointById(data.checkpointId) ?? { name: existing.checkpointName }
    : undefined;

  const updatedGuard: Guard = {
    ...existing,
    ...data,
    agencyName: agency ? agency.name : existing.agencyName,
    branchName: branch ? branch.name : existing.branchName,
    checkpointName: checkpoint ? checkpoint.name : existing.checkpointName,
  };

  guards[index] = updatedGuard;
  saveGuardsToStorage(guards);

  return updatedGuard;
}

/**
 * Удалить охранника
 */
export async function deleteGuard(id: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const guards = getGuardsFromStorage();
  const filtered = guards.filter((guard) => guard.id !== id);
  if (filtered.length !== guards.length) {
    saveGuardsToStorage(filtered);
  }
}

/**
 * Сбросить пароль охранника
 */
export async function resetGuardPassword(id: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  // В реальном API здесь будет отправка нового пароля на email
}

/**
 * Экспорт охранников в Excel
 */
export async function exportGuards(filters?: GuardFilters): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return "/api/exports/guards-2024-11-04.xlsx";
}

/**
 * Получить статистику по охраннику
 */
export async function getGuardStats(id: string) {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const guard = getGuardsFromStorage().find((g) => g.id === id);
  if (!guard) return null;

  return {
    visitsToday: 12,
    visitsThisWeek: 45,
    visitsThisMonth: guard.visitsCount,
    avgVisitsPerDay: 8.5,
    lastShiftStart: "04.11.2024 08:00",
    lastShiftEnd: "04.11.2024 20:00",
    workDaysThisMonth: 18,
  };
}
