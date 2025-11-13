import type {
  AuthResponse,
  DashboardPeriod,
  SuperDashboardResponse,
  GuardDashboardCardsResponse,
  GuardGuestKindItem,
  GuardGuestKindScope,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type SuperDashboardParams = {
  period?: DashboardPeriod | string;
};

const buildQuery = (params: SuperDashboardParams = {}): string => {
  const searchParams = new URLSearchParams();

  if (params.period) {
    searchParams.set("period", params.period);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

const buildAuthHeader = (tokens: Pick<AuthResponse, "accessToken" | "tokenType">) =>
  `${tokens.tokenType} ${tokens.accessToken}`;

const parseError = async (response: Response): Promise<never> => {
  let message = "Не удалось загрузить данные дашборда";

  try {
    const body = await response.json();
    if (typeof body?.message === "string") {
      message = body.message;
    }
  } catch (error) {
    console.error("Ошибка разбора ответа дашборда", error);
  }

  throw new Error(message);
};

export async function fetchSuperDashboard(
  params: SuperDashboardParams,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<SuperDashboardResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/dashboard/super${buildQuery(params)}`,
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

export async function fetchGuardDashboardCards(
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<GuardDashboardCardsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/guard/cards`, {
    headers: {
      Authorization: buildAuthHeader(tokens),
    },
  });

  if (!response.ok) {
    return parseError(response);
  }

  const data = (await response.json()) as Partial<GuardDashboardCardsResponse>;

  return {
    presentNow: data.presentNow ?? 0,
    arrivedThisShift: data.arrivedThisShift ?? 0,
    leftThisShift: data.leftThisShift ?? 0,
  };
}

export async function fetchGuardGuestKindChart(
  scope: GuardGuestKindScope,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<GuardGuestKindItem[]> {
  const searchParams = new URLSearchParams({ scope });

  const response = await fetch(
    `${API_BASE_URL}/api/v1/dashboard/guard/chart/guest-kind?${searchParams.toString()}`,
    {
      headers: {
        Authorization: buildAuthHeader(tokens),
      },
    }
  );

  if (!response.ok) {
    return parseError(response);
  }

  const data = (await response.json()) as GuardGuestKindItem[];
  return Array.isArray(data) ? data : [];
}
