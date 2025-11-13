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

  return {
    id: item.id,
    entryTime,
    exitTime,
    timeOnSite: formatDuration(item.entryAt, item.exitAt),
    fullName: item.fullName,
    iin: item.iin ?? "",
    company: item.company ?? "",
    phone: item.phone ?? "",
    purpose: item.visitPurpose ?? "",
    places,
    hasVehicle: Boolean(item.licensePlate),
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
    status: item.active ? "on-site" : "left",
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

