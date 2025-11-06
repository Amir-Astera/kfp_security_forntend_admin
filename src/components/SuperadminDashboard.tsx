import { useMemo } from "react";
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
  Calendar
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
  ResponsiveContainer,
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
import { usePersistentCollection } from "../hooks/usePersistentCollection";
import { STORAGE_KEYS } from "../utils/storage";
import {
  initialAgencies,
  initialBranches,
  initialCheckpoints,
  initialGuards,
} from "../data/initialData";
import { Agency, Branch, Checkpoint, Guard as GuardType } from "../types";

// Mock data
const visitsOverTimeData = [
  { date: "01.11", visits: 145 },
  { date: "02.11", visits: 167 },
  { date: "03.11", visits: 142 },
  { date: "04.11", visits: 189 },
  { date: "05.11", visits: 201 },
  { date: "06.11", visits: 178 },
  { date: "07.11", visits: 195 },
];

const branchesData = [
  { name: "Алматы - Центр", visits: 1250 },
  { name: "Астана - Север", visits: 980 },
  { name: "Шымкент", visits: 756 },
  { name: "Караганда", visits: 543 },
  { name: "Актобе", visits: 421 },
];

const topCompaniesData = [
  { name: "ТОО «КазТрансОйл»", visits: 342 },
  { name: "АО «АрселорМиттал»", visits: 298 },
  { name: "ТОО «EuroAsia Air»", visits: 267 },
  { name: "АО «Казахмыс»", visits: 234 },
  { name: "ТОО «КазМунайГаз»", visits: 201 },
];

const visitPurposesData = [
  { name: "Деловая встреча", value: 450, color: "#2563eb" },
  { name: "Поставка товаров", value: 320, color: "#8b5cf6" },
  { name: "Обслуживание", value: 280, color: "#06b6d4" },
  { name: "Прочее", value: 150, color: "#10b981" },
];

const guestVsTransportData = [
  { name: "Гости", value: 720, color: "#2563eb" },
  { name: "Транспорт", value: 480, color: "#8b5cf6" },
];

const guardActivityData = [
  { 
    guard: "Иванов А.", 
    "08:00": 5, "10:00": 8, "12:00": 12, "14:00": 15, "16:00": 10, "18:00": 7, "20:00": 4 
  },
  { 
    guard: "Петров Б.", 
    "08:00": 7, "10:00": 10, "12:00": 14, "14:00": 11, "16:00": 9, "18:00": 6, "20:00": 3 
  },
  { 
    guard: "Сидоров В.", 
    "08:00": 4, "10:00": 6, "12:00": 9, "14:00": 13, "16:00": 11, "18:00": 8, "20:00": 5 
  },
  { 
    guard: "Касымов Н.", 
    "08:00": 6, "10:00": 9, "12:00": 11, "14:00": 8, "16:00": 7, "18:00": 9, "20:00": 6 
  },
  { 
    guard: "Абдуллаев М.", 
    "08:00": 3, "10:00": 5, "12:00": 7, "14:00": 10, "16:00": 12, "18:00": 10, "20:00": 8 
  },
];

const recentVisits = [
  {
    id: 1,
    time: "04.11.2025 14:23",
    name: "Иванов Петр Сергеевич",
    iin: "920315301234",
    company: "ТОО «КазТрансОйл»",
    purpose: "Деловая встреча",
    branch: "Алматы - Центр",
    checkpoint: "КПП-1 (въезд)",
    status: "on-site" as const,
  },
  {
    id: 2,
    time: "04.11.2025 14:15",
    name: "Смирнова Анна Ивановна",
    iin: "850722450987",
    company: "АО «АрселорМиттал»",
    purpose: "Поставка товаров",
    branch: "Астана - Север",
    checkpoint: "КПП-2 (въезд)",
    status: "left" as const,
  },
  {
    id: 3,
    time: "04.11.2025 13:47",
    name: "Касымов Нурлан Бекович",
    iin: "910503201456",
    company: "ТОО «EuroAsia Air»",
    purpose: "Обслуживание",
    branch: "Алматы - Центр",
    checkpoint: "КПП-3 (универс.)",
    status: "on-site" as const,
  },
  {
    id: 4,
    time: "04.11.2025 13:28",
    name: "Петрова Елена Викторовна",
    iin: "880912345678",
    company: "АО «Казахмыс»",
    purpose: "Деловая встреча",
    branch: "Караганда",
    checkpoint: "КПП-1 (въезд)",
    status: "left" as const,
  },
  {
    id: 5,
    time: "04.11.2025 12:55",
    name: "Абдуллаев Марат Асанович",
    iin: "750820112233",
    company: "ТОО «КазМунайГаз»",
    purpose: "Поставка товаров",
    branch: "Шымкент",
    checkpoint: "КПП-2 (въезд)",
    status: "on-site" as const,
  },
];

const chartConfig = {
  visits: {
    label: "Визиты",
    color: "#2563eb",
  },
};

