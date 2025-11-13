import type { AuthResponse } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface ShiftRegistryItem {
  id: string;
  guardId?: string;
  guardName?: string;
  agencyName?: string;
  branchId?: string;
  branchName?: string;
  checkpointId?: string;
  checkpointName?: string;
  startAt?: string;
  endAt?: string;
  status?: string;
  kind?: string;
}

export interface ShiftRegistryResponse {
  items: ShiftRegistryItem[];
  page: number;
  size: number;
  total: number;
}

export interface ShiftRegistryQueryParams {
  date?: string;
  page?: number;
  size?: number;
  branchId?: string;
  year?: number;
  month?: number;
}

export interface ShiftDayCountersResponse {
  totalToday: number;
  dayShifts: number;
  nightShifts: number;
  completed: number;
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
    console.error("Ошибка обработки ответа API расписания", error);
  }

  throw new Error(message);
};

export async function getWeekShiftRegistry(
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">,
  params: ShiftRegistryQueryParams
): Promise<ShiftRegistryResponse> {
  const { date, page = 0, size = 50, branchId } = params;
  const queryString = buildQueryString({ date, page, size, branchId });
  const response = await fetch(`${API_BASE_URL}/api/v1/shifts/registry/week${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  await handleErrorResponse(response, "Не удалось загрузить расписание за неделю");
  return response.json();
}

export async function getDayShiftRegistry(
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">,
  params: ShiftRegistryQueryParams
): Promise<ShiftRegistryResponse> {
  const { date, page = 0, size = 50, branchId } = params;
  const queryString = buildQueryString({ date, page, size, branchId });
  const response = await fetch(`${API_BASE_URL}/api/v1/shifts/registry/day${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  await handleErrorResponse(response, "Не удалось загрузить расписание на день");
  return response.json();
}

export async function getMonthShiftRegistry(
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">,
  params: ShiftRegistryQueryParams
): Promise<ShiftRegistryResponse> {
  const { year, month, page = 0, size = 100, branchId } = params;
  const queryString = buildQueryString({ year, month, page, size, branchId });
  const response = await fetch(`${API_BASE_URL}/api/v1/shifts/registry/month${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  await handleErrorResponse(response, "Не удалось загрузить расписание на месяц");
  return response.json();
}

export async function getDayShiftCounters(
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">,
  params: ShiftRegistryQueryParams
): Promise<ShiftDayCountersResponse> {
  const { date, branchId } = params;
  const queryString = buildQueryString({ date, branchId });
  const response = await fetch(`${API_BASE_URL}/api/v1/shifts/registry/day/counters${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  await handleErrorResponse(response, "Не удалось загрузить статистику смен");
  return response.json();
}

