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
import { GuardFormDialog } from "./GuardFormDialog";
import { SortableTableHead } from "./SortableTableHead";
import { useSorting } from "./hooks/useSorting";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Sun,
  Moon,
  Ban,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
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
import { Guard, GuardFilters } from "../types";
import { getGuards, updateGuard, deleteGuard } from "../api/guards";
import { toast } from "sonner@2.0.3";

export function AgencyGuardsManager() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingGuard, setEditingGuard] = useState<Guard | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [guardToDelete, setGuardToDelete] = useState<Guard | null>(null);

  // Фильтры
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");

  // Сортировка
  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  useEffect(() => {
    loadGuards();
  }, [searchQuery, branchFilter, statusFilter, shiftFilter]);

  const loadGuards = async () => {
    setLoading(true);
    try {
      const filters: GuardFilters = {
        search: searchQuery || undefined,
        branchId: branchFilter !== "all" ? branchFilter : undefined,
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        shiftType: shiftFilter !== "all" ? (shiftFilter as any) : undefined,
        // В реальном приложении здесь будет фильтр по agencyId текущего пользователя
        agencyId: "1", // Моковое агентство
      };

      const response = await getGuards(filters);
      setGuards(response.items);
    } catch (error) {
      toast.error("Ошибка загрузки охранников");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingGuard(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (guard: Guard) => {
    setEditingGuard(guard);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (guard: Guard) => {
    setGuardToDelete(guard);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!guardToDelete) return;

    try {
      await deleteGuard(guardToDelete.id);
      toast.success(`Охранник ${guardToDelete.fullName} удален`);
      setDeleteDialogOpen(false);
      setGuardToDelete(null);
      loadGuards();
    } catch (error) {
      toast.error("Ошибка удаления охранника");
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

  const handleFormSuccess = () => {
    setFormDialogOpen(false);
    setEditingGuard(null);
    loadGuards();
  };

  const branches = Array.from(
    new Map(guards.map((g) => [g.branchId, { id: g.branchId, name: g.branchName }])).values()
  );

  const activeCount = guards.filter((g) => g.status === "active").length;
  const totalVisits = guards.reduce((sum, g) => sum + g.visitsCount, 0);
  const sortedGuards = sortData(guards);

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
        <Button onClick={handleAdd}>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : sortedGuards.length === 0 ? (
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
                          ? "На больничном"
                          : "Неактивен"}
                      </Badge>
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
                          onClick={() => handleDeleteClick(guard)}
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
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        guard={editingGuard}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить охранника?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить охранника{" "}
              <span className="font-medium">{guardToDelete?.fullName}</span>?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
