import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Calendar as CalendarIcon, Sun, Moon, Users, Filter, Eye, Clock } from "lucide-react";
import type { AuthResponse } from "../types";
import { toast } from "sonner@2.0.3";
import { ShiftDetailDialog, ShiftDetailData } from "./ShiftDetailDialog";
import {
  getDayShiftRegistry,
  getWeekShiftRegistry,
  getMonthShiftRegistry,
  getDayShiftCounters,
  type ShiftRegistryItem,
  type ShiftDayCountersResponse,
} from "../api/shifts";
import { getBranches, getBranchesByAgencyId } from "../api/branches";

interface ShiftEvent extends ShiftDetailData {
  dateKey: string;
}

interface ScheduleManagerProps {
  authTokens: AuthResponse | null;
  agencyId?: string;
}

const formatIsoDate = (date: Date): string => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().split("T")[0];
};

const formatDateLabel = (value?: string): string => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatTimeRange = (start?: string, end?: string): string => {
  if (!start || !end) {
    return "—";
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "—";
  }

  const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return `${startDate.toLocaleTimeString("ru-RU", options)} - ${endDate.toLocaleTimeString("ru-RU", options)}`;
};

const mapStatus = (status?: string): "scheduled" | "completed" | "missed" => {
  switch ((status ?? "").toUpperCase()) {
    case "COMPLETED":
    case "FINISHED":
      return "completed";
    case "CANCELLED":
    case "CANCELED":
    case "MISSED":
      return "missed";
    default:
      return "scheduled";
  }
};

const mapShiftType = (kind?: string, startAt?: string): "day" | "night" => {
  const normalized = (kind ?? "").toUpperCase();
  if (normalized === "DAY") {
    return "day";
  }
  if (normalized === "NIGHT") {
    return "night";
  }

  if (startAt) {
    const start = new Date(startAt);
    if (!Number.isNaN(start.getTime())) {
      const hour = start.getHours();
      if (hour >= 18 || hour < 6) {
        return "night";
      }
    }
  }

  return "day";
};

const mapShiftItemToEvent = (item: ShiftRegistryItem): ShiftEvent => {
  const dateKey = item.startAt ? item.startAt.split("T")[0] : "";

  return {
    id: item.id,
    guardId: item.guardId ?? "",
    guardName: item.guardName ?? "—",
    branchName: item.branchName ?? item.branchId ?? "",
    checkpointName: item.checkpointName ?? item.checkpointId ?? "",
    agencyName: item.agencyName,
    dateLabel: formatDateLabel(item.startAt),
    timeRangeLabel: formatTimeRange(item.startAt, item.endAt),
    shiftType: mapShiftType(item.kind, item.startAt),
    status: mapStatus(item.status),
    rawStatus: item.status ?? "",
    dateKey,
  };
};

const INACTIVE_SHIFT_STATUSES = new Set([
  "SCHEDULED",
  "PLANNED",
  "PENDING",
  "ASSIGNED",
  "CREATED",
]);

const isStatusInteractive = (
  rawStatus?: string,
  mappedStatus?: ShiftDetailData["status"]
): boolean => {
  if (rawStatus) {
    return !INACTIVE_SHIFT_STATUSES.has(rawStatus.toUpperCase());
  }

  return mappedStatus ? mappedStatus !== "scheduled" : false;
};

const isShiftInteractive = (shift: ShiftEvent): boolean => {
  return isStatusInteractive(shift.rawStatus, shift.status);
};

const groupByDate = (shifts: ShiftEvent[]): Map<string, ShiftEvent[]> => {
  return shifts.reduce((acc, shift) => {
    const key = shift.dateKey || shift.dateLabel;
    const list = acc.get(key) ?? [];
    list.push(shift);
    acc.set(key, list);
    return acc;
  }, new Map<string, ShiftEvent[]>());
};

const getWeekDays = (date: Date): Date[] => {
  const current = new Date(date);
  const day = current.getDay();
  const diff = (day + 6) % 7; // Monday as first day
  current.setDate(current.getDate() - diff);
  current.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const dayDate = new Date(current);
    dayDate.setDate(current.getDate() + index);
    return dayDate;
  });
};

