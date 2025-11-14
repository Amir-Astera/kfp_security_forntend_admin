import { useState, useEffect, useCallback } from "react";
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
import type { AuthResponse, Guard, CreateGuardRequest, UpdateGuardRequest } from "../types";
import { db } from "../services";
import { toast } from "sonner@2.0.3";
import {
  createGuard as createGuardRequest,
  deleteGuard as deleteGuardRequest,
  fetchGuardsFromApi,
  mapGuardFromApi,
  updateGuard as updateGuardRequest,
  type GuardsApiParams,
} from "../api/guards";
import { getBranchesByAgencyId } from "../api/branches";

interface AgencyGuardsManagerProps {
  authTokens?: AuthResponse | null;
  agencyId?: string;
}

export function AgencyGuardsManager({ authTokens, agencyId }: AgencyGuardsManagerProps) {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const resolvedAgencyId = agencyId ?? authTokens?.principal?.userId ?? "";
  const fallbackAgencyId = resolvedAgencyId || "agency-1";
  const isAuthorized = Boolean(
    authTokens?.accessToken && authTokens?.tokenType && resolvedAgencyId
  );

  const loadGuardsFromDb = useCallback(() => {
    try {
      const data = db.getGuardsByAgencyId(fallbackAgencyId);
      setGuards(data);
    } catch (error) {
      console.error("Ошибка загрузки охранников из локальной базы:", error);
      toast.error("Не удалось загрузить охранников");
    }
  }, [fallbackAgencyId]);

  const loadBranchesFromDb = useCallback(() => {
    try {
      const agencyData = db.getAgencyById(fallbackAgencyId);
      if (agencyData) {
        const branchesData = db
          .getBranches()
          .filter((branch) => agencyData.branches.includes(branch.id));
        setBranches(branchesData);
      } else {
        setBranches([]);
      }
    } catch (error) {
      console.error("Ошибка загрузки филиалов из локальной базы:", error);
      setBranches([]);
    }
  }, [fallbackAgencyId]);

  const loadBranches = useCallback(async () => {
    if (!isAuthorized) {
      loadBranchesFromDb();
      return;
    }

    try {
      const data = await getBranchesByAgencyId(resolvedAgencyId, {
        accessToken: authTokens!.accessToken,
        tokenType: authTokens!.tokenType,
      });
      setBranches(data);
    } catch (error) {
      console.error("Ошибка загрузки филиалов:", error);
      loadBranchesFromDb();
    }
  }, [authTokens, isAuthorized, loadBranchesFromDb, resolvedAgencyId]);

  const loadGuards = useCallback(async () => {
    if (!isAuthorized) {
      setIsLoading(true);
      loadGuardsFromDb();
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const params: GuardsApiParams = {
        page: 0,
        size: 50,
        agencyId: resolvedAgencyId,
      };

      const response = await fetchGuardsFromApi(params, {
        accessToken: authTokens!.accessToken,
        tokenType: authTokens!.tokenType,
      });

      const mapped = Array.isArray(response.items)
        ? response.items.map((item) => mapGuardFromApi(item))
        : [];

      setGuards(mapped);
    } catch (error) {
      console.error("Ошибка загрузки охранников:", error);
      const message =
        error instanceof Error ? error.message : "Не удалось загрузить охранников";
      toast.error(message);
      loadGuardsFromDb();
    } finally {
      setIsLoading(false);
    }
  }, [authTokens, isAuthorized, loadGuardsFromDb, resolvedAgencyId]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    loadGuards();
  }, [loadGuards]);

  const handleCreateOrUpdate = async (data: any) => {
    setIsSaving(true);

    const tokens =
      authTokens?.accessToken && authTokens?.tokenType
        ? { accessToken: authTokens.accessToken, tokenType: authTokens.tokenType }
        : null;

    const status = (data.status ?? editingGuard?.status ?? "active") as Guard["status"];

    try {
      if (editingGuard) {
        if (tokens && resolvedAgencyId) {
          const loginPassword = data.password || data.loginPassword;
          const updatePayload = Object.fromEntries(
            Object.entries({
              fullName: data.fullName,
              iin: data.iin,
              birthDate: data.birthDate,
              phone: data.phone,
              email: data.email,
              branchId: data.branchId,
              checkpointId: data.checkpointId,
              shiftType: data.shiftType,
              shiftStart: data.shiftStart,
              shiftEnd: data.shiftEnd,
              workDays: data.workDays,
              loginEmail: data.loginEmail,
              password: data.password ? data.password : undefined,
              loginPassword: loginPassword ? loginPassword : undefined,
              status,
              active: status === "active",
              workingDays: data.workingDays,
            }).filter(([, value]) => value !== undefined)
          ) as UpdateGuardRequest;

          await updateGuardRequest(editingGuard.id, updatePayload, tokens);
        } else {
          db.updateGuard(editingGuard.id, { ...data, status });
        }
        toast.success("Охранник успешно обновлен");
      } else {
        if (tokens && resolvedAgencyId) {
          const payload: CreateGuardRequest = {
            fullName: data.fullName,
            iin: data.iin,
            birthDate: data.birthDate,
            phone: data.phone,
            email: data.email,
            agencyId: resolvedAgencyId,
            branchId: data.branchId,
            checkpointId: data.checkpointId,
            shiftType: data.shiftType,
            shiftStart: data.shiftStart,
            shiftEnd: data.shiftEnd,
            workDays: data.workDays,
            loginEmail: data.loginEmail,
            password: data.password,
            status,
            active: status === "active",
            loginPassword: data.password || data.loginPassword,
            workingDays: data.workingDays,
          };

          await createGuardRequest(payload, tokens);
        } else {
          db.createGuard({ ...data, agencyId: fallbackAgencyId, status });
        }
        toast.success("Охранник успешно создан");
      }

      await loadGuards();
      setIsFormOpen(false);
      setEditingGuard(null);
    } catch (error) {
      console.error("Ошибка сохранения охранника:", error);
      const message =
        error instanceof Error ? error.message : "Не удалось сохранить охранника";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (guard: Guard) => {
    setEditingGuard(guard);
    setIsFormOpen(true);
  };

  const handleDelete = (guard: Guard) => {
    setDeletingGuard(guard);
  };

  const confirmDelete = async () => {
    if (!deletingGuard) return;

    try {
      if (isAuthorized) {
        await deleteGuardRequest(deletingGuard.id, {
          accessToken: authTokens!.accessToken,
          tokenType: authTokens!.tokenType,
        });
      } else {
        db.deleteGuard(deletingGuard.id);
      }

      toast.success("Охранник удален");
      await loadGuards();
    } catch (error) {
      console.error("Ошибка удаления охранника:", error);
      const message =
        error instanceof Error ? error.message : "Не удалось удалить охранника";
      toast.error(message);
    } finally {
      setDeletingGuard(null);
    }
  };

  const handleToggleStatus = async (guard: Guard) => {
    const newStatus = guard.status === "active" ? "inactive" : "active";

    try {
      if (isAuthorized) {
        await updateGuardRequest(
          guard.id,
          {
            status: newStatus,
            active: newStatus === "active",
          },
          {
            accessToken: authTokens!.accessToken,
            tokenType: authTokens!.tokenType,
          }
        );
      } else {
        db.updateGuard(guard.id, { status: newStatus });
      }

      toast.success(
        `Охранник ${newStatus === "active" ? "активирован" : "деактивирован"}`
      );
      await loadGuards();
    } catch (error) {
      console.error("Ошибка изменения статуса:", error);
      const message =
        error instanceof Error ? error.message : "Не удалось изменить статус";
      toast.error(message);
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
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Загрузка охранников...
                  </TableCell>
                </TableRow>
              ) : !sortedGuards || sortedGuards.length === 0 ? (
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
        authTokens={authTokens}
        agencyId={resolvedAgencyId || fallbackAgencyId}
        loading={isSaving}
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