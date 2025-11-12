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
import { Badge } from "./ui/badge";
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
import { db } from "../services";
import { toast } from "sonner";
import type { Checkpoint } from "../types";

export function CheckpointsList() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);

  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  // Загрузка данных
  const loadCheckpoints = () => {
    try {
      const data = db.getCheckpoints();
      setCheckpoints(data);
    } catch (error) {
      console.error("Ошибка загрузки КПП:", error);
      toast.error("Не удалось загрузить КПП");
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

  useEffect(() => {
    loadCheckpoints();
    loadBranches();
  }, []);

  const handleCreateOrUpdate = (data: any) => {
    try {
      if (editingCheckpoint) {
        db.updateCheckpoint(editingCheckpoint.id, data);
        toast.success("КПП успешно обновлен");
      } else {
        db.createCheckpoint(data);
        toast.success("КПП успешно создан");
      }
      loadCheckpoints();
      setIsFormOpen(false);
      setEditingCheckpoint(null);
    } catch (error) {
      console.error("Ошибка сохранения КПП:", error);
      toast.error("Не удалось сохранить КПП");
    }
  };

  const handleEdit = (checkpoint: Checkpoint) => {
    setEditingCheckpoint(checkpoint);
    setIsFormOpen(true);
  };

  const handleToggleStatus = (checkpoint: Checkpoint) => {
    try {
      const newStatus = checkpoint.status === "active" ? "inactive" : "active";
      db.updateCheckpoint(checkpoint.id, { status: newStatus });
      toast.success(
        `КПП ${newStatus === "active" ? "активирован" : "деактивирован"}`
      );
      loadCheckpoints();
    } catch (error) {
      console.error("Ошибка изменения статуса:", error);
      toast.error("Не удалось изменить статус");
    }
  };

  const handleDuplicate = (checkpoint: Checkpoint) => {
    try {
      db.createCheckpoint({
        name: `${checkpoint.name} (копия)`,
        branchId: checkpoint.branchId,
        type: checkpoint.type,
        description: checkpoint.description,
        status: checkpoint.status,
      });
      toast.success("КПП успешно дублирован");
      loadCheckpoints();
    } catch (error) {
      console.error("Ошибка дублирования КПП:", error);
      toast.error("Не удалось дублировать КПП");
    }
  };

  const filteredCheckpoints = checkpoints.filter((checkpoint) => {
    const matchesSearch =
      checkpoint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      checkpoint.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      checkpoint.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch =
      branchFilter === "all" || checkpoint.branchId === branchFilter;

    const matchesStatus =
      statusFilter === "all" || checkpoint.status === statusFilter;

    return matchesSearch && matchesBranch && matchesStatus;
  });

  const sortedCheckpoints = sortData(filteredCheckpoints);

  const typeLabels = {
    entry: "Въезд",
    exit: "Выезд",
    universal: "Универсальный",
  };

  const typeColors = {
    entry: "bg-info/10 text-info border-info/20",
    exit: "bg-warning/10 text-warning border-warning/20",
    universal: "bg-success/10 text-success border-success/20",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Управление КПП</h2>
          <p className="text-muted-foreground">
            Всего КПП: {checkpoints.length} • Активных:{" "}
            {checkpoints.filter((c) => c.status === "active").length}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Экспорт .xlsx
          </Button>
          <Button onClick={() => {
            setEditingCheckpoint(null);
            setIsFormOpen(true);
          }}>
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
              {sortedCheckpoints.length === 0 ? (
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
            Показано {sortedCheckpoints.length} из {checkpoints.length}
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
      />
    </div>
  );
}