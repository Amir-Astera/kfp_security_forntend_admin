import type {
  AgencyListResponse,
  CreateAgencyRequest,
  UpdateAgencyRequest,
} from "../types";
import type { AuthResponse } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface GetAgenciesParams {
  page?: number;
  size?: number;
  q?: string;
  active?: boolean;
}

function buildQuery(params: GetAgenciesParams): string {
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

  if (typeof params.active === "boolean") {
    searchParams.set("active", String(params.active));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function buildAuthHeader(tokens: Pick<AuthResponse, "accessToken" | "tokenType">) {
  return `${tokens.tokenType} ${tokens.accessToken}`;
}

async function parseError(response: Response): Promise<never> {
  let message = "Не удалось выполнить запрос к API агентств";

  try {
    const body = await response.json();
    if (typeof body?.message === "string") {
      message = body.message;
    }
  } catch (error) {
    console.error("Ошибка разбора ответа сервера агентств", error);
  }

  throw new Error(message);
}

export async function fetchAgencies(
  params: GetAgenciesParams,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<AgencyListResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/agencies${buildQuery(params)}`,
    {
      headers: {
        Authorization: buildAuthHeader(tokens),
      },
    }
  );

  if (!response.ok) {
    return parseError(response);
  }

  return response.json();
}

export async function createAgency(
  payload: CreateAgencyRequest,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/agencies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: buildAuthHeader(tokens),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return parseError(response);
  }

  return response.json();
}

export async function updateAgency(
  agencyId: string,
  payload: UpdateAgencyRequest,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/agencies/${agencyId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: buildAuthHeader(tokens),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return parseError(response);
  }

  return response.json();
}

export async function deactivateAgencyBranch(
  agencyId: string,
  branchId: string,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/agencies/${agencyId}/branches/${branchId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: buildAuthHeader(tokens),
      },
    }
  );

  if (!response.ok) {
    return parseError(response);
  }
}

export async function activateAgencyBranch(
  agencyId: string,
  branchId: string,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/agencies/${agencyId}/branches/${branchId}`,
    {
      method: "POST",
      headers: {
        Authorization: buildAuthHeader(tokens),
      },
    }
  );

  if (!response.ok) {
    return parseError(response);
  }
}
