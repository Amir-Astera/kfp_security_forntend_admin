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
import { Guard, GuardFilters } from "../types";
import { getGuards, resetGuardPassword, updateGuard, exportGuards } from "../api/guards";
import { toast } from "sonner@2.0.3";

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
  const [loading, setLoading] = useState(true);

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
  }, [searchQuery, agencyFilter, branchFilter, statusFilter, shiftFilter]);

  const loadGuards = async () => {
    setLoading(true);
    try {
      const filters: GuardFilters = {
        search: searchQuery || undefined,
        agencyId: agencyFilter !== "all" ? agencyFilter : undefined,
        branchId: branchFilter !== "all" ? branchFilter : undefined,
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        shiftType: shiftFilter !== "all" ? (shiftFilter as any) : undefined,
      };

      const response = await getGuards(filters);
      setGuards(response.items);
    } catch (error) {
      toast.error("Ошибка загрузки охранников");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (guard: Guard) => {
    try {
      await resetGuardPassword(guard.id);
      toast.success(
        `Пароль сброшен. Новый пароль отправлен на ${guard.loginEmail}`
      );
    } catch (error) {
      toast.error("Ошибка сброса пароля");
    }
  };

  const handleToggleStatus = async (guard: Guard) => {
    const newStatus = guard.status === "active" ? "inactive" : "active";
    try {
      await updateGuard(guard.id, { status: newStatus });
      toast.success(
        `Охранник ${newStatus === "active" ? "активирован" : "деактивирован"}`
      );
      loadGuards();
    } catch (error) {
      toast.error("Ошибка изменения статуса");
    }
  };

  const handleViewStats = (guard: Guard) => {
    toast.info(
      `Статистика ${guard.fullName}:\n\nВсего визитов: ${guard.visitsCount}\nПоследняя активность: ${guard.lastActivity || "Нет данных"}`
    );
  };

  const handleExport = async () => {
    try {
      const url = await exportGuards({
        search: searchQuery || undefined,
      });
      toast.success("Экспорт успешно выполнен");
      console.log("Export URL:", url);
    } catch (error) {
      toast.error("Ошибка экспорта");
    }
  };

  const agencies = Array.from(
    new Map(guards.map((g) => [g.agencyId, { id: g.agencyId, name: g.agencyName }])).values()
  );

  const branches = agencyFilter === "all"
    ? Array.from(
        new Map(guards.map((g) => [g.branchId, { id: g.branchId, name: g.branchName }])).values()
      )
    : Array.from(
        new Map(
          guards
            .filter((g) => g.agencyId === agencyFilter)
            .map((g) => [g.branchId, { id: g.branchId, name: g.branchName }])
        ).values()
      );

  const activeCount = guards.filter((g) => g.status === "active").length;
  const totalVisits = guards.reduce((sum, g) => sum + g.visitsCount, 0);
  const sortedGuards = sortData(guards);

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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : sortedGuards.length === 0 ? (
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
                                Деа��тивировать
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
