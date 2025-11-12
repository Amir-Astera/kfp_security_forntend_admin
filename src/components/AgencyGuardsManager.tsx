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
import { GuardFormDialog } from "./GuardFormDialog";
import {
  Plus,
  Search,
  Download,
  MoreVertical,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  Sun,
  Moon,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Guard } from "../types";
import { db } from "../services";
import { toast } from "sonner@2.0.3";

export function AgencyGuardsManager() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Фильтры
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");

  // Диалоги
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuard, setEditingGuard] = useState<Guard | null>(null);
  const [deletingGuard, setDeletingGuard] = useState<Guard | null>(null);

  // Сортировка
  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  // TODO: В реальном приложении получать из контекста аутентификации
  const CURRENT_AGENCY_ID = "agency-1";

  useEffect(() => {
    loadGuards();
    loadBranches();
  }, []);

  const loadGuards = () => {
    try {
      const data = db.getGuardsByAgencyId(CURRENT_AGENCY_ID);
      setGuards(data);
    } catch (error) {
      console.error("Ошибка загрузки охранников:", error);
      toast.error("Не удалось загрузить охранников");
    }
  };

  const loadBranches = () => {
    try {
      // Получаем филиалы агентства
      const agency = db.getAgencyById(CURRENT_AGENCY_ID);
      if (agency) {
        const branchesData = db.getBranches().filter(b => agency.branches.includes(b.id));
        setBranches(branchesData);
      }
    } catch (error) {
      console.error("Ошибка загрузки филиалов:", error);
    }
  };

  const handleCreateOrUpdate = (data: any) => {
    try {
      if (editingGuard) {
        db.updateGuard(editingGuard.id, data);
        toast.success("Охранник успешно обновлен");
      } else {
        // Добавляем agencyId к данным
        db.createGuard({ ...data, agencyId: CURRENT_AGENCY_ID });
        toast.success("Охранник успешно создан");
      }
      loadGuards();
      setIsFormOpen(false);
      setEditingGuard(null);
    } catch (error) {
      console.error("Ошибка сохранения охранника:", error);
      toast.error("Не удалось сохранить охранника");
    }
  };

  const handleEdit = (guard: Guard) => {
    setEditingGuard(guard);
    setIsFormOpen(true);
  };

  const handleDelete = (guard: Guard) => {
    setDeletingGuard(guard);
  };

  const confirmDelete = () => {
    if (!deletingGuard) return;
    
    try {
      db.deleteGuard(deletingGuard.id);
      toast.success("Охранник удален");
      loadGuards();
    } catch (error) {
      console.error("Ошибка удаления охранника:", error);
      toast.error("Не удалось удалить охранника");
    } finally {
      setDeletingGuard(null);
    }
  };

  const handleToggleStatus = (guard: Guard) => {
    try {
      const newStatus = guard.status === "active" ? "inactive" : "active";
      db.updateGuard(guard.id, { status: newStatus });
      toast.success(`Охранник ${newStatus === "active" ? "активирован" : "деактивирован"}`);
      loadGuards();
    } catch (error) {
      console.error("Ошибка изменения статуса:", error);
      toast.error("Не удалось изменить статус");
    }
  };

  const handleExport = () => {
    toast.success("Экспорт охранников начат. Файл будет загружен через несколько секунд.");
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

    const matchesBranch =
      branchFilter === "all" || guard.branchId === branchFilter;

    const matchesStatus =
      statusFilter === "all" || guard.status === statusFilter;

    const matchesShift =
      shiftFilter === "all" || guard.shiftType === shiftFilter;

    return (
      matchesSearch &&
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
          <h2 className="text-foreground mb-1">Управление охранниками</h2>
          <p className="text-muted-foreground">
            Всего: {guards.length} • Активных: {activeCount} • Визитов:{" "}
            {totalVisits}
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить охранника
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по ФИО, ИИН, телефону..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
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
                    field="status"
                    label="Статус"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="w-[150px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!sortedGuards || sortedGuards.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
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
                      <StatusBadge status={guard.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(guard)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(guard)}
                        >
                          {guard.status === "active" ? (
                            <Ban className="w-4 h-4 text-warning" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-success" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(guard)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Form Dialog */}
      <GuardFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        guard={editingGuard}
        onSuccess={handleCreateOrUpdate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deletingGuard !== null} onOpenChange={setDeletingGuard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить охранника?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить охранника{" "}
              <span className="font-medium">{deletingGuard?.fullName}</span>?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}