import type { AuthResponse, ShiftPhotoListResponse } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface ShiftPhotoQueryParams {
  page?: number;
  size?: number;
  guardId?: string;
  branchId?: string;
  checkpointId?: string;
  kind?: string;
  from?: string;
  to?: string;
}

const buildQueryString = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
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
    const body = await response.json();
    if (typeof body?.message === "string" && body.message.trim()) {
      message = body.message;
    }
  } catch (error) {
    console.error("Не удалось обработать ответ API фото смен", error);
  }

  throw new Error(message);
};

export async function fetchShiftPhotos(
  params: ShiftPhotoQueryParams,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<ShiftPhotoListResponse> {
  const { page = 0, size = 50, ...rest } = params ?? {};
  const queryString = buildQueryString({ page, size, ...rest });

  const response = await fetch(`${API_BASE_URL}/api/v1/shift-photos${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  await handleErrorResponse(response, "Не удалось загрузить фото вступления на смену");
  return response.json();
}
