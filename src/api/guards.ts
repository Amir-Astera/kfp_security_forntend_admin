import {
  Guard,
  CreateGuardRequest,
  UpdateGuardRequest,
  GuardFilters,
  PaginatedResponse,
  GuardListResponse,
} from "../types";
import type { GuardApiItem, AuthResponse } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

// ============================================
// MOCK DATA
// ============================================

const mockGuards: Guard[] = [
  {
    id: "1",
    fullName: "Сергеев Иван Петрович",
    iin: "850620301234",
    birthDate: "20.06.1985",
    phone: "+7 727 111 2222",
    email: "sergeev@kzsecurity.kz",
    agencyId: "1",
    agencyName: "ТОО «Казахстан Секьюрити»",
    branchId: "1",
    branchName: "Алматы - Центральный офис",
    checkpointId: "1",
    checkpointName: "КПП-1 (Главный въезд)",
    shiftType: "day",
    shiftStart: "08:00",
    shiftEnd: "20:00",
    workDays: ["ПН", "ВТ", "СР", "ЧТ", "ПТ"],
    hireDate: "15.01.2024",
    status: "active",
    loginEmail: "sergeev.guard@kfp.kz",
    visitsCount: 245,
    lastActivity: "04.11.2024 12:30",
  },
  {
    id: "2",
    fullName: "Абдуллаев Марат Саматович",
    iin: "920315401567",
    birthDate: "15.03.1992",
    phone: "+7 727 222 3333",
    email: "abdullaev@kzsecurity.kz",
    agencyId: "1",
    agencyName: "ТОО «Казахстан Секьюрити»",
    branchId: "1",
    branchName: "Алматы - Центральный офис",
    checkpointId: "2",
    checkpointName: "КПП-2 (Грузовой въезд)",
    shiftType: "day",
    shiftStart: "06:00",
    shiftEnd: "18:00",
    workDays: ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"],
    hireDate: "15.01.2024",
    status: "active",
    loginEmail: "abdullaev.guard@kfp.kz",
    visitsCount: 178,
    lastActivity: "04.11.2024 08:45",
  },
  {
    id: "3",
    fullName: "Турсунов Бахтияр Нурланович",
    iin: "880910501890",
    birthDate: "10.09.1988",
    phone: "+7 727 333 4444",
    agencyId: "1",
    agencyName: "ТОО «Казахстан Секьюрити»",
    branchId: "1",
    branchName: "Алматы - Центральный офис",
    checkpointId: "4",
    checkpointName: "КПП-4 (Универсальный)",
    shiftType: "night",
    shiftStart: "20:00",
    shiftEnd: "08:00",
    workDays: ["ПН", "ВТ", "СР", "ЧТ", "ПТ"],
    hireDate: "20.01.2024",
    status: "active",
    loginEmail: "tursunov.guard@kfp.kz",
    visitsCount: 134,
    lastActivity: "04.11.2024 11:45",
  },
  {
    id: "4",
    fullName: "Жумагулов Ерлан Асхатович",
    iin: "950203601234",
    birthDate: "03.02.1995",
    phone: "+7 727 444 5555",
    email: "zhumagulov@kzsecurity.kz",
    agencyId: "1",
    agencyName: "ТОО «Казахстан Секьюрити»",
    branchId: "1",
    branchName: "Алматы - Центральный офис",
    checkpointId: "3",
    checkpointName: "КПП-3 (Выезд)",
    shiftType: "day",
    shiftStart: "08:00",
    shiftEnd: "20:00",
    workDays: ["СБ", "ВС"],
    hireDate: "20.01.2024",
    status: "active",
    loginEmail: "zhumagulov.guard@kfp.kz",
    visitsCount: 89,
    lastActivity: "03.11.2024 19:45",
  },
  {
    id: "5",
    fullName: "Петров Александр Иванович",
    iin: "870825302345",
    birthDate: "25.08.1987",
    phone: "+7 717 555 6666",
    agencyId: "1",
    agencyName: "ТОО «Казахстан Секьюрити»",
    branchId: "2",
    branchName: "Астана - Северный",
    checkpointId: "5",
    checkpointName: "КПП-1 (Главный)",
    shiftType: "day",
    shiftStart: "08:00",
    shiftEnd: "20:00",
    workDays: ["ПН", "ВТ", "СР", "ЧТ", "ПТ"],
    hireDate: "20.02.2024",
    status: "active",
    loginEmail: "petrov.guard@kfp.kz",
    visitsCount: 156,
    lastActivity: "04.11.2024 10:20",
  },
  {
    id: "6",
    fullName: "Каримов Азамат Ерланович",
    iin: "930512401456",
    birthDate: "12.05.1993",
    phone: "+7 717 666 7777",
    email: "karimov@kzsecurity.kz",
    agencyId: "1",
    agencyName: "ТОО «Казахстан Секьюрити»",
    branchId: "2",
    branchName: "Астана - Северный",
    checkpointId: "6",
    checkpointName: "КПП-2 (Грузовой)",
    shiftType: "day",
    shiftStart: "06:00",
    shiftEnd: "18:00",
    workDays: ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"],
    hireDate: "20.02.2024",
    status: "vacation",
    loginEmail: "karimov.guard@kfp.kz",
    visitsCount: 98,
    lastActivity: "28.10.2024 17:30",
  },
  {
    id: "7",
    fullName: "Ким Сергей Викторович",
    iin: "900914501678",
    birthDate: "14.09.1990",
    phone: "+7 725 777 8888",
    agencyId: "2",
    agencyName: "ТОО «Альфа-Охрана»",
    branchId: "3",
    branchName: "Шымкент - Южный филиал",
    checkpointId: "7",
    checkpointName: "КПП-1",
    shiftType: "day",
    shiftStart: "08:00",
    shiftEnd: "20:00",
    workDays: ["ПН", "ВТ", "СР", "ЧТ", "ПТ"],
    hireDate: "10.03.2024",
    status: "active",
    loginEmail: "kim.guard@kfp.kz",
    visitsCount: 112,
    lastActivity: "04.11.2024 07:30",
  },
  {
    id: "8",
    fullName: "Нурланов Бауыржан Серикович",
    iin: "880620601890",
    birthDate: "20.06.1988",
    phone: "+7 725 888 9999",
    email: "nurlanov@alfaguard.kz",
    agencyId: "2",
    agencyName: "ТОО «Альфа-Охрана»",
    branchId: "3",
    branchName: "Шымкент - Южный филиал",
    checkpointId: "7",
    checkpointName: "КПП-1",
    shiftType: "night",
    shiftStart: "20:00",
    shiftEnd: "08:00",
    workDays: ["ПН", "ВТ", "СР", "ЧТ", "ПТ"],
    hireDate: "10.03.2024",
    status: "active",
    loginEmail: "nurlanov.guard@kfp.kz",
    visitsCount: 67,
    lastActivity: "03.11.2024 23:15",
  },
  {
    id: "9",
    fullName: "Смирнов Владимир Андреевич",
    iin: "920203702345",
    birthDate: "03.02.1992",
    phone: "+7 721 999 0000",
    agencyId: "3",
    agencyName: "АО «БезопасностьПлюс»",
    branchId: "4",
    branchName: "Караганда - Промышленный",
    checkpointId: "8",
    checkpointName: "КПП-1",
    shiftType: "day",
    shiftStart: "08:00",
    shiftEnd: "20:00",
    workDays: ["ПН", "СР", "ПТ"],
    hireDate: "05.04.2024",
    status: "inactive",
    loginEmail: "smirnov.guard@kfp.kz",
    visitsCount: 0,
    lastActivity: "15.10.2024 15:00",
  },
  {
    id: "10",
    fullName: "Жанабаев Ержан Болатович",
    iin: "850512301456",
    birthDate: "12.05.1985",
    phone: "+7 713 101 2020",
    email: "zhanabayev@securityplus.kz",
    agencyId: "3",
    agencyName: "АО «БезопасностьПлюс»",
    branchId: "5",
    branchName: "Актобе - Западный",
    checkpointId: "10",
    checkpointName: "КПП-2",
    shiftType: "day",
    shiftStart: "06:00",
    shiftEnd: "18:00",
    workDays: ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"],
    hireDate: "25.04.2024",
    status: "active",
    loginEmail: "zhanabayev.guard@kfp.kz",
    visitsCount: 78,
    lastActivity: "04.11.2024 11:00",
  },
];

