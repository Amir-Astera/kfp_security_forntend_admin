import { useEffect, useMemo, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { SortableTableHead } from "./SortableTableHead";
import { useSorting } from "./hooks/useSorting";
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
import {
  Plus,
  Search,
  Download,
  MoreVertical,
  Edit,
  Ban,
  CheckCircle,
  Copy,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Checkpoint, Branch, Guard } from "../types";
import { usePersistentCollection } from "../hooks/usePersistentCollection";
import { STORAGE_KEYS } from "../utils/storage";
import {
  initialCheckpoints,
  initialBranches,
  initialGuards,
} from "../data/initialData";
import { generateId } from "../utils/id";

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

export function CheckpointsList() {
  const [checkpoints, setCheckpoints] = usePersistentCollection<Checkpoint>(
    STORAGE_KEYS.checkpoints,
    initialCheckpoints
  );
  const [branches] = usePersistentCollection<Branch>(
    STORAGE_KEYS.branches,
    initialBranches
  );
  const [guards] = usePersistentCollection<Guard>(
    STORAGE_KEYS.guards,
    initialGuards
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);

  // Сортировка
  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  const branchMap = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches]
  );

  const branchOptions = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((branch) => map.set(branch.id, branch.name));
    checkpoints.forEach((checkpoint) => {
      if (!map.has(checkpoint.branchId)) {
        map.set(checkpoint.branchId, checkpoint.branchName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [branches, checkpoints]);

  const filteredCheckpoints = useMemo(() => {
    return checkpoints.filter((checkpoint) => {
      const matchesSearch =
        checkpoint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        checkpoint.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        checkpoint.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBranch =
        branchFilter === "all" || checkpoint.branchId === branchFilter;

      const matchesType = typeFilter === "all" || checkpoint.type === typeFilter;

      const matchesStatus =
        statusFilter === "all" || checkpoint.status === statusFilter;

      return matchesSearch && matchesBranch && matchesType && matchesStatus;
    });
  }, [branchFilter, checkpoints, searchQuery, statusFilter, typeFilter]);

  const sortedCheckpoints = sortData(filteredCheckpoints);

  useEffect(() => {
    setCheckpoints((prev) => {
      let changed = false;
      const updated = prev.map((checkpoint) => {
        const branchName = branchMap.get(checkpoint.branchId);
        if (branchName && branchName !== checkpoint.branchName) {
          changed = true;
          return { ...checkpoint, branchName };
        }
        return checkpoint;
      });

      return changed ? updated : prev;
    });
  }, [branchMap, setCheckpoints]);

  useEffect(() => {
    const guardCounts = guards.reduce<Record<string, number>>((acc, guard) => {
      acc[guard.checkpointId] = (acc[guard.checkpointId] || 0) + 1;
      return acc;
    }, {});

    setCheckpoints((prev) => {
      let changed = false;
      const updated = prev.map((checkpoint) => {
        const count = guardCounts[checkpoint.id] || 0;
        if (checkpoint.guardsCount !== count) {
          changed = true;
          return { ...checkpoint, guardsCount: count };
        }
        return checkpoint;
      });

      return changed ? updated : prev;
    });
  }, [guards, setCheckpoints]);

  const handleCreate = () => {
    setEditingCheckpoint(null);
    setIsFormOpen(true);
  };

  const handleEdit = (checkpoint: Checkpoint) => {
    setEditingCheckpoint(checkpoint);
    setIsFormOpen(true);
  };

  const handleSave = (data: Partial<Checkpoint>) => {
    if (editingCheckpoint) {
      setCheckpoints((prev) =>
        prev.map((checkpoint) => {
          if (checkpoint.id !== editingCheckpoint.id) {
            return checkpoint;
          }

          const branchId = data.branchId ?? checkpoint.branchId;
          const branchName = branchMap.get(branchId) ?? checkpoint.branchName;

          return {
            ...checkpoint,
            ...data,
            branchId,
            branchName,
          };
        })
      );
    } else {
      const branchId = data.branchId ?? "";
      const newCheckpoint: Checkpoint = {
        id: generateId("checkpoint"),
        name: data.name ?? "",
        branchId,
        branchName: branchMap.get(branchId) ?? data.branchName ?? "",
        type: data.type ?? "universal",
        description: data.description,
        status: data.status ?? "active",
        createdAt: new Date().toLocaleDateString("ru-RU"),
        guardsCount: 0,
      };
      setCheckpoints((prev) => [...prev, newCheckpoint]);
    }
    setIsFormOpen(false);
    setEditingCheckpoint(null);
  };

  const handleToggleStatus = (checkpoint: Checkpoint) => {
    setCheckpoints((prev) =>
      prev.map((item) =>
        item.id === checkpoint.id
          ? { ...item, status: item.status === "active" ? "inactive" : "active" }
          : item
      )
    );
  };

  const handleDuplicate = (checkpoint: Checkpoint) => {
    const newCheckpoint: Checkpoint = {
      ...checkpoint,
      id: generateId("checkpoint"),
      name: `${checkpoint.name} (копия)`,
      createdAt: new Date().toLocaleDateString("ru-RU"),
      guardsCount: 0,
    };
    setCheckpoints((prev) => [...prev, newCheckpoint]);
  };

  const handleDelete = (checkpoint: Checkpoint) => {
    if (window.confirm(`Удалить КПП «${checkpoint.name}»?`)) {
      setCheckpoints((prev) => prev.filter((item) => item.id !== checkpoint.id));
    }
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
          <Button onClick={handleCreate}>
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
              {branchOptions.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="entry">Въезд</SelectItem>
              <SelectItem value="exit">Выезд</SelectItem>
              <SelectItem value="universal">Универсальный</SelectItem>
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
                <TableHead>
                  <SortableTableHead
                    field="type"
                    label="Тип"
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
                    colSpan={8}
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
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={typeColors[checkpoint.type]}
                      >
                        {typeLabels[checkpoint.type]}
                      </Badge>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(checkpoint)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Удалить
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
      {filteredCheckpoints.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Показано {filteredCheckpoints.length} из {checkpoints.length}
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
        onSave={handleSave}
      />
    </div>
  );
}
