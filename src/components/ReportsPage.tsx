import { useState, useMemo } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import {
  FileText,
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Users,
  MapPin,
  Building2,
  Clock,
  Calendar as CalendarIcon,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner@2.0.3";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type ReportType =
  | "visits"
  | "guards"
  | "checkpoints"
  | "branches"
  | "schedule"
  | "duration";

interface ReportPreset {
  id: ReportType;
  title: string;
  description: string;
  icon: typeof FileText;
  color: string;
}

const REPORT_PRESETS: ReportPreset[] = [
  {
    id: "visits",
    title: "Визиты за период",
    description: "Статистика по визитам охранников за выбранный период",
    icon: FileText,
    color: "text-blue-500",
  },
  {
    id: "guards",
    title: "Активность охранников",
    description: "Рейтинг охранников по количеству смен и часам работы",
    icon: Users,
    color: "text-green-500",
  },
  {
    id: "checkpoints",
    title: "Статистика по КПП",
    description: "Загруженность контрольно-пропускных пунктов",
    icon: MapPin,
    color: "text-purple-500",
  },
  {
    id: "branches",
    title: "Загруженность филиалов",
    description: "Количество визитов и охранников по филиалам",
    icon: Building2,
    color: "text-orange-500",
  },
  {
    id: "schedule",
    title: "Выполнение графика смен",
    description: "Соответствие фактических смен запланированным",
    icon: CalendarIcon,
    color: "text-cyan-500",
  },
  {
    id: "duration",
    title: "Время пребывания",
    description: "Среднее время пребывания охранников на территории",
    icon: Clock,
    color: "text-pink-500",
  },
];

// Моковые данные для отчётов
const VISITS_DATA = [
  { date: "01 ноя", visits: 187, guards: 45 },
  { date: "02 ноя", visits: 192, guards: 47 },
  { date: "03 ноя", visits: 178, guards: 43 },
  { date: "04 ноя", visits: 201, guards: 49 },
];

const GUARDS_DATA = [
  {
    id: "g1",
    name: "Нурсултан Абдуллаев",
    shifts: 24,
    hours: 192,
    attendance: 98,
    trend: "up",
  },
  {
    id: "g2",
    name: "Ерлан Төлеген",
    shifts: 22,
    hours: 176,
    attendance: 95,
    trend: "up",
  },
  {
    id: "g3",
    name: "Асхат Жұмабек",
    shifts: 20,
    hours: 160,
    attendance: 92,
    trend: "stable",
  },
  {
    id: "g4",
    name: "Дархан Смағұлов",
    shifts: 19,
    hours: 152,
    attendance: 88,
    trend: "down",
  },
  {
    id: "g5",
    name: "Бауыржан Кенжебеков",
    shifts: 18,
    hours: 144,
    attendance: 90,
    trend: "up",
  },
];

const CHECKPOINTS_DATA = [
  { name: "КПП Главный", value: 1234, percentage: 35 },
  { name: "КПП Склад №1", value: 892, percentage: 25 },
  { name: "КПП Офисное", value: 654, percentage: 18 },
  { name: "КПП Производство", value: 445, percentage: 12 },
  { name: "Другие", value: 345, percentage: 10 },
];

const BRANCHES_DATA = [
  { branch: "Филиал Алматы", guards: 45, visits: 1234, avgTime: "2ч 15м" },
  { branch: "Филиал Астана", guards: 38, visits: 987, avgTime: "2ч 30м" },
  { branch: "Филиал Шымкент", guards: 25, visits: 654, avgTime: "2ч 05м" },
  { branch: "Филиал Караганда", guards: 18, visits: 445, avgTime: "1ч 50м" },
  { branch: "Филиал Атырау", guards: 19, visits: 412, avgTime: "2ч 20м" },
];

const SCHEDULE_DATA = [
  { week: "Неделя 1", planned: 168, actual: 165, compliance: 98 },
  { week: "Неделя 2", planned: 168, actual: 162, compliance: 96 },
  { week: "Неделя 3", planned: 168, actual: 168, compliance: 100 },
  { week: "Неделя 4", planned: 168, actual: 164, compliance: 98 },
];

const DURATION_DATA = [
  { range: "< 1ч", count: 45, percentage: 12 },
  { range: "1-2ч", count: 98, percentage: 26 },
  { range: "2-3ч", count: 134, percentage: 35 },
  { range: "3-4ч", count: 76, percentage: 20 },
  { range: "> 4ч", count: 28, percentage: 7 },
];

const CHART_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"];

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState("month");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedAgency, setSelectedAgency] = useState("all");

  const handleExport = (format: "excel" | "pdf") => {
    // Mock export - в реальности здесь был бы API вызов
    toast.success(
      `Отчёт "${
        REPORT_PRESETS.find((r) => r.id === selectedReport)?.title
      }" экспортирован в ${format.toUpperCase()}`
    );
  };

  const renderReportContent = () => {
    if (!selectedReport) return null;

    switch (selectedReport) {
      case "visits":
        return (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Всего визитов</div>
                <div className="text-3xl text-foreground">758</div>
                <div className="text-sm text-success flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +8.2% за период
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Уникальных охранников</div>
                <div className="text-3xl text-foreground">184</div>
                <div className="text-sm text-success flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +5.1%
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Средняя длительность</div>
                <div className="text-3xl text-foreground">2ч 18м</div>
                <div className="text-sm text-muted-foreground mt-1">±12 мин</div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">КПП задействовано</div>
                <div className="text-3xl text-foreground">37</div>
                <div className="text-sm text-muted-foreground mt-1">из 37</div>
              </Card>
            </div>

            {/* Chart */}
            <Card className="p-6">
              <h3 className="text-foreground mb-4">Динамика визитов</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={VISITS_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="visits"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Визиты"
                  />
                  <Line
                    type="monotone"
                    dataKey="guards"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Охранники"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Table */}
            <Card className="p-6">
              <h3 className="text-foreground mb-4">Детализация по дням</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Визиты</TableHead>
                    <TableHead>Охранники</TableHead>
                    <TableHead>Средняя длительность</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {VISITS_DATA.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.visits}</TableCell>
                      <TableCell>{row.guards}</TableCell>
                      <TableCell>2ч 15м</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        );

      case "guards":
        return (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Активных охранников</div>
                <div className="text-3xl text-foreground">145</div>
                <div className="text-sm text-success flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +3.2%
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Всего смен за месяц</div>
                <div className="text-3xl text-foreground">2,847</div>
                <div className="text-sm text-muted-foreground mt-1">19.6 на охранника</div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Средняя посещаемость</div>
                <div className="text-3xl text-foreground">94%</div>
                <div className="text-sm text-success flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +1.5%
                </div>
              </Card>
            </div>

            {/* Table */}
            <Card className="p-6">
              <h3 className="text-foreground mb-4">Топ-10 охранников</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Имя охранника</TableHead>
                    <TableHead>Смен</TableHead>
                    <TableHead>Часов</TableHead>
                    <TableHead>Посещаемость</TableHead>
                    <TableHead>Тренд</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {GUARDS_DATA.map((guard, index) => (
                    <TableRow key={guard.id}>
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell>{guard.name}</TableCell>
                      <TableCell>{guard.shifts}</TableCell>
                      <TableCell>{guard.hours}ч</TableCell>
                      <TableCell>{guard.attendance}%</TableCell>
                      <TableCell>
                        {guard.trend === "up" && (
                          <TrendingUp className="w-4 h-4 text-success" />
                        )}
                        {guard.trend === "down" && (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        )}
                        {guard.trend === "stable" && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        );

      case "checkpoints":
        return (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Всего КПП</div>
                <div className="text-3xl text-foreground">37</div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Активных КПП</div>
                <div className="text-3xl text-foreground">37</div>
                <Badge variant="success" className="mt-2">
                  100%
                </Badge>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Самый загруженный</div>
                <div className="text-foreground">КПП Главный</div>
                <div className="text-sm text-muted-foreground mt-1">1,234 визита</div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Средняя загрузка</div>
                <div className="text-3xl text-foreground">95</div>
                <div className="text-sm text-muted-foreground mt-1">визитов в день</div>
              </Card>
            </div>

            {/* Chart */}
            <Card className="p-6">
              <h3 className="text-foreground mb-4">Распределение по КПП</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={CHECKPOINTS_DATA}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {CHECKPOINTS_DATA.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </Card>

            {/* Table */}
            <Card className="p-6">
              <h3 className="text-foreground mb-4">Детализация по КПП</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>КПП</TableHead>
                    <TableHead>Визиты</TableHead>
                    <TableHead>Доля</TableHead>
                    <TableHead>Среднее время</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CHECKPOINTS_DATA.map((cp, index) => (
                    <TableRow key={index}>
                      <TableCell>{cp.name}</TableCell>
                      <TableCell>{cp.value.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{cp.percentage}%</Badge>
                      </TableCell>
                      <TableCell>2ч 10м</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        );

      case "branches":
        return (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Всего филиалов</div>
                <div className="text-3xl text-foreground">12</div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Охранников всего</div>
                <div className="text-3xl text-foreground">145</div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Визитов всего</div>
                <div className="text-3xl text-foreground">3,732</div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Среднее время</div>
                <div className="text-3xl text-foreground">2ч 12м</div>
              </Card>
            </div>

            {/* Chart */}
            <Card className="p-6">
              <h3 className="text-foreground mb-4">Охранники и визиты по филиалам</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={BRANCHES_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="branch" angle={-15} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="guards" fill="#3b82f6" name="Охранники" />
                  <Bar dataKey="visits" fill="#10b981" name="Визиты" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Table */}
            <Card className="p-6">
              <h3 className="text-foreground mb-4">Детализация по филиалам</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Филиал</TableHead>
                    <TableHead>Охранники</TableHead>
                    <TableHead>Визиты</TableHead>
                    <TableHead>Среднее время</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {BRANCHES_DATA.map((branch, index) => (
                    <TableRow key={index}>
                      <TableCell>{branch.branch}</TableCell>
                      <TableCell>{branch.guards}</TableCell>
                      <TableCell>{branch.visits}</TableCell>
                      <TableCell>{branch.avgTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        );

      case "schedule":
        return (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Соответствие графику</div>
                <div className="text-3xl text-foreground">98%</div>
                <div className="text-sm text-success flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  Отлично
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Запланировано смен</div>
                <div className="text-3xl text-foreground">672</div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Выполнено смен</div>
                <div className="text-3xl text-foreground">659</div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Пропущено</div>
                <div className="text-3xl text-foreground">13</div>
                <div className="text-sm text-muted-foreground mt-1">1.9%</div>
              </Card>
            </div>

            {/* Chart */}
            <Card className="p-6">
              <h3 className="text-foreground mb-4">Выполнение графика по неделям</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={SCHEDULE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="planned" fill="#94a3b8" name="Запланировано" />
                  <Bar dataKey="actual" fill="#3b82f6" name="Фактически" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Table */}
            <Card className="p-6">
              <h3 className="text-foreground mb-4">Детализация по неделям</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Период</TableHead>
                    <TableHead>Запланировано</TableHead>
                    <TableHead>Фактически</TableHead>
                    <TableHead>Соответствие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SCHEDULE_DATA.map((week, index) => (
                    <TableRow key={index}>
                      <TableCell>{week.week}</TableCell>
                      <TableCell>{week.planned}ч</TableCell>
                      <TableCell>{week.actual}ч</TableCell>
                      <TableCell>
                        <Badge
                          variant={week.compliance >= 98 ? "success" : "secondary"}
                        >
                          {week.compliance}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        );

      case "duration":
        return (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Среднее время</div>
                <div className="text-3xl text-foreground">2ч 18м</div>
                <div className="text-sm text-muted-foreground mt-1">±15 минут</div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Медиана</div>
                <div className="text-3xl text-foreground">2ч 15м</div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Минимум</div>
                <div className="text-3xl text-foreground">25м</div>
              </Card>
              <Card className="p-4">
                <div className="text-muted-foreground mb-2">Максимум</div>
                <div className="text-3xl text-foreground">6ч 45м</div>
              </Card>
            </div>

            {/* Chart */}
            <Card className="p-6">
              <h3 className="text-foreground mb-4">Распределение по длительности</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={DURATION_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Количество визитов" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Table */}
            <Card className="p-6">
              <h3 className="text-foreground mb-4">Распределение визитов</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Длительность</TableHead>
                    <TableHead>Количество</TableHead>
                    <TableHead>Процент</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DURATION_DATA.map((range, index) => (
                    <TableRow key={index}>
                      <TableCell>{range.range}</TableCell>
                      <TableCell>{range.count}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{range.percentage}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground mb-2">Отчёты и экспорт</h1>
        <p className="text-muted-foreground">
          Выберите тип отчёта для просмотра и экспорта данных
        </p>
      </div>

      {selectedReport ? (
        <>
          {/* Report Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setSelectedReport(null)}
              >
                ← Назад к списку
              </Button>
              <div>
                <h2 className="text-foreground">
                  {REPORT_PRESETS.find((r) => r.id === selectedReport)?.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {REPORT_PRESETS.find((r) => r.id === selectedReport)?.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleExport("excel")}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button onClick={() => handleExport("pdf")}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Период</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Сегодня</SelectItem>
                    <SelectItem value="week">Эта неделя</SelectItem>
                    <SelectItem value="month">Этот месяц</SelectItem>
                    <SelectItem value="quarter">Этот квартал</SelectItem>
                    <SelectItem value="year">Этот год</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Филиал</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все филиалы</SelectItem>
                    <SelectItem value="almaty">Филиал Алматы</SelectItem>
                    <SelectItem value="astana">Филиал Астана</SelectItem>
                    <SelectItem value="shymkent">Филиал Шымкент</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Агентство</Label>
                <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все агентства</SelectItem>
                    <SelectItem value="kz-security">ТОО «Казахстан Секьюрити»</SelectItem>
                    <SelectItem value="reliable">ТОО «Надежная Охрана»</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Report Content */}
          {renderReportContent()}
        </>
      ) : (
        /* Report Presets */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REPORT_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <Card
                key={preset.id}
                className="p-6 cursor-pointer hover:shadow-lg transition-all hover:border-primary group"
                onClick={() => setSelectedReport(preset.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-primary/10 ${preset.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-foreground mb-2 group-hover:text-primary transition-colors">
                      {preset.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {preset.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
