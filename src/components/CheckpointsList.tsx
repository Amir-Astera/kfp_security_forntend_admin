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
import { CheckpointFormDialog } from "./CheckpointFormDialog";
import { SortableTableHead } from "./SortableTableHead";
import { useSorting } from "./hooks/useSorting";
import {
  Plus,
  Search,
  Download,
  MoreVertical,
  Edit,
  Copy,
  Ban,
  CheckCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";
import { getBranches as getBranchesRequest } from "../api/branches";
import {
  createCheckpoint as createCheckpointRequest,
  getCheckpoints as getCheckpointsRequest,
  updateCheckpoint as updateCheckpointRequest,
} from "../api/checkpoints";
import type { Checkpoint, AuthResponse } from "../types";
import type { CheckpointFormValues } from "./CheckpointFormDialog";
import type { CheckpointApiItem } from "../api/checkpoints";

interface CheckpointsListProps {
  authTokens: AuthResponse | null;
}

export function CheckpointsList({ authTokens }: CheckpointsListProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({ page: 0, size: 25, total: 0 });

  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  const formatDate = (value?: string) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("ru-RU");
  };

  const mapCheckpointFromApi = (
    item: CheckpointApiItem,
    branchMap: Map<string, string>
  ): Checkpoint => ({
    id: item.id,
    name: item.name,
    branchId: item.branchId,
    branchName: branchMap.get(item.branchId) ?? "—",
    type: "universal",
    description: item.description ?? "",
    status: item.active ? "active" : "inactive",
    createdAt: formatDate(item.createdAt),
    guardsCount: 0,
    active: item.active,
    updatedAt: item.updatedAt,
    version: item.version,
  });

  const refreshData = async () => {
    if (!authTokens?.accessToken) {
      return;
    }

    setIsLoading(true);
    try {
      const tokens = {
        accessToken: authTokens.accessToken,
        tokenType: authTokens.tokenType,
      } as const;

      const [branchesResponse, checkpointsResponse] = await Promise.all([
        getBranchesRequest(tokens, { page: 0, size: 100 }),
        getCheckpointsRequest(tokens, { page: 0, size: 100 }),
      ]);

      const branchOptions = branchesResponse.items.map((branch) => ({
        id: branch.id,
        name: branch.name,
      }));

      setBranches(branchOptions);

      const branchMap = new Map(branchOptions.map((branch) => [branch.id, branch.name]));
      setCheckpoints(
        checkpointsResponse.items.map((item) => mapCheckpointFromApi(item, branchMap))
      );
      setPagination({
        page: checkpointsResponse.page,
        size: checkpointsResponse.size,
        total: checkpointsResponse.total,
      });
    } catch (error) {
      console.error("Ошибка загрузки КПП:", error);
      toast.error(error instanceof Error ? error.message : "Не удалось загрузить КПП");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authTokens?.accessToken) {
      setCheckpoints([]);
      setBranches([]);
      return;
    }

    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authTokens?.accessToken, authTokens?.tokenType]);

  const handleCreateOrUpdate = async (data: CheckpointFormValues) => {
    if (!authTokens?.accessToken) {
      toast.error("Для сохранения КПП необходимо выполнить вход");
      return;
    }

    try {
      setIsSaving(true);
      const tokens = {
        accessToken: authTokens.accessToken,
        tokenType: authTokens.tokenType,
      } as const;

      if (editingCheckpoint) {
        if (typeof editingCheckpoint.version !== "number") {
          toast.error("Не удалось определить версию КПП для обновления");
          return;
        }

        await updateCheckpointRequest(
          editingCheckpoint.id,
          {
            name: data.name,
            description: data.description ?? "",
            active: data.status === "active",
            version: editingCheckpoint.version,
          },
          tokens
        );
        toast.success("КПП успешно обновлен");
      } else {
        await createCheckpointRequest(
          {
            branchId: data.branchId,
            name: data.name,
            description: data.description ?? "",
            active: data.status === "active",
          },
          tokens
        );
        toast.success("КПП успешно создан");
      }

      setIsFormOpen(false);
      setEditingCheckpoint(null);
      await refreshData();
    } catch (error) {
      console.error("Ошибка сохранения КПП:", error);
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить КПП");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (checkpoint: Checkpoint) => {
    setEditingCheckpoint(checkpoint);
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (checkpoint: Checkpoint) => {
    if (!authTokens?.accessToken) {
      toast.error("Для изменения статуса необходимо выполнить вход");
      return;
    }

    if (typeof checkpoint.version !== "number") {
      toast.error("Не удалось определить версию КПП для изменения статуса");
      return;
    }

    try {
      const tokens = {
        accessToken: authTokens.accessToken,
        tokenType: authTokens.tokenType,
      } as const;
      const newStatus = checkpoint.status === "active" ? "inactive" : "active";

      await updateCheckpointRequest(
        checkpoint.id,
        {
          name: checkpoint.name,
          description: checkpoint.description ?? "",
          active: newStatus === "active",
          version: checkpoint.version,
        },
        tokens
      );

      toast.success(
        `КПП ${newStatus === "active" ? "активирован" : "деактивирован"}`
      );
      await refreshData();
    } catch (error) {
      console.error("Ошибка изменения статуса:", error);
      toast.error("Не удалось изменить статус");
    }
  };

  const handleDuplicate = async (checkpoint: Checkpoint) => {
    if (!authTokens?.accessToken) {
      toast.error("Для дублирования необходимо выполнить вход");
      return;
    }

    try {
      const tokens = {
        accessToken: authTokens.accessToken,
        tokenType: authTokens.tokenType,
      } as const;

      await createCheckpointRequest(
        {
          branchId: checkpoint.branchId,
          name: `${checkpoint.name} (копия)`,
          description: checkpoint.description ?? "",
          active: checkpoint.status === "active",
        },
        tokens
      );

      toast.success("КПП успешно дублирован");
      await refreshData();
    } catch (error) {
      console.error("Ошибка дублирования КПП:", error);
      toast.error("Не удалось дублировать КПП");
    }
  };

  const filteredCheckpoints = checkpoints.filter((checkpoint) => {
    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch =
      checkpoint.name.toLowerCase().includes(normalizedQuery) ||
      checkpoint.branchName.toLowerCase().includes(normalizedQuery) ||
      (checkpoint.description || "").toLowerCase().includes(normalizedQuery);

    const matchesBranch =
      branchFilter === "all" || checkpoint.branchId === branchFilter;

    const matchesStatus =
      statusFilter === "all" || checkpoint.status === statusFilter;

    return matchesSearch && matchesBranch && matchesStatus;
  });

  const sortedCheckpoints = sortData(filteredCheckpoints);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Управление КПП</h2>
          <p className="text-muted-foreground">
            Всего КПП: {pagination.total || checkpoints.length} • Активных:{" "}
            {checkpoints.filter((c) => c.status === "active").length}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Экспорт .xlsx
          </Button>
          <Button
            onClick={() => {
              if (!authTokens?.accessToken) {
                toast.error("Для создания КПП необходимо выполнить вход");
                return;
              }

              if (branches.length === 0) {
                toast.error("Сначала создайте хотя бы один филиал");
                return;
              }

              setEditingCheckpoint(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить КПП
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, филиалу, описанию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Все филиалы" />
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="inactive">Неактивные</SelectItem>
            </SelectContent>
          </Select>
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
                    field="name"
                    label="Название КПП"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    field="branchName"
                    label="Филиал"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>
                  <SortableTableHead
                    field="guardsCount"
                    label="Охранники"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    field="createdAt"
                    label="Дата создания"
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
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Загрузка данных...
                  </TableCell>
                </TableRow>
              ) : sortedCheckpoints.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    КПП не найдены
                  </TableCell>
                </TableRow>
              ) : (
                sortedCheckpoints.map((checkpoint) => (
                  <TableRow key={checkpoint.id}>
                    <TableCell className="text-foreground">
                      {checkpoint.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {checkpoint.branchName}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[250px]">
                      {checkpoint.description || "—"}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {checkpoint.guardsCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {checkpoint.createdAt}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={checkpoint.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(checkpoint)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(checkpoint)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Дублировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(checkpoint)}
                          >
                            {checkpoint.status === "active" ? (
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
      {sortedCheckpoints.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Показано {sortedCheckpoints.length} из {pagination.total || checkpoints.length}
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

      {/* Form Dialog */}
      <CheckpointFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        checkpoint={editingCheckpoint}
        onSave={handleCreateOrUpdate}
        branches={branches}
        isSubmitting={isSaving}
      />
    </div>
  );
}