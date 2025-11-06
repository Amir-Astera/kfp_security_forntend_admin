import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { MetricCard } from "./MetricCard";
import { Button } from "./ui/button";
import {
  Users,
  ClipboardList,
  TrendingUp,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download,
  Filter,
  Sun,
  Moon,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Guard } from "../types";
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

// Mock данные для агентства
const mockAgencyStats = {
  totalGuards: 15,
  activeGuards: 13,
  onVacation: 1,
  onSick: 1,
  totalVisitsToday: 47,
  totalVisitsMonth: 1240,
  avgVisitsPerGuard: 82.7,
  contractedBranches: 3,
};

const visitsPerDayData = [
  { day: "ПН", visits: 52 },
  { day: "ВТ", visits: 48 },
  { day: "СР", visits: 55 },
  { day: "ЧТ", visits: 50 },
  { day: "ПТ", visits: 47 },
  { day: "СБ", visits: 35 },
  { day: "ВС", visits: 30 },
];

const visitsPerGuardData = [
  { name: "Сергеев И.П.", visits: 125 },
  { name: "Абдуллаев М.С.", visits: 98 },
  { name: "Турсунов Б.Н.", visits: 87 },
  { name: "Жумагулов Е.А.", visits: 72 },
  { name: "Петров А.И.", visits: 68 },
];

const guardsStatusData = [
  { name: "Активны", value: 13, color: "#10b981" },
  { name: "В отпуске", value: 1, color: "#f59e0b" },
  { name: "На больничном", value: 1, color: "#ef4444" },
];

// Данные для таблицы статистики охранников
interface GuardStats {
  id: string;
  fullName: string;
  branchName: string;
  checkpointName: string;
  shiftType: "day" | "night";
  shiftTime: string;
  visitsToday: number;
  visitsMonth: number;
  avgProcessingTime: string;
  lateCount: number;
  actualHours: number;
  status: "active" | "inactive" | "vacation" | "sick";
}

const guardsStatsData: GuardStats[] = [
  {
    id: "1",
    fullName: "Сергеев Иван Петрович",
    branchName: "Алматы - Центр",
    checkpointName: "КПП-1 (Главный въезд)",
    shiftType: "day",
    shiftTime: "08:00-20:00",
    visitsToday: 12,
    visitsMonth: 245,
    avgProcessingTime: "02:15",
    lateCount: 2,
    actualHours: 264,
    status: "active",
  },
  {
    id: "2",
    fullName: "Абдуллаев Марат Саматович",
    branchName: "Алматы - Центр",
    checkpointName: "КПП-2 (Грузовой)",
    shiftType: "day",
    shiftTime: "06:00-18:00",
    visitsToday: 8,
    visitsMonth: 178,
    avgProcessingTime: "03:20",
    lateCount: 0,
    actualHours: 264,
    status: "active",
  },
  {
    id: "3",
    fullName: "Турсунов Бахтияр Нурланович",
    branchName: "Алматы - Центр",
    checkpointName: "КПП-4 (Универсальный)",
    shiftType: "night",
    shiftTime: "20:00-08:00",
    visitsToday: 5,
    visitsMonth: 134,
    avgProcessingTime: "02:45",
    lateCount: 1,
    actualHours: 264,
    status: "active",
  },
  {
    id: "4",
    fullName: "Жумагулов Ерлан Асанович",
    branchName: "Астана - Север",
    checkpointName: "КПП-1 (Въезд)",
    shiftType: "day",
    shiftTime: "08:00-20:00",
    visitsToday: 10,
    visitsMonth: 198,
    avgProcessingTime: "02:30",
    lateCount: 3,
    actualHours: 240,
    status: "active",
  },
  {
    id: "5",
    fullName: "Петров Андрей Иванович",
    branchName: "Астана - Север",
    checkpointName: "КПП-2 (Выезд)",
    shiftType: "day",
    shiftTime: "09:00-18:00",
    visitsToday: 7,
    visitsMonth: 156,
    avgProcessingTime: "02:10",
    lateCount: 0,
    actualHours: 198,
    status: "active",
  },
  {
    id: "6",
    fullName: "Касымов Нурлан Бекович",
    branchName: "Шымкент",
    checkpointName: "КПП-1 (Главный)",
    shiftType: "day",
    shiftTime: "08:00-17:00",
    visitsToday: 6,
    visitsMonth: 142,
    avgProcessingTime: "03:05",
    lateCount: 1,
    actualHours: 198,
    status: "active",
  },
  {
    id: "7",
    fullName: "Ибрагимов Руслан Маратович",
    branchName: "Шымкент",
    checkpointName: "КПП-2 (Грузовой)",
    shiftType: "night",
    shiftTime: "20:00-08:00",
    visitsToday: 4,
    visitsMonth: 98,
    avgProcessingTime: "02:50",
    lateCount: 0,
    actualHours: 264,
    status: "active",
  },
  {
    id: "8",
    fullName: "Смирнов Дмитрий Олегович",
    branchName: "Алматы - Центр",
    checkpointName: "КПП-3 (Офисный)",
    shiftType: "day",
    shiftTime: "09:00-18:00",
    visitsToday: 0,
    visitsMonth: 0,
    avgProcessingTime: "00:00",
    lateCount: 0,
    actualHours: 0,
    status: "vacation",
  },
];