// ============================================
// API FUNCTIONS (MOCK IMPLEMENTATION)
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

  let filteredGuards = [...mockGuards];

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
  return mockGuards.find((guard) => guard.id === id) || null;
}

/**
 * Создать нового охранника
 */
export async function createGuard(
  data: CreateGuardRequest,
  tokens?: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<Guard> {
  if (!tokens?.accessToken || !tokens?.tokenType) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const normalizedStatus = (data.status ?? "active") as Guard["status"];
    const newGuard: Guard = {
      id: String(mockGuards.length + 1),
      ...data,
      agencyName: "Название агентства",
      branchName: "Название филиала",
      checkpointName: "Название КПП",
      status: normalizedStatus,
      visitsCount: 0,
      hireDate: new Date().toLocaleDateString("ru-RU"),
      active: data.active ?? normalizedStatus === "active",
      workingDays: data.workingDays ?? mapWorkingDaysForApi(data.workDays),
      password: data.password,
    };

    mockGuards.push(newGuard);
    return newGuard;
  }

  const payload = {
    agencyId: data.agencyId,
    branchId: data.branchId,
    checkpointId: data.checkpointId,
    fullName: data.fullName,
    iin: data.iin,
    birthDate: normalizeBirthDateForApi(data.birthDate),
    phone: normalizePhoneNumberForApi(data.phone),
    email: data.email ?? undefined,
    loginEmail: data.loginEmail,
    loginPassword: data.loginPassword ?? data.password ?? "",
    shiftType: normalizeShiftTypeForApi(data.shiftType),
    shiftStart: normalizeShiftTimeForApi(data.shiftStart),
    shiftEnd: normalizeShiftTimeForApi(data.shiftEnd),
    workingDays: mapWorkingDaysForApi(data.workingDays ?? data.workDays),
    active: data.active ?? true,
    status: normalizeStatusForApi(data.status),
  };

  if (!payload.loginPassword) {
    delete (payload as { loginPassword?: string }).loginPassword;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/guards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return parseGuardMutationError(response, "Не удалось создать охранника");
  }

  const body = (await response.json()) as GuardApiItem;

  return mapGuardFromApi(body, {
    agencyName: body.agencyName ?? "",
    branchName: body.branchName ?? "",
    checkpointName: body.checkpointName ?? "",
  });
}

