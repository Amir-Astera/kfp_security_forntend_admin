import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
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
import { StatusBadge } from "./StatusBadge";
import { SortableTableHead } from "./SortableTableHead";
import { useSorting } from "./hooks/useSorting";
import {
  Search,
  Download,
  MoreVertical,
  BarChart3,
  KeyRound,
  Ban,
  CheckCircle,
  Sun,
  Moon,
  Calendar,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Guard } from "../types";
import { db } from "../services";
import { toast } from "sonner@2.0.3";
import { exportGuards } from "../utils/export";

const statusLabels = {
  active: "Активен",
  inactive: "Неактивен",
  vacation: "В отпуске",
  sick: "На больничном",
};

const statusColors = {
  active: "active",
  inactive: "inactive",
  vacation: "warning",
  sick: "destructive",
} as const;

export function GuardsList() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Фильтры
  const [searchQuery, setSearchQuery] = useState("");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");

  // Сортировка
  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  useEffect(() => {
    loadGuards();
    loadAgencies();
    loadBranches();
  }, []);

  const loadGuards = () => {
    try {
      const data = db.getGuards();
      setGuards(data);
    } catch (error) {
      console.error("Ошибка загрузки охранников:", error);
      toast.error("Не удалось загрузить охранников");
    }
  };

  const loadAgencies = () => {
    try {
      const data = db.getAgencies();
      setAgencies(data);
    } catch (error) {
      console.error("Ошибка загрузки агентств:", error);
    }
  };

  const loadBranches = () => {
    try {
      const data = db.getBranches();
      setBranches(data);
    } catch (error) {
      console.error("Ошибка загрузки филиалов:", error);
    }
  };

  const handleToggleStatus = (guard: Guard) => {
    try {
      const newStatus = guard.status === "active" ? "inactive" : "active";
      db.updateGuard(guard.id, { status: newStatus });
      toast.success(
        `Охранник ${newStatus === "active" ? "активирован" : "деактивирован"}`
      );
      loadGuards();
    } catch (error) {
      console.error("Ошибка изменения статуса:", error);
      toast.error("Не удалось изменить статус");
    }
  };

  const handleResetPassword = (guard: Guard) => {
    toast.success(
      `Пароль для ${guard.loginEmail} сброшен. Новый пароль отправлен на email.`
    );
  };

  const handleViewStats = (guard: Guard) => {
    alert(
      `Статистика для ${guard.fullName}:\n\nВизитов зарегистрировано: ${guard.visitsCount}\nПоследняя активность: ${guard.lastActivity || "Нет данных"}`
    );
  };

  const handleExport = () => {
    exportGuards(guards);
    toast.success(
      "Экспорт охранников начат. Файл будет загружен через несколько секунд."
    );
  };

  const activeCount = guards.filter((g) => g.status === "active").length;
  const totalVisits = guards.reduce((sum, g) => sum + g.visitsCount, 0);

  // Фильтрация данных
  const filteredGuards = guards.filter((guard) => {
    const matchesSearch =
      guard.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guard.iin.includes(searchQuery) ||
      guard.phone.includes(searchQuery) ||
      guard.loginEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAgency =
      agencyFilter === "all" || guard.agencyId === agencyFilter;

    const matchesBranch =
      branchFilter === "all" || guard.branchId === branchFilter;

    const matchesStatus =
      statusFilter === "all" || guard.status === statusFilter;

    const matchesShift =
      shiftFilter === "all" || guard.shiftType === shiftFilter;

    return (
      matchesSearch &&
      matchesAgency &&
      matchesBranch &&
      matchesStatus &&
      matchesShift
    );
  });

  const sortedGuards = sortData(filteredGuards);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Охранники</h2>
          <p className="text-muted-foreground">
            Всего: {guards.length} • Активных: {activeCount} • Визитов:{" "}
            {totalVisits}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Экспорт .xlsx
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по ФИО, ИИН, телефону, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <Select value={agencyFilter} onValueChange={setAgencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Агентство" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все агентства</SelectItem>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Филиал" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все филиалы</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Смена" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все смены</SelectItem>
                <SelectItem value="day">Дневная</SelectItem>
                <SelectItem value="night">Ночная</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активен</SelectItem>
                <SelectItem value="inactive">Неактивен</SelectItem>
                <SelectItem value="vacation">В отпуске</SelectItem>
                <SelectItem value="sick">На больничном</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="group">
                <TableHead>
                  <SortableTableHead
                    field="fullName"
                    label="Охранник"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>ИИН / Телефон</TableHead>
                <TableHead>
                  <SortableTableHead
                    field="agencyName"
                    label="Агентство"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    field="branchName"
                    label="Филиал / КПП"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    field="shiftType"
                    label="Смена"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>Рабочие дни</TableHead>
                <TableHead>
                  <SortableTableHead
                    field="visitsCount"
                    label="Визиты"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    field="lastActivity"
                    label="Последняя активность"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    field="status"
                    label="Статус"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!sortedGuards || sortedGuards.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Охранники не найдены
                  </TableCell>
                </TableRow>
              ) : (
                sortedGuards.map((guard) => (
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
                            {guard.loginEmail}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground">{guard.iin}</p>
                      <p className="text-muted-foreground">{guard.phone}</p>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {guard.agencyName}
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground">{guard.branchName}</p>
                      <p className="text-muted-foreground">
                        {guard.checkpointName}
                      </p>
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
                      <div className="flex flex-wrap gap-1">
                        {guard.workDays.map((day, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {day}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {guard.visitsCount}
                    </TableCell>
                    <TableCell>
                      {guard.lastActivity ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {guard.lastActivity}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
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
                        {statusLabels[guard.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewStats(guard)}
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Статистика
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleResetPassword(guard)}
                          >
                            <KeyRound className="w-4 h-4 mr-2" />
                            Сбросить пароль
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(guard)}
                          >
                            {guard.status === "active" ? (
                              <>
                                <Ban className="w-4 h-4 mr-2" />
                                Деактивировать
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Активировать
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {guards.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Показано {guards.length} охранников</p>
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
    </div>
  );
}