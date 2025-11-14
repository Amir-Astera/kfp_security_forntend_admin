import type { AuthResponse, ShiftPhotoListResponse } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface ShiftPhotoQueryParams {
  page?: number;
  size?: number;
  from?: string;
  to?: string;
  guardId?: string;
  branchId?: string;
  agencyId?: string;
}

function buildShiftPhotoQuery(params: ShiftPhotoQueryParams): string {
  const searchParams = new URLSearchParams();

  if (typeof params.page === "number") {
    searchParams.set("page", String(params.page));
  }

  if (typeof params.size === "number") {
    searchParams.set("size", String(params.size));
  }

  if (params.from) {
    searchParams.set("from", params.from);
  }

  if (params.to) {
    searchParams.set("to", params.to);
  }

  if (params.guardId) {
    searchParams.set("guardId", params.guardId);
  }

  if (params.branchId) {
    searchParams.set("branchId", params.branchId);
  }

  if (params.agencyId) {
    searchParams.set("agencyId", params.agencyId);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export type ShiftPhotoScope = "agency" | "superadmin";

export async function fetchShiftEntrancePhotos(
  params: ShiftPhotoQueryParams,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">,
  options?: { scope?: ShiftPhotoScope }
): Promise<ShiftPhotoListResponse> {
  const query = buildShiftPhotoQuery(params);
  const scope = options?.scope ?? "agency";
  const endpoint =
    scope === "superadmin"
      ? `${API_BASE_URL}/api/v1/shift-photos${query}`
      : `${API_BASE_URL}/api/v1/shift-photos/agency/entrances${query}`;
  const response = await fetch(
    endpoint,
    {
      headers: {
        Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText ||
        `Не удалось загрузить фотографии смен (${response.status} ${response.statusText})`
    );
  }

  return response.json();
}

export function buildFileUrl(path?: string | null): string | null {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${API_BASE_URL}${path}`;
  }

  return `${API_BASE_URL}/${path}`;
}