/**
 * Обновить охранника
 */
export async function updateGuard(
  id: string,
  data: UpdateGuardRequest
): Promise<Guard> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const index = mockGuards.findIndex((guard) => guard.id === id);
  if (index === -1) {
    throw new Error("Guard not found");
  }

  mockGuards[index] = {
    ...mockGuards[index],
    ...data,
  };

  return mockGuards[index];
}

/**
 * Удалить охранника
 */
export async function deleteGuard(id: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const index = mockGuards.findIndex((guard) => guard.id === id);
  if (index !== -1) {
    mockGuards.splice(index, 1);
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

  const guard = mockGuards.find((g) => g.id === id);
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

export interface GuardsApiParams {
  page?: number;
  size?: number;
  agencyId?: string;
  branchId?: string;
  checkpointId?: string;
  q?: string;
  shiftType?: string;
  active?: boolean;
}

const WORK_DAY_MAP: Record<string, string> = {
  MON: "ПН",
  TUE: "ВТ",
  WED: "СР",
  THU: "ЧТ",
  FRI: "ПТ",
  SAT: "СБ",
  SUN: "ВС",
};

const WORK_DAY_REVERSE_MAP: Record<string, string> = {
  ПН: "MON",
  ВТ: "TUE",
  СР: "WED",
  ЧТ: "THU",
  ПТ: "FRI",
  СБ: "SAT",
  ВС: "SUN",
};

const normalizeBirthDateForApi = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }

  return value;
};

const normalizePhoneNumberForApi = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return value.replace(/\s+/g, "");
  }

  if (digits.startsWith("8") && digits.length === 11) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.startsWith("7")) {
    return `+${digits}`;
  }

  if (value.trim().startsWith("+")) {
    return value.replace(/\s+/g, "");
  }

  return `+${digits}`;
};

const normalizeShiftTimeForApi = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{2}:\d{2}$/.test(value)) {
    return `${value}:00`;
  }

  return value;
};

const normalizeShiftTypeForApi = (value?: string): "DAY" | "NIGHT" => {
  const normalized = (value ?? "day").toUpperCase();
  return normalized === "NIGHT" ? "NIGHT" : "DAY";
};

const mapWorkingDaysForApi = (days?: string[]): string[] => {
  if (!Array.isArray(days)) {
    return [];
  }

  return days.map((day) => {
    const upper = day.trim().toUpperCase();
    return WORK_DAY_REVERSE_MAP[upper as keyof typeof WORK_DAY_REVERSE_MAP] ?? upper;
  });
};

const normalizeStatusForApi = (value?: string): string => {
  if (!value) {
    return "ACTIVE";
  }

  const normalized = value.toUpperCase();
  return normalized;
};

