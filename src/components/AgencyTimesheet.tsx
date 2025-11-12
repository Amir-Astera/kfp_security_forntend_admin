import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
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
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Search,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Monitor,
  Sun,
  Moon,
  Calendar,
} from "lucide-react";
import { db } from "../services";
import { Guard } from "../types";
import { toast } from "sonner@2.0.3";
import * as XLSX from "xlsx";

interface GuardTimesheetData extends Guard {
  screenTime: number; // Экранное время в минутах за сегодня
  actualShiftStart: string; // Фактическое время начала смены
  actualShiftEnd: string; // Фактическое время окончания смены
  overtime: number; // Переработка в минутах
  effectiveness: number; // Эффективность в процентах
  daysWorked: number; // Отработано дней в месяце
  plannedHours: number; // Плановые часы
  actualHours: number; // Фактические часы
}

export function AgencyTimesheet() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

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
      toast.error("Не удалось загрузить данные");
      setLoading(false);
    }
  };

  // Генерация табельных данных
  const generateTimesheetData = (guard: Guard): GuardTimesheetData => {
    // Мок-данные для демонстрации
    const workDayMinutes = 12 * 60; // 12 часов смена
    const actualMinutes = workDayMinutes + Math.floor(Math.random() * 120 - 30); // ±2 часа от нормы
    const overtime = Math.max(0, actualMinutes - workDayMinutes);
    const screenTime = Math.floor(actualMinutes * (0.7 + Math.random() * 0.25)); // 70-95% времени
    
    return {
      ...guard,
      screenTime,
      actualShiftStart: "08:15", // Мок
      actualShiftEnd: "20:30", // Мок
      overtime,
      effectiveness: Math.floor(70 + Math.random() * 25), // 70-95%
      daysWorked: 22,
      plannedHours: 264, // 22 дня * 12 часов
      actualHours: Math.floor(actualMinutes * 22 / 60),
    };
  };

  // Фильтрация
  const filteredGuards = guards.filter((guard) => {
    const matchesSearch =
      guard.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guard.iin.includes(searchQuery) ||
      guard.loginEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || guard.status === statusFilter;
    const matchesShift = shiftFilter === "all" || guard.shiftType === shiftFilter;
    const matchesBranch = branchFilter === "all" || guard.branchId === branchFilter;

    return matchesSearch && matchesStatus && matchesShift && matchesBranch;
  });

  const timesheetData = filteredGuards.map(generateTimesheetData);

  // Получение уникальных филиалов
  const branches = Array.from(new Set(guards.map((g) => g.branchName)));

  // Экспорт в Excel
  const handleExport = () => {
    const exportData = timesheetData.map((guard) => ({
      "ФИО": guard.fullName,
      "ИИН": guard.iin,
      "Филиал": guard.branchName,
      "КПП": guard.checkpointName,
      "Смена": guard.shiftType === "day" ? "Дневная" : "Ночная",
      "График": `${guard.shiftStart} - ${guard.shiftEnd}`,
      "Фактически начало": guard.actualShiftStart,
      "Фактически конец": guard.actualShiftEnd,
      "Плановые часы": guard.plannedHours,
      "Фактические часы": guard.actualHours,
      "Переработка (мин)": guard.overtime,
      "Экранное время (мин)": guard.screenTime,
      "Эффективность %": guard.effectiveness,
      "Отработано дней": guard.daysWorked,
      "Статус": guard.status === "active" ? "Активен" : guard.status === "vacation" ? "Отпуск" : guard.status === "sick" ? "Больничный" : "Неактивен",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Табель");

    const date = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `tabel_${date}.xlsx`);

    toast.success("Табель экспортирован в Excel");
  };

  // Форматирование времени
  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Табель учёта рабочего времени</h2>
          <p className="text-muted-foreground">
            Полная информация по всем охранникам за текущий месяц
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Экспорт в Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по ФИО, ИИН, Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger>
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
          <Select value={shiftFilter} onValueChange={setShiftFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Все смены" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все смены</SelectItem>
              <SelectItem value="day">Дневная</SelectItem>
              <SelectItem value="night">Ночная</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="active">Активен</SelectItem>
              <SelectItem value="vacation">В отпуске</SelectItem>
              <SelectItem value="sick">На больничном</SelectItem>
              <SelectItem value="inactive">Неактивен</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground">Средняя переработка</p>
              <p className="text-foreground">
                {formatMinutes(
                  Math.floor(
                    timesheetData.reduce((sum, g) => sum + g.overtime, 0) /
                      timesheetData.length
                  )
                )}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-muted-foreground">С переработкой</p>
              <p className="text-foreground">
                {timesheetData.filter((g) => g.overtime > 30).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <Monitor className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-muted-foreground">Ср. экранное время</p>
              <p className="text-foreground">
                {formatMinutes(
                  Math.floor(
                    timesheetData.reduce((sum, g) => sum + g.screenTime, 0) /
                      timesheetData.length
                  )
                )}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-muted-foreground">Ср. эффективность</p>
              <p className="text-foreground">
                {Math.floor(
                  timesheetData.reduce((sum, g) => sum + g.effectiveness, 0) /
                    timesheetData.length
                )}
                %
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Timesheet Table */}
      <Card className="p-6">
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Охранник</TableHead>
                <TableHead>Смена</TableHead>
                <TableHead>Фактическое время</TableHead>
                <TableHead className="text-center">План / Факт часов</TableHead>
                <TableHead className="text-center">Переработка</TableHead>
                <TableHead className="text-center">Экранное время</TableHead>
                <TableHead className="text-center">Эффективность</TableHead>
                <TableHead className="text-center">Отработано дней</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheetData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Нет данных для отображения
                  </TableCell>
                </TableRow>
              ) : (
                timesheetData.map((guard) => (
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
                        <div>
                          <p className="text-foreground">{guard.fullName}</p>
                          <p className="text-muted-foreground">
                            {guard.branchName} • {guard.checkpointName}
                          </p>
                        </div>
                      </div>
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
                          <p className="text-muted-foreground">
                            {guard.shiftStart} - {guard.shiftEnd}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground">
                        {guard.actualShiftStart} - {guard.actualShiftEnd}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      <p className="text-foreground">
                        {guard.plannedHours}ч / {guard.actualHours}ч
                      </p>
                      {guard.actualHours > guard.plannedHours && (
                        <p className="text-warning text-xs">
                          +{guard.actualHours - guard.plannedHours}ч
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {guard.overtime > 30 ? (
                        <div className="flex items-center justify-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-warning" />
                          <span className="text-warning">
                            {formatMinutes(guard.overtime)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span className="text-success">
                            {formatMinutes(guard.overtime)}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-foreground">
                        {formatMinutes(guard.screenTime)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          guard.effectiveness >= 85
                            ? "bg-success/10 text-success border-success/20"
                            : guard.effectiveness >= 70
                            ? "bg-warning/10 text-warning border-warning/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }
                      >
                        {guard.effectiveness}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-foreground">{guard.daysWorked}</span>
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
                          ? "Отпуск"
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

        {timesheetData.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-muted-foreground">
              Показано {timesheetData.length} охранников
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
