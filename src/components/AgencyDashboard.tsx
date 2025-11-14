import { useEffect, useMemo, useState } from "react";
import { Card } from "./ui/card";
import { MetricCard } from "./MetricCard";
import { Button } from "./ui/button";
import {
  Users,
  Shield,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download,
  Sun,
  Moon,
  Monitor,
  Building2,
  RefreshCcw,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { fetchAgencyDashboard } from "../api/dashboard";
import type {
  AgencyDashboardGuardStat,
  AgencyDashboardResponse,
  AuthResponse,
  DashboardPeriod,
} from "../types";

interface AgencyDashboardProps {
  authTokens: AuthResponse | null;
}

interface NormalizedGuardStat {
  id: string;
  fullName: string;
  branchName: string;
  checkpointName: string;
  shiftType: "day" | "night";
  shiftTime: string;
  avgProcessingTime: string;
  lateCount: number;
  actualHours: number;
  plannedHours: number;
  hasOvertime: boolean;
  overtimeHours: number;
  status: "active" | "inactive" | "vacation" | "sick";
}

const defaultCards: AgencyDashboardResponse["cards"] = {
  guardsTotal: 0,
  guardsActive: 0,
  contractedBranches: 0,
  onVacation: 0,
  onSickLeave: 0,
  overtimeCount: 0,
  screenTimeTodayMinutes: 0,
  onShiftNow: 0,
};

const defaultStatusSummary: AgencyDashboardResponse["statusSummary"] = {
  active: 0,
  vacation: 0,
  sick: 0,
};

const formatMinutes = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "0ч";
  }

  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}ч ${mins}м`;
  }

  if (hours > 0) {
    return `${hours}ч`;
  }

  return `${mins}м`;
};

const minutesToHours = (minutes?: number): number => {
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) {
    return 0;
  }

  return minutes / 60;
};

const roundHours = (hours?: number): number => {
  if (typeof hours !== "number" || !Number.isFinite(hours)) {
    return 0;
  }

  return Math.round(hours * 10) / 10;
};

const getInitials = (value: string): string => {
  if (!value) {
    return "";
  }

  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const normalizeGuardStat = (
  stat: AgencyDashboardGuardStat,
  index: number
): NormalizedGuardStat => {
  const shiftStart = stat.shiftStart?.trim() ? stat.shiftStart : undefined;
  const shiftEnd = stat.shiftEnd?.trim() ? stat.shiftEnd : undefined;
  const shiftTime =
    shiftStart || shiftEnd
      ? `${shiftStart ?? "—"}${shiftEnd ? ` - ${shiftEnd}` : ""}`
      : "—";

  const avgProcessingTime =
    stat.avgProcessingTime ??
    (typeof stat.avgProcessingTimeMinutes === "number"
      ? formatMinutes(stat.avgProcessingTimeMinutes)
      : "—");

  const actualHoursRaw =
    stat.actualHours ?? minutesToHours(stat.actualMinutes);
  const plannedHoursRaw =
    stat.plannedHours ?? minutesToHours(stat.plannedMinutes);
  const overtimeHoursRaw =
    stat.overtimeHours ?? minutesToHours(stat.overtimeMinutes);

  const actualHours = roundHours(actualHoursRaw);
  const plannedHours = roundHours(plannedHoursRaw);
  const overtimeHours = roundHours(overtimeHoursRaw);
  const hasOvertime = (overtimeHoursRaw ?? 0) > 0;

  return {
    id: stat.guardId || `guard-${index}`,
    fullName: stat.fullName || "—",
    branchName: stat.branchName || "—",
    checkpointName: stat.checkpointName || "—",
    shiftType: stat.shiftType ?? "day",
    shiftTime,
    avgProcessingTime,
    lateCount: stat.lateCount ?? 0,
    actualHours,
    plannedHours,
    hasOvertime,
    overtimeHours,
    status: stat.status ?? "inactive",
  };
};

export function AgencyDashboard({ authTokens }: AgencyDashboardProps) {
  const [dashboardData, setDashboardData] = useState<AgencyDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<DashboardPeriod>("TODAY");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [checkpointFilter, setCheckpointFilter] = useState<string>("all");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!authTokens?.accessToken || !authTokens?.tokenType) {
      setDashboardData(null);
      setLoading(false);
      return;
    }

    let isCancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchAgencyDashboard(
          { period: periodFilter },
          authTokens
        );

        if (!isCancelled) {
          setDashboardData(data);
        }
      } catch (err) {
        if (!isCancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Не удалось загрузить данные дашборда";
          setError(message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isCancelled = true;
    };
  }, [authTokens?.accessToken, authTokens?.tokenType, periodFilter, reloadToken]);

  const cards = dashboardData?.cards ?? defaultCards;
  const statusSummary = dashboardData?.statusSummary ?? defaultStatusSummary;
  const screenTimeItems = dashboardData?.screenTimeToday ?? [];
  const overtimeItems = dashboardData?.overtimeList ?? [];

  const normalizedGuardStats = useMemo(
    () =>
      (dashboardData?.guardStatsTable ?? []).map((stat, index) =>
        normalizeGuardStat(stat, index)
      ),
    [dashboardData?.guardStatsTable]
  );

  const branches = useMemo(() => {
    const items = normalizedGuardStats
      .map((stat) => stat.branchName)
      .filter((name) => name && name !== "—");
    return Array.from(new Set(items));
  }, [normalizedGuardStats]);

  const checkpoints = useMemo(() => {
    const source =
      branchFilter === "all"
        ? normalizedGuardStats
        : normalizedGuardStats.filter((stat) => stat.branchName === branchFilter);

    const items = source
      .map((stat) => stat.checkpointName)
      .filter((name) => name && name !== "—");

    return Array.from(new Set(items));
  }, [normalizedGuardStats, branchFilter]);

  useEffect(() => {
    if (branchFilter !== "all" && !branches.includes(branchFilter)) {
      setBranchFilter("all");
    }
  }, [branchFilter, branches]);

  useEffect(() => {
    if (checkpointFilter !== "all" && !checkpoints.includes(checkpointFilter)) {
      setCheckpointFilter("all");
    }
  }, [checkpointFilter, checkpoints]);

  const filteredGuardsStats = useMemo(() => {
    return normalizedGuardStats.filter((guard) => {
      const matchesBranch = branchFilter === "all" || guard.branchName === branchFilter;
      const matchesCheckpoint =
        checkpointFilter === "all" || guard.checkpointName === checkpointFilter;
      return matchesBranch && matchesCheckpoint;
    });
  }, [normalizedGuardStats, branchFilter, checkpointFilter]);

  const totalScreenMinutes = screenTimeItems.reduce(
    (sum, item) => sum + Math.max(0, item.minutes),
    0
  );
  const avgScreenTimeMinutes =
    screenTimeItems.length > 0
      ? totalScreenMinutes / screenTimeItems.length
      : cards.screenTimeTodayMinutes;

  const totalGuards = cards.guardsTotal;
  const activeGuards = cards.guardsActive;
  const onVacation = cards.onVacation;
  const onSick = cards.onSickLeave;
  const onDutyGuards = cards.onShiftNow;
  const overtimeCount = cards.overtimeCount ?? overtimeItems.length;
  const avgScreenTimeDisplay = formatMinutes(avgScreenTimeMinutes);

  const guardsStatusData = [
    { name: "Активны", value: statusSummary.active, color: "#10b981" },
    { name: "В отпуске", value: statusSummary.vacation, color: "#f59e0b" },
    { name: "На больничном", value: statusSummary.sick, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  const totalStatusGuards = guardsStatusData.reduce((sum, item) => sum + item.value, 0);

  const handleReload = () => {
    setReloadToken((token) => token + 1);
  };

  if (loading && !dashboardData) {
    return <div className="text-center py-12 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-foreground mb-1">Панель управления</h2>
          <p className="text-muted-foreground">
            ТОО «Казахстан Секьюрити» • Обзор за выбранный период
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={periodFilter}
            onValueChange={(value) => setPeriodFilter(value as DashboardPeriod)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAY">Сегодня</SelectItem>
              <SelectItem value="WEEK">Неделя</SelectItem>
              <SelectItem value="MONTH">Месяц</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleReload} disabled={loading}>
            <RefreshCcw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Обновить
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Всего охранников"
          value={totalGuards}
          icon={Users}
          iconClassName="text-primary"
        />
        <MetricCard
          title="Активных"
          value={activeGuards}
          icon={CheckCircle}
          iconClassName="text-success"
        />
        <MetricCard
          title="Филиалов"
          value={cards.contractedBranches}
          subtitle="по контракту"
          icon={Building2}
          iconClassName="text-primary"
        />
        <MetricCard
          title="В отпуске"
          value={onVacation}
          icon={Calendar}
          iconClassName="text-warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="На больничном"
          value={onSick}
          icon={AlertTriangle}
          iconClassName="text-destructive"
        />
        <MetricCard
          title="Переработки"
          value={overtimeCount}
          subtitle="охранников"
          icon={Monitor}
          iconClassName="text-warning"
        />
        <MetricCard
          title="Экранное время"
          value={avgScreenTimeDisplay}
          subtitle="среднее за сегодня"
          icon={Monitor}
          iconClassName="text-info"
        />
        <MetricCard
          title="На смене"
          value={onDutyGuards}
          subtitle="сейчас работают"
          icon={Shield}
          iconClassName="text-success"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            Экранное время
          </h3>
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-foreground mb-1">{avgScreenTimeDisplay}</div>
              <p className="text-muted-foreground">Среднее за сегодня</p>
            </div>
            <div className="space-y-2">
              {screenTimeItems.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  Нет данных для отображения
                </p>
              )}
              {screenTimeItems.slice(0, 5).map((item) => {
                const displayName = item.guardName?.split(" ")[0] ?? item.guardName;
                return (
                  <div key={item.guardId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {getInitials(item.guardName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">
                        {displayName || "—"}
                      </span>
                    </div>
                    <span className="text-foreground">
                      {formatMinutes(item.minutes)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Переработки
          </h3>
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-foreground mb-1">{overtimeCount}</div>
              <p className="text-muted-foreground">Охранников с переработкой</p>
            </div>
            <div className="space-y-2">
              {overtimeItems.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  Нет данных для отображения
                </p>
              )}
              {overtimeItems.slice(0, 5).map((item) => {
                const displayName = item.guardName?.split(" ")[0] ?? item.guardName;
                const overtimeDisplay =
                  item.overtimeMinutes > 0
                    ? `+${formatMinutes(item.overtimeMinutes)}`
                    : "0ч";

                return (
                  <div key={item.guardId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {getInitials(item.guardName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">
                        {displayName || "—"}
                      </span>
                    </div>
                    <span className="text-warning">{overtimeDisplay}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Статусы охранников
          </h3>
          {totalGuards > 0 && guardsStatusData.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-8 py-4">
                {guardsStatusData.map((item, index) => {
                  const base = totalStatusGuards || totalGuards;
                  const percentage = base > 0 ? (item.value / base) * 100 : 0;
                  return (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <div className="relative w-20 h-20">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            stroke="hsl(var(--muted))"
                            strokeWidth="6"
                            fill="none"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            stroke={item.color}
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${percentage * 2.01} 201`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-foreground">{item.value}</span>
                        </div>
                      </div>
                      <span className="text-muted-foreground text-center text-xs">
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 border-t pt-4">
                {guardsStatusData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              Нет данных для отображения
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
          <h3 className="text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Таблица статистики охранников
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Все филиалы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все филиалы</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={checkpointFilter} onValueChange={setCheckpointFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Все КПП" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все КПП</SelectItem>
                {checkpoints.map((checkpoint) => (
                  <SelectItem key={checkpoint} value={checkpoint}>
                    {checkpoint}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Экспорт .xlsx
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО охранника</TableHead>
                <TableHead>Филиал / КПП</TableHead>
                <TableHead>Смена</TableHead>
                <TableHead className="text-center">Среднее время обработки</TableHead>
                <TableHead className="text-center">Опозданий</TableHead>
                <TableHead className="text-center">Фактических часов</TableHead>
                <TableHead className="text-center">Плановых часов</TableHead>
                <TableHead className="text-center">Переработка</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuardsStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    Нет данных для отображения
                  </TableCell>
                </TableRow>
              ) : (
                filteredGuardsStats.map((guard) => (
                  <TableRow key={guard.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {getInitials(guard.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-foreground">{guard.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground">{guard.branchName}</p>
                      <p className="text-muted-foreground">{guard.checkpointName}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {guard.shiftType === "day" ? (
                          <Sun className="w-4 h-4 text-warning" />
                        ) : (
                          <Moon className="w-4 h-4 text-info" />
                        )}
                        <div>
                          <p className="text-foreground">
                            {guard.shiftType === "day" ? "Дневная" : "Ночная"}
                          </p>
                          <p className="text-muted-foreground">{guard.shiftTime}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-muted-foreground">{guard.avgProcessingTime}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          guard.lateCount === 0
                            ? "bg-success/10 text-success border-success/20"
                            : guard.lateCount <= 2
                            ? "bg-warning/10 text-warning border-warning/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }
                      >
                        {guard.lateCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-foreground">{guard.actualHours}ч</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-foreground">{guard.plannedHours}ч</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {guard.hasOvertime ? (
                        <Badge
                          variant="outline"
                          className="bg-warning/10 text-warning border-warning/20"
                        >
                          +{guard.overtimeHours}ч
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-success/10 text-success border-success/20"
                        >
                          0ч
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          guard.status === "active"
                            ? "bg-success/10 text-success border-success/20"
                            : guard.status === "vacation"
                            ? "bg-warning/10 text-warning border-warning/20"
                            : guard.status === "sick"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-muted text-muted-foreground border-border"
                        }
                      >
                        {guard.status === "active"
                          ? "Активен"
                          : guard.status === "vacation"
                          ? "В отпуске"
                          : guard.status === "sick"
                          ? "Больничный"
                          : "Неактивен"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredGuardsStats.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-muted-foreground">
              Показано {filteredGuardsStats.length} из {normalizedGuardStats.length} охранников
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Назад
              </Button>
              <Button variant="outline" size="sm" disabled>
                Вперёд
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
