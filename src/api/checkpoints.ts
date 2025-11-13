import type { AuthResponse } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface CheckpointApiItem {
  id: string;
  branchId: string;
  name: string;
  description?: string | null;
  active: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CheckpointsResponse {
  items: CheckpointApiItem[];
  page: number;
  size: number;
  total: number;
}

export interface CheckpointsQueryParams {
  page?: number;
  size?: number;
  branchId?: string;
  active?: boolean;
  q?: string;
}

export interface CreateCheckpointRequest {
  branchId: string;
  name: string;
  description?: string | null;
  active: boolean;
  id?: string;
}

export interface UpdateCheckpointRequest {
  name: string;
  description?: string | null;
  active: boolean;
  version: number;
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
    console.error("Ошибка разбора ответа API КПП", error);
  }

  throw new Error(message);
};

export async function getCheckpoints(
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">,
  params: CheckpointsQueryParams = {}
): Promise<CheckpointsResponse> {
  const { page = 0, size = 25, ...rest } = params;
  const queryString = buildQueryString({ page, size, ...rest });
  const response = await fetch(`${API_BASE_URL}/api/v1/checkpoints${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  await handleErrorResponse(response, "Не удалось загрузить список КПП");
  return response.json();
}

export async function getCheckpointById(
  checkpointId: string,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<CheckpointApiItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/checkpoints/${checkpointId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  await handleErrorResponse(response, "Не удалось загрузить данные КПП");
  return response.json();
}

export async function createCheckpoint(
  request: CreateCheckpointRequest,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<CheckpointApiItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/checkpoints`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
    body: JSON.stringify(request),
  });

  await handleErrorResponse(response, "Не удалось создать КПП");
  return response.json();
}

export async function updateCheckpoint(
  checkpointId: string,
  request: UpdateCheckpointRequest,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<CheckpointApiItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/checkpoints/${checkpointId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
    body: JSON.stringify(request),
  });

  await handleErrorResponse(response, "Не удалось обновить КПП");
  return response.json();
}
