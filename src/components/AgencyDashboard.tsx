import { useState, useEffect } from "react";
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
} from "lucide-react";
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
import { db } from "../services";

// Данные для таблицы статистики охранников
interface GuardStats {
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

export function AgencyDashboard() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Фильтры для таблицы статистики
  const [periodFilter, setPeriodFilter] = useState<string>("month");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [checkpointFilter, setCheckpointFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const allGuards = db.getGuards();
      setGuards(allGuards);
      setLoading(false);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setLoading(false);
    }
  };

  // Вычисление метрик
  const totalGuards = guards.length;
  const activeGuards = guards.filter((g) => g.status === "active").length;
  const onVacation = guards.filter((g) => g.status === "vacation").length;
  const onSick = guards.filter((g) => g.status === "sick").length;

  // Получение уникальных филиалов
  const contractedBranches = new Set(guards.map((g) => g.branchName)).size;

  // Охранники на смене (активные охранники, у которых сейчас рабочее время)
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentDay = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"][currentTime.getDay()];
  
  const onDutyGuards = guards.filter((g) => {
    if (g.status !== "active") return false;
    if (!g.workDays.includes(currentDay)) return false;
    
    const shiftStartHour = parseInt(g.shiftStart.split(":")[0]);
    const shiftEndHour = parseInt(g.shiftEnd.split(":")[0]);
    
    // Проверяем, попадает ли текущее время в рабочую смену
    if (shiftStartHour < shiftEndHour) {
      // Обычная смена (например, 08:00 - 20:00)
      return currentHour >= shiftStartHour && currentHour < shiftEndHour;
    } else {
      // Ночная смена через полночь (например, 20:00 - 08:00)
      return currentHour >= shiftStartHour || currentHour < shiftEndHour;
    }
  }).length;

  // Генерация данных переработок и экранного времени (мок-данные)
  const overtimeGuards = guards.filter(() => Math.random() > 0.7); // ~30% с переработкой
  const avgScreenTime = 9.5; // Среднее экранное время в часах

  // Статусы охранников
  const guardsStatusData = [
    { name: "Активны", value: activeGuards, color: "#10b981" },
    { name: "В отпуске", value: onVacation, color: "#f59e0b" },
    { name: "На больничном", value: onSick, color: "#ef4444" },
  ].filter(item => item.value > 0);

  // Данные для таблицы статистики охранников
  const guardsStatsData: GuardStats[] = guards.map((guard) => {
    return {
      id: guard.id,
      fullName: guard.fullName,
      branchName: guard.branchName,
      checkpointName: guard.checkpointName,
      shiftType: guard.shiftType,
      shiftTime: `${guard.shiftStart} - ${guard.shiftEnd}`,
      avgProcessingTime: "02:30", // Заглушка
      lateCount: 0, // Заглушка
      actualHours: 264, // Заглушка
      plannedHours: 240, // Заглушка
      hasOvertime: Math.random() > 0.5, // Заглушка
      overtimeHours: Math.random() > 0.5 ? 20 : 0, // Заглушка
      status: guard.status,
    };
  });

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

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Загрузка...</div>;
  }

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
          value={totalGuards}
          icon={Users}
          trend="+2 за месяц"
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
          value={contractedBranches}
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

      {/* Second Row Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="На больничном"
          value={onSick}
          icon={AlertTriangle}
          iconClassName="text-destructive"
        />
        <MetricCard
          title="Переработки"
          value={overtimeGuards.length}
          subtitle="охранников"
          icon={Monitor}
          iconClassName="text-warning"
        />
        <MetricCard
          title="Экранное время"
          value={`${avgScreenTime}ч`}
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

      {/* Charts Row - информация про охранников */}
      <div className="grid grid-cols-3 gap-6">
        {/* Экранное время охранников */}
        <Card className="p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            Экранное время
          </h3>
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-foreground mb-1">{avgScreenTime} часов</div>
              <p className="text-muted-foreground">Среднее за сегодня</p>
            </div>
            <div className="space-y-2">
              {guards.slice(0, 5).map((guard) => {
                const screenTime = 8 + Math.random() * 4; // 8-12 часов
                return (
                  <div key={guard.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {guard.fullName.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">{guard.fullName.split(" ")[0]}</span>
                    </div>
                    <span className="text-foreground">{screenTime.toFixed(1)}ч</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Переработки */}
        <Card className="p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Переработки
          </h3>
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-foreground mb-1">{overtimeGuards.length}</div>
              <p className="text-muted-foreground">Охранников с переработкой</p>
            </div>
            <div className="space-y-2">
              {overtimeGuards.slice(0, 5).map((guard) => {
                const overtime = 30 + Math.floor(Math.random() * 90); // 30-120 минут
                return (
                  <div key={guard.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {guard.fullName.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">{guard.fullName.split(" ")[0]}</span>
                    </div>
                    <span className="text-warning">+{overtime}м</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Статусы охранников */}
        <Card className="p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Статусы охранников
          </h3>
          {totalGuards > 0 ? (
            <div className="space-y-6">
              {/* Circular progress bars */}
              <div className="flex items-center justify-center gap-8 py-4">
                {guardsStatusData.map((item, index) => {
                  const percentage = totalGuards > 0 ? (item.value / totalGuards) * 100 : 0;
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
                      <span className="text-muted-foreground text-center text-xs">{item.name}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Legend */}
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
                ))  }
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              Нет данных для отображения
            </div>
          )}
        </Card>
      </div>

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