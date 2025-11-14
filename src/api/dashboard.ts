import type {
  AuthResponse,
  DashboardPeriod,
  SuperDashboardResponse,
  GuardDashboardCardsResponse,
  GuardGuestKindItem,
  GuardGuestKindScope,
  AgencyDashboardResponse,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type SuperDashboardParams = {
  period?: DashboardPeriod | string;
};

export type AgencyDashboardParams = SuperDashboardParams;

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

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const normalizeGuardStatus = (value: unknown): "active" | "inactive" | "vacation" | "sick" => {
  if (typeof value !== "string") {
    return "inactive";
  }

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "active":
    case "on_duty":
    case "working":
      return "active";
    case "vacation":
    case "on_vacation":
      return "vacation";
    case "sick":
    case "on_sick_leave":
      return "sick";
    default:
      return "inactive";
  }
};

const normalizeShiftType = (value: unknown): "day" | "night" => {
  if (typeof value !== "string") {
    return "day";
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "night" ? "night" : "day";
};

const normalizeScreenTimeItem = (
  item: unknown,
  index: number
): AgencyDashboardResponse["screenTimeToday"][number] => {
  if (!item || typeof item !== "object") {
    return {
      guardId: `screen-${index}`,
      guardName: "—",
      minutes: 0,
    };
  }

  const record = item as Record<string, unknown>;

  const guardId = String(record.guardId ?? record.id ?? `screen-${index}`);
  const guardNameRaw = record.guardName ?? record.fullName ?? record.name;
  const guardName =
    typeof guardNameRaw === "string" && guardNameRaw.trim() !== ""
      ? guardNameRaw
      : "—";
  const minutesValue =
    toNumber(record.minutes) ??
    toNumber(record.screenTimeMinutes) ??
    toNumber(record.durationMinutes) ??
    0;

  return {
    guardId,
    guardName,
    minutes: minutesValue,
    branchName:
      typeof record.branchName === "string" ? record.branchName : undefined,
  };
};

const normalizeOvertimeItem = (
  item: unknown,
  index: number
): AgencyDashboardResponse["overtimeList"][number] => {
  if (!item || typeof item !== "object") {
    return {
      guardId: `overtime-${index}`,
      guardName: "—",
      overtimeMinutes: 0,
    };
  }

  const record = item as Record<string, unknown>;

  const guardId = String(record.guardId ?? record.id ?? `overtime-${index}`);
  const guardNameRaw = record.guardName ?? record.fullName ?? record.name;
  const guardName =
    typeof guardNameRaw === "string" && guardNameRaw.trim() !== ""
      ? guardNameRaw
      : "—";
  const overtimeMinutes =
    toNumber(record.overtimeMinutes) ?? toNumber(record.minutes) ?? 0;

  return {
    guardId,
    guardName,
    overtimeMinutes,
    branchName:
      typeof record.branchName === "string" ? record.branchName : undefined,
  };
};

const normalizeGuardStat = (
  item: unknown,
  index: number
): AgencyDashboardResponse["guardStatsTable"][number] => {
  if (!item || typeof item !== "object") {
    return {
      guardId: `guard-${index}`,
      fullName: "—",
      branchName: "—",
      checkpointName: "—",
      shiftType: "day",
      lateCount: 0,
      status: "inactive",
    };
  }

  const record = item as Record<string, unknown>;

  const guardId = String(record.guardId ?? record.id ?? `guard-${index}`);
  const fullNameRaw = record.fullName ?? record.guardName ?? record.name;
  const fullName =
    typeof fullNameRaw === "string" && fullNameRaw.trim() !== ""
      ? fullNameRaw
      : "—";
  const branchName =
    typeof record.branchName === "string" && record.branchName.trim() !== ""
      ? record.branchName
      : "—";
  const checkpointNameRaw = record.checkpointName ?? record.postName ?? record.post;
  const checkpointName =
    typeof checkpointNameRaw === "string" && checkpointNameRaw.trim() !== ""
      ? checkpointNameRaw
      : "—";

  const shiftStartRaw =
    record.shiftStart ?? record.shiftTimeStart ?? record.shift_from;
  const shiftEndRaw = record.shiftEnd ?? record.shiftTimeEnd ?? record.shift_to;

  const shiftStart =
    typeof shiftStartRaw === "string" && shiftStartRaw.trim() !== ""
      ? shiftStartRaw
      : undefined;
  const shiftEnd =
    typeof shiftEndRaw === "string" && shiftEndRaw.trim() !== ""
      ? shiftEndRaw
      : undefined;

  const avgProcessingTime =
    typeof record.avgProcessingTime === "string" &&
    record.avgProcessingTime.trim() !== ""
      ? record.avgProcessingTime
      : undefined;

  const avgProcessingTimeMinutes =
    toNumber(record.avgProcessingTimeMinutes) ??
    toNumber(record.avgProcessingTimeInMinutes);

  const lateCount = toNumber(record.lateCount) ?? 0;
  const actualHours = toNumber(record.actualHours);
  const plannedHours = toNumber(record.plannedHours);
  const actualMinutes = toNumber(record.actualMinutes);
  const plannedMinutes = toNumber(record.plannedMinutes);
  const overtimeHours = toNumber(record.overtimeHours);
  const overtimeMinutes = toNumber(record.overtimeMinutes);

  return {
    guardId,
    fullName,
    branchName,
    checkpointName,
    shiftType: normalizeShiftType(record.shiftType ?? record.shift),
    shiftStart,
    shiftEnd,
    avgProcessingTime,
    avgProcessingTimeMinutes,
    lateCount,
    actualHours,
    plannedHours,
    actualMinutes,
    plannedMinutes,
    overtimeHours,
    overtimeMinutes,
    status: normalizeGuardStatus(record.status ?? record.guardStatus),
  };
};

export async function fetchAgencyDashboard(
  params: AgencyDashboardParams,
  tokens: Pick<AuthResponse, "accessToken" | "tokenType">
): Promise<AgencyDashboardResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/dashboard/agency${buildQuery(params)}`,
    {
      headers: {
        Authorization: buildAuthHeader(tokens),
      },
    }
  );

  if (!response.ok) {
    return parseError(response);
  }

  const data = (await response.json()) as Partial<AgencyDashboardResponse> &
    Record<string, unknown>;

  const cards = {
    guardsTotal: data.cards?.guardsTotal ?? 0,
    guardsActive: data.cards?.guardsActive ?? 0,
    contractedBranches: data.cards?.contractedBranches ?? 0,
    onVacation: data.cards?.onVacation ?? 0,
    onSickLeave: data.cards?.onSickLeave ?? 0,
    overtimeCount: data.cards?.overtimeCount ?? 0,
    screenTimeTodayMinutes: data.cards?.screenTimeTodayMinutes ?? 0,
    onShiftNow: data.cards?.onShiftNow ?? 0,
  } as AgencyDashboardResponse["cards"];

  const statusSummary = {
    active:
      data.statusSummary?.active ??
      data.cards?.guardsActive ??
      (Array.isArray(data.guardStatsTable)
        ? data.guardStatsTable.length
        : 0),
    vacation: data.statusSummary?.vacation ?? data.cards?.onVacation ?? 0,
    sick: data.statusSummary?.sick ?? data.cards?.onSickLeave ?? 0,
  } as AgencyDashboardResponse["statusSummary"];

  return {
    cards,
    screenTimeToday: Array.isArray(data.screenTimeToday)
      ? data.screenTimeToday.map(normalizeScreenTimeItem)
      : [],
    overtimeList: Array.isArray(data.overtimeList)
      ? data.overtimeList.map(normalizeOvertimeItem)
      : [],
    statusSummary,
    guardStatsTable: Array.isArray(data.guardStatsTable)
      ? data.guardStatsTable.map(normalizeGuardStat)
      : [],
  };
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