export function AgencyDashboard() {
  const [stats, setStats] = useState(mockAgencyStats);
  const [loading, setLoading] = useState(false);
  
  // Фильтры для таблицы статистики
  const [periodFilter, setPeriodFilter] = useState<string>("month");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [checkpointFilter, setCheckpointFilter] = useState<string>("all");

  useEffect(() => {
    // В реальном приложении здесь будет загрузка данных из API
    setLoading(false);
  }, []);

  // Фильтрация данных таблицы
  const filteredGuardsStats = guardsStatsData.filter((guard) => {
    const matchesBranch = branchFilter === "all" || guard.branchName === branchFilter;
    const matchesCheckpoint = checkpointFilter === "all" || guard.checkpointName === checkpointFilter;
    return matchesBranch && matchesCheckpoint;
  });

  // Уникальные филиалы и КПП для фильтров
  const branches = Array.from(new Set(guardsStatsData.map((g) => g.branchName)));
  const checkpoints = branchFilter === "all"
    ? Array.from(new Set(guardsStatsData.map((g) => g.checkpointName)))
    : Array.from(new Set(guardsStatsData.filter((g) => g.branchName === branchFilter).map((g) => g.checkpointName)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-foreground mb-1">Панель управления</h2>
        <p className="text-muted-foreground">
          ТОО «Казахстан Секьюрити» • Обзор за текущий месяц
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Всего охранников"
          value={stats.totalGuards}
          icon={Users}
          trend="+2 за месяц"
          iconClassName="text-primary"
        />
        <MetricCard
          title="Активных"
          value={stats.activeGuards}
          icon={CheckCircle}
          iconClassName="text-success"
        />
        <MetricCard
          title="Визитов сегодня"
          value={stats.totalVisitsToday}
          icon={ClipboardList}
          trend="+12% к вчера"
          iconClassName="text-info"
        />
        <MetricCard
          title="Визитов за месяц"
          value={stats.totalVisitsMonth}
          icon={TrendingUp}
          trend="+8.5% к прошлому"
          iconClassName="text-success"
        />
      </div>

      {/* Second Row Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Средняя нагрузка"
          value={`${stats.avgVisitsPerGuard}`}
          subtitle="визитов на охранника"
          icon={BarChart}
          iconClassName="text-warning"
        />
        <MetricCard
          title="Филиалов"
          value={stats.contractedBranches}
          subtitle="по контракту"
          icon={Shield}
          iconClassName="text-primary"
        />
        <MetricCard
          title="В отпуске"
          value={stats.onVacation}
          icon={Calendar}
          iconClassName="text-warning"
        />
        <MetricCard
          title="На больничном"
          value={stats.onSick}
          icon={AlertTriangle}
          iconClassName="text-destructive"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Visits per day */}
        <Card className="col-span-2 p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Визиты по дням недели
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitsPerDayData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    color: "hsl(var(--foreground))",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line
                  type="monotone"
                  dataKey="visits"
                  name="Визиты"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Guards Status */}
        <Card className="p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Статусы охранников
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={guardsStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {guardsStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
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
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="p-6">
        <h3 className="text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Топ охранников по визитам (месяц)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={visitsPerGuardData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Bar dataKey="visits" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Guards Statistics Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Таблица статистики охранников
          </h3>
          <div className="flex items-center gap-3">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Сегодня</SelectItem>
                <SelectItem value="week">Неделя</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
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
                <SelectValue />
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
                <TableHead className="text-center">Обработано за сегодня</TableHead>
                <TableHead className="text-center">Обработано за месяц</TableHead>
                <TableHead className="text-center">Среднее время обработки</TableHead>
                <TableHead className="text-center">Опозданий</TableHead>
                <TableHead className="text-center">Фактических часов</TableHead>
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
                            {guard.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)}
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
                      <span className="text-foreground">{guard.visitsToday}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-foreground">{guard.visitsMonth}</span>
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
              Показано {filteredGuardsStats.length} из {guardsStatsData.length} охранников
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
