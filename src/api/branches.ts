import type { AuthResponse } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface CreateBranchRequest {
  name: string;
  city: string;
  region: string;
  street: string;
  house: string;
  latitude?: number | null;
  longitude?: number | null;
  phone: string;
  email: string;
  active: boolean;
}

export interface UpdateBranchRequest extends CreateBranchRequest {}

export interface BranchApiResponse {
  id: string;
  name: string;
  city: string;
  region: string;
  street: string;
  house: string;
  latitude?: number | null;
  longitude?: number | null;
  phone: string;
  email: string;
  active: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface BranchesQueryParams {
  page?: number;
  size?: number;
  active?: boolean;
  q?: string;
}

export interface BranchesResponse {
  items: BranchApiResponse[];
  page: number;
  size: number;
  total: number;
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
    console.error("Ошибка разбора ответа API филиалов", error);
  }

  throw new Error(message);
};

export async function getBranches(
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">,
  params: BranchesQueryParams = {}
): Promise<BranchesResponse> {
  const { page = 0, size = 25, ...rest } = params;
  const queryString = buildQueryString({ page, size, ...rest });
  const response = await fetch(`${API_BASE_URL}/api/v1/branches${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  await handleErrorResponse(response, "Не удалось загрузить филиалы");
  return response.json();
}

export async function getBranchById(
  branchId: string,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<BranchApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/branches/${branchId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  await handleErrorResponse(response, "Не удалось загрузить данные филиала");
  return response.json();
}

export async function createBranch(
  request: CreateBranchRequest,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<BranchApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/branches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
    body: JSON.stringify(request),
  });

  await handleErrorResponse(response, "Не удалось создать филиал");
  return response.json();
}

export async function updateBranch(
  branchId: string,
  request: UpdateBranchRequest,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<BranchApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/branches/${branchId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
    body: JSON.stringify(request),
  });

  await handleErrorResponse(response, "Не удалось обновить филиал");
  return response.json();
}