export function ScheduleManager({ authTokens, agencyId }: ScheduleManagerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeekDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [branches, setBranches] = useState<any[]>([]);

  const [dayShifts, setDayShifts] = useState<ShiftEvent[]>([]);
  const [weekShifts, setWeekShifts] = useState<ShiftEvent[]>([]);
  const [monthShifts, setMonthShifts] = useState<ShiftEvent[]>([]);
  const [counters, setCounters] = useState<ShiftDayCountersResponse | null>(null);

  const [isDayLoading, setIsDayLoading] = useState(false);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null);

  const isAuthorized = Boolean(authTokens?.accessToken && authTokens?.tokenType);
  const hasAgencyScope = Boolean(agencyId);

  const handleSelectShift = useCallback((shift: ShiftEvent) => {
    if (isShiftInteractive(shift)) {
      setSelectedShift(shift);
    }
  }, []);

  const handleCloseShiftDialog = useCallback(() => {
    setSelectedShift(null);
  }, []);

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }

    const loadBranches = async () => {
      try {
        if (hasAgencyScope && agencyId) {
          const data = await getBranchesByAgencyId(agencyId, {
            accessToken: authTokens!.accessToken,
            tokenType: authTokens!.tokenType,
          });
          setBranches(Array.isArray(data) ? data : []);
        } else {
          const response = await getBranches(
            { accessToken: authTokens!.accessToken, tokenType: authTokens!.tokenType },
            { size: 100 }
          );
          setBranches(response.items ?? []);
        }
      } catch (err) {
        console.error("Не удалось загрузить список филиалов", err);
        setBranches([]);
      }
    };

    loadBranches();
  }, [agencyId, authTokens, hasAgencyScope, isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) {
      setDayShifts([]);
      setCounters(null);
      return;
    }

    let ignore = false;
    const branchId = branchFilter === "all" ? undefined : branchFilter;
    const dateIso = formatIsoDate(selectedDate);
    const agencyScopeId = hasAgencyScope ? agencyId : undefined;
    const scope = hasAgencyScope ? "agency" : undefined;

    const loadDayData = async () => {
      setIsDayLoading(true);
      setError(null);

      try {
        const [dayResponse, countersResponse] = await Promise.all([
          getDayShiftRegistry(
            { accessToken: authTokens!.accessToken, tokenType: authTokens!.tokenType },
            { date: dateIso, branchId, agencyId: agencyScopeId, scope }
          ),
          getDayShiftCounters(
            { accessToken: authTokens!.accessToken, tokenType: authTokens!.tokenType },
            { date: dateIso, branchId, agencyId: agencyScopeId, scope }
          ),
        ]);

        if (ignore) {
          return;
        }

        setDayShifts(dayResponse.items.map(mapShiftItemToEvent));
        setCounters(countersResponse);
      } catch (err) {
        if (ignore) {
          return;
        }

        const message = err instanceof Error ? err.message : "Не удалось загрузить смены";
        setError(message);
        toast.error(message);
        setDayShifts([]);
        setCounters(null);
      } finally {
        if (!ignore) {
          setIsDayLoading(false);
        }
      }
    };

    loadDayData();

    return () => {
      ignore = true;
    };
  }, [agencyId, authTokens, branchFilter, hasAgencyScope, isAuthorized, selectedDate]);

  useEffect(() => {
    if (!isAuthorized || viewMode !== "week") {
      if (viewMode !== "week") {
        setWeekShifts([]);
      }
      return;
    }

    let ignore = false;
    const branchId = branchFilter === "all" ? undefined : branchFilter;
    const dateIso = formatIsoDate(currentWeekDate);
    const agencyScopeId = hasAgencyScope ? agencyId : undefined;
    const scope = hasAgencyScope ? "agency" : undefined;

    const loadWeekData = async () => {
      setIsViewLoading(true);
      setViewError(null);

      try {
        const response = await getWeekShiftRegistry(
          { accessToken: authTokens!.accessToken, tokenType: authTokens!.tokenType },
          { date: dateIso, branchId, agencyId: agencyScopeId, scope }
        );

        if (ignore) {
          return;
        }

        setWeekShifts(response.items.map(mapShiftItemToEvent));
      } catch (err) {
        if (ignore) {
          return;
        }

        const message = err instanceof Error ? err.message : "Не удалось загрузить расписание недели";
        setViewError(message);
        toast.error(message);
        setWeekShifts([]);
      } finally {
        if (!ignore) {
          setIsViewLoading(false);
        }
      }
    };

    loadWeekData();

    return () => {
      ignore = true;
    };
  }, [agencyId, authTokens, branchFilter, currentWeekDate, hasAgencyScope, isAuthorized, viewMode]);

  useEffect(() => {
    if (!isAuthorized || viewMode !== "month") {
      if (viewMode !== "month") {
        setMonthShifts([]);
      }
      return;
    }

    let ignore = false;
    const branchId = branchFilter === "all" ? undefined : branchFilter;
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const agencyScopeId = hasAgencyScope ? agencyId : undefined;
    const scope = hasAgencyScope ? "agency" : undefined;

    const loadMonthData = async () => {
      setIsViewLoading(true);
      setViewError(null);

      try {
        const response = await getMonthShiftRegistry(
          { accessToken: authTokens!.accessToken, tokenType: authTokens!.tokenType },
          { year, month, branchId, agencyId: agencyScopeId, scope }
        );

        if (ignore) {
          return;
        }

        setMonthShifts(response.items.map(mapShiftItemToEvent));
      } catch (err) {
        if (ignore) {
          return;
        }

        const message = err instanceof Error ? err.message : "Не удалось загрузить расписание месяца";
        setViewError(message);
        toast.error(message);
        setMonthShifts([]);
      } finally {
        if (!ignore) {
          setIsViewLoading(false);
        }
      }
    };

    loadMonthData();

    return () => {
      ignore = true;
    };
  }, [agencyId, authTokens, branchFilter, hasAgencyScope, isAuthorized, selectedDate, viewMode]);

  if (!isAuthorized) {
    return (
      <Card className="p-6 text-muted-foreground">
        Не удалось получить токен авторизации. Выполните вход повторно.
      </Card>
    );
  }

  const weekDays = useMemo(() => getWeekDays(currentWeekDate), [currentWeekDate]);
  const weekShiftsByDate = useMemo(() => groupByDate(weekShifts), [weekShifts]);
  const monthShiftsByDate = useMemo(() => groupByDate(monthShifts), [monthShifts]);
  const monthDates = useMemo(() => {
    const dates = Array.from(monthShiftsByDate.keys());
    return dates.sort();
  }, [monthShiftsByDate]);

  const todayShifts = dayShifts;
  const countersData = counters ?? {
    totalToday: todayShifts.length,
    dayShifts: todayShifts.filter((shift) => shift.shiftType === "day").length,
    nightShifts: todayShifts.filter((shift) => shift.shiftType === "night").length,
    completed: todayShifts.filter((shift) => shift.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Расписание смен</h2>
          <p className="text-muted-foreground">Управление графиком работы охранников</p>
        </div>
        <div className="flex gap-3">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[240px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Филиал" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все филиалы</SelectItem>
              {branches.map((branch: any) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(value: "week" | "month") => setViewMode(value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(error || viewError) && (
        <Card className="border-destructive/20 bg-destructive/5 p-4 text-destructive text-sm">
          {error || viewError}
        </Card>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground">Смен сегодня</p>
              <p className="text-2xl text-foreground">{countersData.totalToday}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <Sun className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-muted-foreground">Дневных</p>
              <p className="text-2xl text-foreground">{countersData.dayShifts}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-info/10 rounded-lg">
              <Moon className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-muted-foreground">Ночных</p>
              <p className="text-2xl text-foreground">{countersData.nightShifts}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-warning/10 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-muted-foreground">Завершено</p>
              <p className="text-2xl text-foreground">{countersData.completed}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Календарь
          </h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border"
          />
        </Card>

        <Card className="col-span-2 p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Смены на {selectedDate.toLocaleDateString("ru-RU")}
          </h3>

          {isDayLoading ? (
            <div className="text-center py-12 text-muted-foreground">Загрузка данных...</div>
          ) : todayShifts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Нет смен на выбранную дату</div>
          ) : (
            <div className="space-y-3">
              {todayShifts.map((shift) => {
                const interactive = isShiftInteractive(shift);

                return (
                  <div
                    key={shift.id}
                    className={`flex items-center justify-between p-4 rounded-lg border border-border transition-colors ${
                      interactive ? "hover:bg-muted/50" : "opacity-60"
                    }`}
                  >
                    <div>
                      <p className="text-foreground font-medium">{shift.guardName}</p>
                      <p className="text-muted-foreground text-sm">
                        {shift.branchName ? `${shift.branchName} • ` : ""}
                        {shift.checkpointName || "—"}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{shift.timeRangeLabel}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        shift.shiftType === "day"
                          ? "bg-warning/20 text-warning border-warning/30"
                          : "bg-info/20 text-info border-info/30"
                      }
                    >
                      {shift.shiftType === "day" ? "Дневная" : "Ночная"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        shift.status === "completed"
                          ? "bg-success/10 text-success border-success/20"
                          : shift.status === "missed"
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-info/10 text-info border-info/20"
                      }
                    >
                      {shift.status === "completed"
                        ? "Завершена"
                        : shift.status === "missed"
                        ? "Пропущена"
                        : "Запланирована"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectShift(shift)}
                      disabled={!interactive}
                      aria-disabled={!interactive}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Детали
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {viewMode === "week" && (
        <Card className="p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Расписание на неделю
          </h3>

          {isViewLoading ? (
            <div className="text-center py-12 text-muted-foreground">Загрузка данных...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weekDays.map((day) => {
                const iso = formatIsoDate(day);
                const shifts = weekShiftsByDate.get(iso) ?? [];

                return (
                  <Card key={iso} className="p-4 border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-foreground font-medium">
                          {day.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" })}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {day.toLocaleDateString("ru-RU", { weekday: "long" })}
                        </p>
                      </div>
                      <Badge variant="outline">{shifts.length} смен</Badge>
                    </div>

                    <div className="space-y-2">
                      {shifts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Нет смен</p>
                      ) : (
                        shifts.map((shift) => {
                          const interactive = isShiftInteractive(shift);

                          return (
                            <div
                              key={shift.id}
                              className={`border border-border rounded-lg p-3 transition-colors ${
                                interactive
                                  ? "cursor-pointer hover:bg-muted/40"
                                  : "opacity-60 cursor-not-allowed"
                              }`}
                              onClick={
                                interactive ? () => handleSelectShift(shift) : undefined
                              }
                              aria-disabled={!interactive}
                            >
                              <p className="text-foreground text-sm font-medium">
                                {shift.guardName}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {shift.timeRangeLabel} • {shift.branchName || "—"}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {viewMode === "month" && (
        <Card className="p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Расписание на месяц
          </h3>

          {isViewLoading ? (
            <div className="text-center py-12 text-muted-foreground">Загрузка данных...</div>
          ) : monthDates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Нет смен в выбранном месяце</div>
          ) : (
            <div className="space-y-4">
              {monthDates.map((dateKey) => {
                const shifts = monthShiftsByDate.get(dateKey) ?? [];

                return (
                  <Card key={dateKey} className="p-4 border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-foreground font-medium">{formatDateLabel(dateKey)}</p>
                      </div>
                      <Badge variant="outline">{shifts.length} смен</Badge>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      {shifts.map((shift) => {
                        const interactive = isShiftInteractive(shift);

                        return (
                          <div
                            key={shift.id}
                            className={`border border-border rounded-lg p-3 transition-colors ${
                              interactive
                                ? "cursor-pointer hover:bg-muted/40"
                                : "opacity-60 cursor-not-allowed"
                            }`}
                            onClick={interactive ? () => handleSelectShift(shift) : undefined}
                            aria-disabled={!interactive}
                          >
                            <p className="text-foreground text-sm font-medium">{shift.guardName}</p>
                            <p className="text-muted-foreground text-xs">
                              {shift.timeRangeLabel} • {shift.branchName || "—"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {selectedShift && (
        <ShiftDetailDialog shift={selectedShift} onClose={handleCloseShiftDialog} />
      )}
    </div>
  );
}

