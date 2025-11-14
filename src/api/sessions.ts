import type { AuthResponse } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type AuthTokens = Pick<AuthResponse, "accessToken" | "tokenType">;

export interface OpenSessionRequest {
  shiftId: string;
  guardId: string;
  branchId: string;
  checkpointId: string;
  deviceLabel: string;
  deviceKind: string;
  deviceFp: string;
}

export interface OpenSessionResult<T = unknown> {
  sessionId: string;
  payload: T;
}

export interface UploadShiftPhotoOptions {
  kind: "START" | "END";
  takenAt: string;
}

const getAuthHeaders = (tokens: AuthTokens) => ({
  Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
});

const handleErrorResponse = async (
  response: Response,
  fallbackMessage: string
): Promise<void> => {
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
    console.error("Ошибка обработки ответа API сессий", error);
  }

  throw new Error(message);
};

const extractSessionId = (data: any): string | null => {
  if (!data) {
    return null;
  }

  if (typeof data.id === "string" && data.id.trim().length > 0) {
    return data.id;
  }

  if (typeof data.sessionId === "string" && data.sessionId.trim().length > 0) {
    return data.sessionId;
  }

  if (typeof data.session?.id === "string" && data.session.id.trim().length > 0) {
    return data.session.id;
  }

  return null;
};

export async function openGuardSession<T = unknown>(
  payload: OpenSessionRequest,
  tokens: AuthTokens
): Promise<OpenSessionResult<T>> {
  const response = await fetch(`${API_BASE_URL}/api/v1/sessions/open`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
    body: JSON.stringify(payload),
  });

  await handleErrorResponse(response, "Не удалось открыть смену");

  const data: T = await response.json();
  const sessionId = extractSessionId(data);

  if (!sessionId) {
    throw new Error("Сервер не вернул идентификатор сессии");
  }

  return { sessionId, payload: data };
}

export interface CloseSessionsRequest {
  shiftId: string;
  deviceFp?: string;
  deviceKind?: string;
  deviceLabel?: string;
  userAgent?: string;
}

export async function closeGuardSessions(
  payload: CloseSessionsRequest,
  tokens: AuthTokens
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/sessions/close`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
    body: JSON.stringify(payload),
  });

  await handleErrorResponse(response, "Не удалось закрыть смену");
}

export async function uploadShiftPhoto(
  shiftId: string,
  file: File,
  options: UploadShiftPhotoOptions,
  tokens: AuthTokens
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", options.kind);
  formData.append("takenAt", options.takenAt);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/shift-photos/upload/${encodeURIComponent(shiftId)}`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(tokens),
      },
      body: formData,
    }
  );

  await handleErrorResponse(response, "Не удалось загрузить фото смены");
}
