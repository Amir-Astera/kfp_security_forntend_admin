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

export interface BranchApiResponse {
  id?: string;
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
  [key: string]: unknown;
}

export async function createBranch(
  request: CreateBranchRequest,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<BranchApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/branches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let message = "Не удалось создать филиал";

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.message === "string") {
        message = errorBody.message;
      }
    } catch (error) {
      console.error("Ошибка разбора ответа создания филиала", error);
    }

    throw new Error(message);
  }

  return response.json();
}