export function SuperadminDashboard() {
  const [branches] = usePersistentCollection<Branch>(
    STORAGE_KEYS.branches,
    initialBranches
  );
  const [checkpoints] = usePersistentCollection<Checkpoint>(
    STORAGE_KEYS.checkpoints,
    initialCheckpoints
  );
  const [agencies] = usePersistentCollection<Agency>(
    STORAGE_KEYS.agencies,
    initialAgencies
  );
  const [guards] = usePersistentCollection<GuardType>(
    STORAGE_KEYS.guards,
    initialGuards
  );

  const activeBranchesCount = useMemo(
    () => branches.filter((branch) => branch.status === "active").length,
    [branches]
  );
  const activeAgenciesCount = useMemo(
    () => agencies.filter((agency) => agency.status === "active").length,
    [agencies]
  );
  const activeGuardsCount = useMemo(
    () => guards.filter((guard) => guard.status === "active").length,
    [guards]
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-foreground mb-1">Агрохолдинг KFP</h2>
            <p className="text-muted-foreground">
              35 компаний • {branches.length} филиалов • {checkpoints.length} КПП • {agencies.length} охранных агентств
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Текущее время</p>
            <p className="text-foreground">04.11.2025 14:30 (Asia/Almaty)</p>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select defaultValue="month">
          <SelectTrigger className="w-48">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Сегодня</SelectItem>
            <SelectItem value="week">Неделя</SelectItem>
            <SelectItem value="month">Месяц</SelectItem>
            <SelectItem value="custom">Выбрать период</SelectItem>
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
          value={branches.length.toString()}
          subtitle={`Активных: ${activeBranchesCount}`}
          icon={Building2}
        />
        <MetricCard
          title="КПП"
          value={checkpoints.length.toString()}
          subtitle={`В ${branches.length} филиалах`}
          icon={MapPin}
        />
        <MetricCard
          title="Агентства"
          value={agencies.length.toString()}
          subtitle={`Активных: ${activeAgenciesCount}`}
          icon={Shield}
        />
        <MetricCard
          title="Охранники"
          value={guards.length.toString()}
          subtitle={`На смене: ${activeGuardsCount}`}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Визиты за месяц"
          value="4,234"
          trend={{ value: 12.5, isPositive: true }}
          icon={TrendingUp}
        />
        <MetricCard
          title="Визиты сегодня"
          value="187"
          subtitle="С начала дня"
          icon={TrendingUp}
        />
        <MetricCard
          title="На территории"
          value="56"
          subtitle="В данный момент"
        />
        <MetricCard
          title="Среднее время"
          value="2ч 15м"
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
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={visitsOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
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
        </Card>

        {/* Branches Distribution */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-foreground mb-1">Распределение по филиалам</h3>
            <p className="text-muted-foreground">Визиты за месяц</p>
          </div>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <BarChart data={branchesData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="visits" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
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
            {topCompaniesData.map((company, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate">{company.name}</p>
                </div>
                <div className="text-muted-foreground">{company.visits}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Visit Purposes */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-foreground mb-1">Цели визитов</h3>
            <p className="text-muted-foreground">Распределение</p>
          </div>
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
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </Card>

        {/* Guest vs Transport */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-foreground mb-1">Гости vs Транспорт</h3>
            <p className="text-muted-foreground">Соотношение</p>
          </div>
          <ChartContainer config={chartConfig} className="h-[250px]">
            <PieChart>
              <Pie
                data={guestVsTransportData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {guestVsTransportData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
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
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все агентства</SelectItem>
              <SelectItem value="agency1">Агентство №1</SelectItem>
              <SelectItem value="agency2">Агентство №2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted-foreground min-w-[120px]">Охранник</th>
                {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((time) => (
                  <th key={time} className="text-center p-2 text-muted-foreground">{time}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guardActivityData.map((guard, index) => (
                <tr key={index} className="border-t border-border">
                  <td className="p-2 text-foreground">{guard.guard}</td>
                  {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((time) => {
                    const value = guard[time as keyof typeof guard] as number;
                    const intensity = Math.min(value / 15, 1);
                    const bgColor = `rgba(37, 99, 235, ${0.1 + intensity * 0.7})`;
                    return (
                      <td key={time} className="p-2 text-center">
                        <div
                          className="w-12 h-12 mx-auto rounded flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                          style={{ backgroundColor: bgColor }}
                          title={`${guard.guard}: ${value} визитов в ${time}`}
                        >
                          <span className={intensity > 0.5 ? "text-white" : "text-foreground"}>
                            {value}
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
              {recentVisits.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell>{visit.time}</TableCell>
                  <TableCell>{visit.name}</TableCell>
                  <TableCell className="text-muted-foreground">{visit.iin}</TableCell>
                  <TableCell>{visit.company}</TableCell>
                  <TableCell className="text-muted-foreground">{visit.purpose}</TableCell>
                  <TableCell>{visit.branch}</TableCell>
                  <TableCell className="text-muted-foreground">{visit.checkpoint}</TableCell>
                  <TableCell>
                    <StatusBadge status={visit.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
