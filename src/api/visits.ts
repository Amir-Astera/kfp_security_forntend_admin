import type { AuthResponse, Visit } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface GuestVisitApiItem {
  id: string;
  guardId?: string;
  guardName?: string;
  agencyId?: string;
  agencyName?: string;
  branchId?: string;
  branchName?: string;
  checkpointId?: string;
  checkpointName?: string;
  kind?: string;
  fullName: string;
  iin?: string;
  phone?: string;
  company?: string;
  visitPurpose?: string;
  visitPlaces?: string[];
  visitPlace?: string;
  notes?: string;
  licensePlate?: string;
  techPassportNo?: string;
  ttnNo?: string;
  cargoType?: string;
  entryAt?: string;
  exitAt?: string;
  active?: boolean;
  status?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GuestVisitsResponse {
  items: GuestVisitApiItem[];
  page: number;
  size: number;
  total: number;
}

export interface GuestVisitsQueryParams {
  page?: number;
  size?: number;
  branchId?: string;
  guardId?: string;
  search?: string;
  active?: boolean;
}

export interface CreateGuestVisitRequest {
  guardId: string;
  branchId: string;
  checkpointId: string;
  fullName: string;
  iin?: string;
  phone?: string;
  company?: string;
  visitPurpose?: string;
  visitPlaces?: string[];
  visitPlace?: string;
  notes?: string;
  kind: string;
  licensePlate?: string;
  techPassportNo?: string;
  ttnNo?: string;
  cargoType?: string;
  entryAt: string;
  exitAt?: string;
  active: boolean;
}

export interface PresentGuestVisitsQueryParams {
  page?: number;
  size?: number;
  checkpointId?: string;
  branchId?: string;
  guardId?: string;
}

export interface GuardShiftHistoryQueryParams {
  page?: number;
  size?: number;
  checkpointId?: string;
  status?: string;
}

const buildQueryString = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.append(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

const getAuthHeaders = (tokens: Pick<AuthResponse, "accessToken" | "tokenType">) => ({
  Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
});

const handleErrorResponse = async (response: Response, fallbackMessage: string) => {
  if (response.ok) {
    return;
  }

  let message = fallbackMessage;

  try {
    const errorBody = await response.json();
    if (typeof errorBody?.message === "string") {
      message = errorBody.message;
    }
  } catch (error) {
    console.error("Ошибка обработки ответа API визитов", error);
  }

  throw new Error(message);
};

const handleGuestVisitError = async (response: Response, fallbackMessage: string) => {
  if (response.ok) {
    return;
  }

  let message = fallbackMessage;

  try {
    const errorBody = await response.json();
    if (typeof errorBody?.message === "string") {
      message = errorBody.message;
    }
  } catch (error) {
    console.error("Ошибка обработки ответа API визита", error);
  }

  throw new Error(message);
};

const formatDateTime = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (start?: string, end?: string): string | undefined => {
  if (!start || !end) {
    return undefined;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return undefined;
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) {
    return undefined;
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const hoursLabel = hours > 0 ? `${hours}ч` : "";
  const minutesLabel = `${minutes}м`;

  return `${hoursLabel ? `${hoursLabel} ` : ""}${minutesLabel}`.trim();
};

export const mapGuestVisitToVisit = (item: GuestVisitApiItem): Visit => {
  const entryTime = formatDateTime(item.entryAt) ?? item.entryAt ?? "";
  const exitTime = formatDateTime(item.exitAt);
  const createdAt = formatDateTime(item.createdAt) ?? item.createdAt ?? "";
  const updatedAt = formatDateTime(item.updatedAt);

  const places = [
    ...(Array.isArray(item.visitPlaces) ? item.visitPlaces : []),
    item.visitPlace ?? undefined,
  ].filter((place): place is string => Boolean(place));

  const normalizedKind = item.kind?.toUpperCase();
  const hasVehicle =
    normalizedKind === "VEHICLE" ||
    normalizedKind === "TRANSPORT" ||
    normalizedKind === "CAR" ||
    Boolean(item.licensePlate);
  const visitKind = normalizedKind ?? (hasVehicle ? "TRANSPORT" : "PERSON");

  const normalizedStatus = item.status?.toUpperCase();
  const isOnTerritory =
    item.active === true ||
    normalizedStatus === "ON_TERRITORY" ||
    normalizedStatus === "ON_SITE" ||
    normalizedStatus === "PRESENT" ||
    normalizedStatus === "ACTIVE";

  return {
    id: item.id,
    entryTime,
    exitTime,
    timeOnSite: formatDuration(item.entryAt, item.exitAt),
    fullName: item.fullName,
    iin: item.iin ?? "",
    company: item.company ?? "",
    phone: item.phone ?? "",
    kind: visitKind,
    purpose: item.visitPurpose ?? "",
    places,
    hasVehicle,
    vehicleNumber: item.licensePlate ?? undefined,
    techPassport: item.techPassportNo ?? undefined,
    ttn: item.ttnNo ?? undefined,
    cargoType: item.cargoType ?? undefined,
    branchId: item.branchId ?? "",
    branchName: item.branchName ?? "",
    checkpointId: item.checkpointId ?? "",
    checkpointName: item.checkpointName ?? "",
    guardId: item.guardId ?? "",
    guardName: item.guardName ?? "",
    agencyId: item.agencyId ?? "",
    agencyName: item.agencyName ?? "",
    status: isOnTerritory ? "on-site" : "left",
    createdAt,
    updatedAt,
  };
};

export async function getGuestVisits(
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">,
  params: GuestVisitsQueryParams = {}
): Promise<GuestVisitsResponse> {
  const { page = 0, size = 25, ...rest } = params;
  const queryString = buildQueryString({ page, size, ...rest });
  const response = await fetch(`${API_BASE_URL}/api/v1/guests${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  await handleErrorResponse(response, "Не удалось загрузить список визитов");
  return response.json();
}

export async function getPresentGuestVisits(
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">,
  params: PresentGuestVisitsQueryParams = {}
): Promise<GuestVisitsResponse> {
  const { page = 0, size = 20, ...rest } = params;
  const { checkpointId, ...filters } = rest;
  const queryString = buildQueryString({ checkpointId, page, size, ...filters });
  const response = await fetch(
    `${API_BASE_URL}/api/v1/guests/present${queryString}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(tokens),
      },
    }
  );

  await handleErrorResponse(response, "Не удалось загрузить список гостей на территории");
  return response.json();
}

export async function getGuardShiftHistory(
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">,
  params: GuardShiftHistoryQueryParams = {}
): Promise<GuestVisitsResponse> {
  const { page = 0, size = 25, ...rest } = params;
  const queryString = buildQueryString({ page, size, ...rest });
  const response = await fetch(
    `${API_BASE_URL}/api/v1/dashboard/guard/shift/history${queryString}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(tokens),
      },
    }
  );

  await handleErrorResponse(response, "Не удалось загрузить историю визитов за смену");
  return response.json();
}

export async function createGuestVisit(
  request: CreateGuestVisitRequest,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<GuestVisitApiItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/guests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
    body: JSON.stringify(request),
  });

  await handleGuestVisitError(response, "Не удалось зарегистрировать визит");
  return response.json();
}

export async function closeGuestVisit(
  visitId: string,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<GuestVisitApiItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/guests/${visitId}/close`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  await handleGuestVisitError(response, "Не удалось зарегистрировать выезд");
  return response.json();
}

export function getVisitPurposes(): string[] {
  return [
    "Деловая встреча",
    "Поставка товаров",
    "Обслуживание",
    "Совещание",
    "Инспекция",
    "Ремонтные работы",
    "Прочее",
  ];
}

export function getCargoTypes(): string[] {
  return [
    "Сельхозтехника",
    "Удобрения",
    "Семена",
    "Корма",
    "Оборудование",
    "Стройматериалы",
    "Продукция",
    "Запчасти",
    "Прочее",
  ];
}

