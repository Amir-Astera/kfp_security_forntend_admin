import type { AuthResponse, GuardShiftStatus } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type AuthTokens = Pick<AuthResponse, "accessToken" | "tokenType">;

export interface TodayGuardShiftResponse {
  hasShift: boolean;
  shiftStatus: GuardShiftStatus;
  shiftId?: string;
  startedAt?: string;
  finishedAt?: string;
  branchName?: string;
  checkpointName?: string;
}

export interface StartShiftResponse extends TodayGuardShiftResponse {
  shiftId: string;
}

export interface FinishShiftResponse extends TodayGuardShiftResponse {
  shiftId?: string;
}

const getAuthHeaders = (tokens: AuthTokens) => ({
  Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
});

const readJsonSafe = async (response: Response) => {
  try {
    return await response.json();
  } catch (error) {
    console.error("Не удалось прочитать JSON ответа API смен", error);
    return null;
  }
};

const normalizeStatus = (value: unknown): GuardShiftStatus => {
  const normalized = typeof value === "string" ? value.toUpperCase() : "";

  switch (normalized) {
    case "ACTIVE":
      return "ACTIVE";
    case "DONE":
      return "DONE";
    case "PLANNED":
    default:
      return "PLANNED";
  }
};

const pickString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const extractShiftPayload = (data: any): TodayGuardShiftResponse => {
  const shiftData = data?.shift && typeof data.shift === "object" ? data.shift : data;
  const hasShift = Boolean(data?.hasShift ?? data?.shift ?? data?.shiftId ?? shiftData?.id);
  const shiftId =
    pickString(data?.shiftId) ??
    pickString(shiftData?.id) ??
    pickString(shiftData?.shiftId);

  const startedAt =
    pickString(data?.startedAt) ??
    pickString(data?.startAt) ??
    pickString(data?.shiftStart) ??
    pickString(shiftData?.startedAt) ??
    pickString(shiftData?.startAt) ??
    pickString(shiftData?.startTime);

  const finishedAt =
    pickString(data?.finishedAt) ??
    pickString(data?.endAt) ??
    pickString(data?.shiftEnd) ??
    pickString(shiftData?.finishedAt) ??
    pickString(shiftData?.endAt) ??
    pickString(shiftData?.endTime);

  return {
    hasShift,
    shiftStatus: normalizeStatus(data?.shiftStatus ?? data?.status ?? shiftData?.status),
    shiftId: shiftId ?? undefined,
    startedAt: startedAt ?? undefined,
    finishedAt: finishedAt ?? undefined,
    branchName:
      pickString(data?.branchName) ?? pickString(shiftData?.branchName) ?? undefined,
    checkpointName:
      pickString(data?.checkpointName) ?? pickString(shiftData?.checkpointName) ?? undefined,
  };
};

const handleErrorResponse = async (
  response: Response,
  fallbackMessage: string
): Promise<never> => {
  let message = fallbackMessage;

  try {
    const errorBody = await response.json();
    if (typeof errorBody?.message === "string" && errorBody.message.trim()) {
      message = errorBody.message;
    }
  } catch (error) {
    console.error("Ошибка обработки ответа API смен", error);
  }

  throw new Error(message);
};

export async function getTodayGuardShift(tokens: AuthTokens): Promise<TodayGuardShiftResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/guard-shifts/today`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  if (response.status === 404) {
    return {
      hasShift: false,
      shiftStatus: "DONE",
    };
  }

  if (!response.ok) {
    await handleErrorResponse(response, "Не удалось получить данные смены охранника");
  }

  const data = await readJsonSafe(response);
  if (!data) {
    return { hasShift: false, shiftStatus: "DONE" };
  }

  return extractShiftPayload(data);
}

export async function startTodayGuardShift(tokens: AuthTokens): Promise<StartShiftResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/guard-shifts/today/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  if (!response.ok) {
    await handleErrorResponse(response, "Не удалось начать смену");
  }

  const data = await readJsonSafe(response);
  const payload = extractShiftPayload(data ?? {});

  if (!payload.shiftId) {
    throw new Error("Сервер не вернул идентификатор смены");
  }

  return {
    ...payload,
    shiftId: payload.shiftId,
  };
}

export async function finishTodayGuardShift(tokens: AuthTokens): Promise<FinishShiftResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/guard-shifts/today/finish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(tokens),
    },
  });

  if (!response.ok) {
    await handleErrorResponse(response, "Не удалось завершить смену");
  }

  const data = await readJsonSafe(response);
  return extractShiftPayload(data ?? {});
}
