import { useState, useEffect } from "react";
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
import { db } from "../services";
import type { Branch, Checkpoint, Agency, Guard, Visit } from "../types";

const chartConfig = {
  visits: {
    label: "Визиты",
    color: "#2563eb",
  },
};

export function SuperadminDashboard() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      setBranches(db.getBranches());
      setCheckpoints(db.getCheckpoints());
      setAgencies(db.getAgencies());
      setGuards(db.getGuards());
      setVisits(db.getVisits());
      setLoading(false);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setLoading(false);
    }
  };

  // Вычисление метрик
  const activeBranches = branches.filter((b) => b.status === "active").length;
  const activeCheckpoints = checkpoints.filter((c) => c.status === "active").length;
  const activeAgencies = agencies.filter((a) => a.status === "active").length;
  const totalGuards = guards.length;
  const activeGuards = guards.filter((g) => g.status === "active").length;

  // Визиты
  const today = new Date().toISOString().split("T")[0];
  const visitsToday = visits.filter((v) => v.entryDate === today).length;
  const visitsOnSite = visits.filter((v) => v.status === "on-site").length;

  // Последние визиты (топ 5)
  const recentVisits = visits
    .sort((a, b) => {
      const dateTimeA = `${a.entryDate} ${a.entryTime}`;
      const dateTimeB = `${b.entryDate} ${b.entryTime}`;
      return dateTimeB.localeCompare(dateTimeA);
    })
    .slice(0, 5);

  // Визиты за последние 7 дней
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split("T")[0];
  });

  const visitsOverTimeData = last7Days.map((date) => {
    const dayVisits = visits.filter((v) => v.entryDate === date).length;
    const shortDate = new Date(date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    });
    return {
      date: shortDate,
      visits: dayVisits,
    };
  });

  // Распределение по филиалам
  const branchesData = branches
    .map((branch) => ({
      name: branch.name,
      visits: visits.filter((v) => v.branchId === branch.id).length,
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);

  // Топ компании
  const companyCounts: { [key: string]: number } = {};
  visits.forEach((v) => {
    if (v.company) {
      companyCounts[v.company] = (companyCounts[v.company] || 0) + 1;
    }
  });
  const topCompaniesData = Object.entries(companyCounts)
    .map(([name, visits]) => ({ name, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);

  // Цели визитов
  const purposeCounts: { [key: string]: number } = {};
  visits.forEach((v) => {
    if (v.purpose) {
      purposeCounts[v.purpose] = (purposeCounts[v.purpose] || 0) + 1;
    }
  });
  const visitPurposesData = Object.entries(purposeCounts)
    .map(([name, value], index) => ({
      name,
      value,
      color: ["#2563eb", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"][index % 5],
    }))
    .slice(0, 5);

  // Гости vs Транспорт
  const guestVisits = visits.filter((v) => v.visitType === "guest").length;
  const transportVisits = visits.filter((v) => v.visitType === "transport").length;
  const guestVsTransportData = [
    { name: "Гости", value: guestVisits, color: "#2563eb" },
    { name: "Транспорт", value: transportVisits, color: "#8b5cf6" },
  ];

  // Активность охранников (по визитам)
  const guardActivityData = guards
    .filter((g) => g.status === "active")
    .slice(0, 5)
    .map((guard) => {
      const guardVisits = visits.filter((v) => v.guardId === guard.id);
      const activity: any = { guard: guard.fullName };
      
      // Подсчет визитов по всем часам с 00:00 по 23:00
      const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
      timeSlots.forEach((slot) => {
        const hour = parseInt(slot.split(":")[0]);
        const count = guardVisits.filter((v) => {
          const visitHour = parseInt(v.entryTime.split(" ")[1]?.split(":")[0] || "0");
          return visitHour === hour;
        }).length;
        activity[slot] = count;
      });
      
      return activity;
    });

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-foreground mb-1">Агрохолдинг KFP</h2>
            <p className="text-muted-foreground">
              35 компаний • 12 филиалов • 37 КПП • 8 охранных агентств
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
          value={activeBranches.toString()}
          subtitle="Активных"
          icon={Building2}
        />
        <MetricCard
          title="КПП"
          value={activeCheckpoints.toString()}
          subtitle={`В ${activeBranches} ${activeBranches === 1 ? 'филиале' : activeBranches > 1 && activeBranches < 5 ? 'филиалах' : 'филиалах'}`}
          icon={MapPin}
        />
        <MetricCard
          title="Агентства"
          value={activeAgencies.toString()}
          subtitle="Активных"
          icon={Shield}
        />
        <MetricCard
          title="Охранники"
          value={totalGuards.toString()}
          subtitle={`На смене: ${activeGuards}`}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Визиты за месяц"
          value={visits.length.toString()}
          trend={{ value: 12.5, isPositive: true }}
          icon={TrendingUp}
        />
        <MetricCard
          title="Визиты сегодня"
          value={visitsToday.toString()}
          subtitle="С начала дня"
          icon={TrendingUp}
        />
        <MetricCard
          title="На территории"
          value={visitsOnSite.toString()}
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
          <table className="w-full min-w-[1800px]">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted-foreground min-w-[120px] sticky left-0 bg-background z-10">Охранник</th>
                {Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`).map((time) => (
                  <th key={time} className="text-center p-2 text-muted-foreground min-w-[50px]">{time}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guardActivityData.map((guard, index) => (
                <tr key={index} className="border-t border-border">
                  <td className="p-2 text-foreground sticky left-0 bg-background z-10">{guard.guard}</td>
                  {Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`).map((time) => {
                    const value = guard[time as keyof typeof guard] as number;
                    const intensity = Math.min(value / 15, 1);
                    const bgColor = `rgba(37, 99, 235, ${0.1 + intensity * 0.7})`;
                    return (
                      <td key={time} className="p-2 text-center">
                        <div
                          className="w-10 h-10 mx-auto rounded flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
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
                  <TableCell>{visit.entryDate} {visit.entryTime}</TableCell>
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