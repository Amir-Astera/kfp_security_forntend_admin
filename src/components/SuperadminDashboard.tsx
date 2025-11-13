import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "./MetricCard";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
  Building2,
  MapPin,
  Shield,
  Users,
  TrendingUp,
  Download,
  Filter,
  Calendar,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts@2.15.2";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { StatusBadge } from "./StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { fetchSuperDashboard } from "../api/dashboard";
import type {
  AuthResponse,
  DashboardPeriod,
  SuperDashboardResponse,
} from "../types";

interface SuperadminDashboardProps {
  authTokens: AuthResponse | null;
}

type GuardActivityRow = {
  guard: string;
} & Record<string, number>;

const chartConfig = {
  visits: {
    label: "Визиты",
    color: "#2563eb",
  },
};

const PIE_COLORS = ["#2563eb", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

const TIME_SLOTS = Array.from({ length: 24 }, (_, index) =>
  `${index.toString().padStart(2, "0")}:00`
);

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "TODAY", label: "Сегодня" },
  { value: "WEEK", label: "Неделя" },
  { value: "MONTH", label: "Месяц" },
];

const formatNumber = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }

  return value.toLocaleString("ru-RU");
};

const formatAvgStay = (minutes?: number | null) => {
  if (!minutes || Number.isNaN(minutes) || minutes <= 0) {
    return "0 мин";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours}ч ${remainingMinutes}м`;
  }

  return `${remainingMinutes} мин`;
};

const formatDateLabel = (isoDate: string) => {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
};

const formatDateTime = (isoDate?: string | null) => {
  if (!isoDate) {
    return "-";
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const mapVisitStatus = (status?: string | null) => {
  if (!status) {
    return { status: "inactive" as const, label: "Неизвестно" };
  }

  const normalized = status.toUpperCase();

  if (normalized.includes("ТЕРРИТОРИ")) {
    return { status: "on-site" as const, label: status };
  }

  if (normalized.includes("ПОКИН")) {
    return { status: "left" as const, label: status };
  }

  if (normalized.includes("ACTIVE") || normalized.includes("АКТИВ")) {
    return { status: "active" as const, label: status };
  }

  return { status: "warning" as const, label: status };
};

export function SuperadminDashboard({ authTokens }: SuperadminDashboardProps) {
  const [period, setPeriod] = useState<DashboardPeriod>("TODAY");
  const [dashboardData, setDashboardData] = useState<SuperDashboardResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authTokens) {
      setDashboardData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchSuperDashboard({ period }, authTokens)
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setDashboardData(data);
      })
      .catch((fetchError) => {
        if (!isMounted) {
          return;
        }

        console.error("Ошибка загрузки дашборда суперадмина", fetchError);
        setError(fetchError instanceof Error ? fetchError.message : "Неизвестная ошибка");
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authTokens, period]);

  const cards = dashboardData?.cards;

  const visitsOverTimeData = useMemo(
    () =>
      (dashboardData?.visitsByDay7 ?? []).map((item) => ({
        date: formatDateLabel(item.date),
        visits: item.count,
      })),
    [dashboardData?.visitsByDay7]
  );

  const branchesData = useMemo(
    () =>
      (dashboardData?.monthByBranch ?? []).map((branch) => ({
        name: branch.branchName,
        visits: branch.count,
      })),
    [dashboardData?.monthByBranch]
  );

  const topCompaniesData = useMemo(
    () =>
      (dashboardData?.topCompanies10 ?? []).map((company) => ({
        name: company.company,
        visits: company.count,
      })),
    [dashboardData?.topCompanies10]
  );

  const visitPurposesData = useMemo(
    () =>
      (dashboardData?.purposeShare ?? []).map((item, index) => ({
        name: item.purpose,
        value: item.count,
        percent: item.percent,
        color: PIE_COLORS[index % PIE_COLORS.length],
      })),
    [dashboardData?.purposeShare]
  );

  const guardActivityData: GuardActivityRow[] = useMemo(() => {
    return (dashboardData?.guardHeatmap ?? []).map((guard) => {
      const entries: Record<string, number> = {};

      TIME_SLOTS.forEach((slot, index) => {
        entries[slot] = guard.hours[index] ?? 0;
      });

      return {
        guard: guard.guardName,
        ...entries,
      };
    });
  }, [dashboardData?.guardHeatmap]);

  const latestVisits = dashboardData?.latestVisits ?? [];

  const guardsOnShift = cards?.guardsOnShiftNow ?? 0;
  const totalActiveGuards = cards?.guardsActive ?? 0;
  const guardsOffShift = Math.max(totalActiveGuards - guardsOnShift, 0);

  const guardDistributionData = [
    { name: "На смене", value: guardsOnShift, color: "#2563eb" },
    { name: "Не на смене", value: guardsOffShift, color: "#8b5cf6" },
  ].filter((item) => item.value > 0);

  if (!authTokens) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Нет данных авторизации для загрузки дашборда
      </div>
    );
  }

  if (loading && !dashboardData) {
    return <div className="text-center py-12 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-destructive/30 bg-destructive/5 text-destructive px-4 py-3">
          Ошибка загрузки данных: {error}
        </Card>
      )}

      {/* Header Info */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-foreground mb-1">Агрохолдинг KFP</h2>
            <p className="text-muted-foreground">
              {formatNumber(cards?.agenciesActive)} агентств • {formatNumber(cards?.branchesActive)} филиалов • {formatNumber(cards?.checkpoints)} КПП
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Текущее время</p>
            <p className="text-foreground">{formatDateTime(new Date().toISOString())}</p>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={period} onValueChange={(value) => setPeriod(value as DashboardPeriod)}>
          <SelectTrigger className="w-48">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Период" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Фильтры
        </Button>
        <div className="flex-1" />
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Экспорт .xlsx
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Филиалы"
          value={formatNumber(cards?.branchesActive)}
          subtitle="Активных"
          icon={Building2}
        />
        <MetricCard
          title="КПП"
          value={formatNumber(cards?.checkpoints)}
          subtitle="Всего КПП"
          icon={MapPin}
        />
        <MetricCard
          title="Агентства"
          value={formatNumber(cards?.agenciesActive)}
          subtitle="Активных"
          icon={Shield}
        />
        <MetricCard
          title="Охранники"
          value={formatNumber(cards?.guardsActive)}
          subtitle={`На смене: ${formatNumber(cards?.guardsOnShiftNow)}`}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Визиты за месяц"
          value={formatNumber(cards?.visitsThisMonth)}
          trend={
            typeof cards?.visitsThisMonthDeltaPct === "number"
              ? { value: cards.visitsThisMonthDeltaPct, isPositive: cards.visitsThisMonthDeltaPct >= 0 }
              : undefined
          }
          icon={TrendingUp}
        />
        <MetricCard
          title="Визиты сегодня"
          value={formatNumber(cards?.visitsToday)}
          subtitle="С начала дня"
          icon={TrendingUp}
        />
        <MetricCard
          title="На территории"
          value={formatNumber(cards?.onPremisesNow)}
          subtitle="В данный момент"
        />
        <MetricCard
          title="Среднее время"
          value={formatAvgStay(cards?.avgStayMinutes)}
          subtitle="Пребывания"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visits Over Time */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-foreground mb-1">Визиты по времени</h3>
            <p className="text-muted-foreground">Последние 7 дней</p>
          </div>
          {visitsOverTimeData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={visitsOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="visits"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: "#2563eb", r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Нет данных для отображения
            </div>
          )}
        </Card>

        {/* Branches Distribution */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-foreground mb-1">Распределение по филиалам</h3>
            <p className="text-muted-foreground">Визиты за период</p>
          </div>
          {branchesData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={branchesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={120} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="visits" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Нет данных по филиалам
            </div>
          )}
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Companies */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-foreground mb-1">ТОП-10 компаний</h3>
            <p className="text-muted-foreground">По количеству визитов</p>
          </div>
          <div className="space-y-3">
            {topCompaniesData.length > 0 ? (
              topCompaniesData.map((company, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{company.name}</p>
                  </div>
                  <div className="text-muted-foreground">{formatNumber(company.visits)}</div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Нет данных о компаниях</p>
            )}
          </div>
        </Card>

        {/* Visit Purposes */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-foreground mb-1">Цели визитов</h3>
            <p className="text-muted-foreground">Распределение</p>
          </div>
          {visitPurposesData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px]">
              <PieChart>
                <Pie
                  data={visitPurposesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {visitPurposesData.map((entry, index) => (
                    <Cell key={`purpose-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Нет данных по целям визитов
            </div>
          )}
        </Card>

        {/* Guards distribution */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-foreground mb-1">Охранники на смене</h3>
            <p className="text-muted-foreground">Соотношение активных</p>
          </div>
          {guardDistributionData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px]">
              <PieChart>
                <Pie
                  data={guardDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {guardDistributionData.map((entry, index) => (
                    <Cell key={`guards-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Нет данных об охранниках на смене
            </div>
          )}
        </Card>
      </div>

      {/* Guard Activity Heatmap */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-foreground mb-1">Активность охранников</h3>
            <p className="text-muted-foreground">Обработано визитов по времени суток</p>
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Агентство" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все агентства</SelectItem>
              <SelectItem value="agency1">Агентство №1</SelectItem>
              <SelectItem value="agency2">Агентство №2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {guardActivityData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1800px]">
              <thead>
                <tr>
                  <th className="text-left p-2 text-muted-foreground min-w-[120px] sticky left-0 bg-background z-10">
                    Охранник
                  </th>
                  {TIME_SLOTS.map((time) => (
                    <th key={time} className="text-center p-2 text-muted-foreground min-w-[50px]">
                      {time}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guardActivityData.map((guard, index) => (
                  <tr key={index} className="border-t border-border">
                    <td className="p-2 text-foreground sticky left-0 bg-background z-10">{guard.guard}</td>
                    {TIME_SLOTS.map((time) => {
                      const value = guard[time];
                      const intensity = Math.min((value || 0) / 15, 1);
                      const bgColor = `rgba(37, 99, 235, ${0.1 + intensity * 0.7})`;

                      return (
                        <td key={time} className="p-2 text-center">
                          <div
                            className="w-10 h-10 mx-auto rounded flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                            style={{ backgroundColor: bgColor }}
                            title={`${guard.guard}: ${value || 0} визитов в ${time}`}
                          >
                            <span className={intensity > 0.5 ? "text-white" : "text-foreground"}>
                              {value || 0}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            Нет данных об активности охранников за выбранный период
          </div>
        )}
        <div className="mt-4 flex items-center gap-4 justify-end flex-wrap">
          <span className="text-muted-foreground mr-2">Активность:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "rgba(37, 99, 235, 0.1)" }}></div>
            <span className="text-muted-foreground">Низкая</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "rgba(37, 99, 235, 0.5)" }}></div>
            <span className="text-muted-foreground">Средняя</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "rgba(37, 99, 235, 0.8)" }}></div>
            <span className="text-muted-foreground">Высокая</span>
          </div>
        </div>
      </Card>

      {/* Recent Visits Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-foreground mb-1">Последние визиты</h3>
            <p className="text-muted-foreground">Обновлено в реальном времени</p>
          </div>
          <Button variant="link">Смотреть все →</Button>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Время въезда</TableHead>
                <TableHead>ФИО</TableHead>
                <TableHead>ИИН</TableHead>
                <TableHead>Компания</TableHead>
                <TableHead>Цель</TableHead>
                <TableHead>Филиал</TableHead>
                <TableHead>КПП</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestVisits.length > 0 ? (
                latestVisits.map((visit) => {
                  const statusConfig = mapVisitStatus(visit.status);

                  return (
                    <TableRow key={visit.id}>
                      <TableCell>{formatDateTime(visit.entryAt)}</TableCell>
                      <TableCell>{visit.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{visit.iin}</TableCell>
                      <TableCell>{visit.company}</TableCell>
                      <TableCell className="text-muted-foreground">{visit.purpose}</TableCell>
                      <TableCell>{visit.branchName}</TableCell>
                      <TableCell className="text-muted-foreground">{visit.checkpointName}</TableCell>
                      <TableCell>
                        <StatusBadge status={statusConfig.status} label={statusConfig.label} />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Нет визитов за выбранный период
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