const parseGuardMutationError = async (
  response: Response,
  fallbackMessage: string
): Promise<never> => {
  let message = fallbackMessage;

  try {
    const body = await response.json();
    if (typeof body?.message === "string") {
      message = body.message;
    }
  } catch (error) {
    console.error("Ошибка разбора ответа сервера при сохранении охранника", error);
  }

  throw new Error(message);
};

function buildGuardsQuery(params: GuardsApiParams): string {
  const searchParams = new URLSearchParams();

  if (typeof params.page === "number") {
    searchParams.set("page", params.page.toString());
  }

  if (typeof params.size === "number") {
    searchParams.set("size", params.size.toString());
  }

  if (params.q) {
    searchParams.set("q", params.q);
  }

  if (params.agencyId) {
    searchParams.set("agencyId", params.agencyId);
  }

  if (params.branchId) {
    searchParams.set("branchId", params.branchId);
  }

  if (params.checkpointId) {
    searchParams.set("checkpointId", params.checkpointId);
  }

  if (params.shiftType) {
    searchParams.set("shiftType", params.shiftType);
  }

  if (typeof params.active === "boolean") {
    searchParams.set("active", String(params.active));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

async function parseGuardsError(response: Response): Promise<never> {
  let message = "Не удалось загрузить список охранников";

  try {
    const body = await response.json();
    if (typeof body?.message === "string") {
      message = body.message;
    }
  } catch (error) {
    console.error("Ошибка разбора ответа сервера охранников", error);
  }

  throw new Error(message);
}

async function parseGuardDetailError(response: Response): Promise<never> {
  let message = "Не удалось загрузить данные охранника";

  try {
    const body = await response.json();
    if (typeof body?.message === "string") {
      message = body.message;
    }
  } catch (error) {
    console.error("Ошибка разбора ответа сервера охранника", error);
  }

  throw new Error(message);
}

const formatTime = (value?: string) => {
  if (!value) return "";
  return value.slice(0, 5);
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("ru-RU");
};

const formatDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const datePart = date.toLocaleDateString("ru-RU");
  const timePart = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} ${timePart}`;
};

export async function fetchGuardsFromApi(
  params: GuardsApiParams,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<GuardListResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/guards${buildGuardsQuery(params)}`,
    {
      headers: {
        Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return parseGuardsError(response);
  }

  return response.json();
}

export async function fetchGuardByIdFromApi(
  guardId: string,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<GuardApiItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/guards/${guardId}`, {
    headers: {
      Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
    },
  });

  if (!response.ok) {
    return parseGuardDetailError(response);
  }

  return response.json();
}

export function mapGuardFromApi(
  guard: GuardApiItem,
  names?: {
    agencyName?: string;
    branchName?: string;
    checkpointName?: string;
  }
): Guard {
  const guardWithShift = guard as GuardApiItem & {
    currentShiftId?: string;
    activeShiftId?: string;
    shiftId?: string;
  };

  const shiftType = guard.shiftType?.toLowerCase();
  const normalizedShiftType = shiftType === "night" ? "night" : "day";
  const status = guard.status
    ? guard.status.toLowerCase()
    : guard.active
      ? "active"
      : "inactive";

  const currentShiftId =
    guardWithShift.currentShiftId ??
    guardWithShift.activeShiftId ??
    guardWithShift.shiftId;

  const workDays = Array.isArray(guard.workingDays)
    ? guard.workingDays.map((day) => WORK_DAY_MAP[day] ?? day)
    : [];

  return {
    id: guard.id,
    fullName: guard.fullName,
    iin: guard.iin,
    birthDate: formatDate(guard.birthDate),
    phone: guard.phone,
    email: guard.email,
    agencyId: guard.agencyId,
    agencyName: names?.agencyName ?? guard.agencyName ?? "",
    branchId: guard.branchId,
    branchName: names?.branchName ?? guard.branchName ?? "",
    checkpointId: guard.checkpointId,
    checkpointName: names?.checkpointName ?? guard.checkpointName ?? "",
    shiftType: normalizedShiftType,
    shiftStart: formatTime(guard.shiftStart),
    shiftEnd: formatTime(guard.shiftEnd),
    workDays,
    hireDate: formatDate(guard.createdAt),
    status: status as Guard["status"],
    loginEmail: guard.loginEmail,
    visitsCount: 0,
    lastActivity: formatDateTime(guard.updatedAt),
    password: undefined,
    version: guard.version,
    active: guard.active,
    workingDays: guard.workingDays,
    createdAt: guard.createdAt,
    updatedAt: guard.updatedAt,
    currentShiftId,
  };
}
