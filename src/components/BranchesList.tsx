import { useEffect, useMemo, useState } from "react";
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
import { BranchFormDialog } from "./BranchFormDialog";
import { SortableTableHead } from "./SortableTableHead";
import { useSorting } from "./hooks/useSorting";
import {
  Plus,
  Search,
  Download,
  MoreVertical,
  Edit,
  Ban,
  CheckCircle,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Branch, Checkpoint, Agency } from "../types";
import { usePersistentCollection } from "../hooks/usePersistentCollection";
import { STORAGE_KEYS } from "../utils/storage";
import {
  initialBranches,
  initialCheckpoints,
  initialAgencies,
} from "../data/initialData";
import { generateId } from "../utils/id";

export function BranchesList() {
  const [branches, setBranches] = usePersistentCollection<Branch>(
    STORAGE_KEYS.branches,
    initialBranches
  );
  const [checkpoints, setCheckpoints] = usePersistentCollection<Checkpoint>(
    STORAGE_KEYS.checkpoints,
    initialCheckpoints
  );
  const [agencies, setAgencies] = usePersistentCollection<Agency>(
    STORAGE_KEYS.agencies,
    initialAgencies
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const branchNameMap = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches]
  );

  // Сортировка
  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  useEffect(() => {
    const checkpointCounts = checkpoints.reduce<Record<string, number>>(
      (acc, checkpoint) => {
        acc[checkpoint.branchId] = (acc[checkpoint.branchId] || 0) + 1;
        return acc;
      },
      {}
    );

    setBranches((prev) => {
      let changed = false;
      const updated = prev.map((branch) => {
        const count = checkpointCounts[branch.id] || 0;
        if (branch.checkpointsCount !== count) {
          changed = true;
          return { ...branch, checkpointsCount: count };
        }
        return branch;
      });

      return changed ? updated : prev;
    });
  }, [checkpoints, setBranches]);

  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      const matchesSearch =
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.phone.includes(searchQuery) ||
        branch.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || branch.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [branches, searchQuery, statusFilter]);

  const sortedBranches = sortData(filteredBranches);
  const activeBranchesCount = useMemo(
    () => branches.filter((branch) => branch.status === "active").length,
    [branches]
  );
  const totalCheckpointsCount = useMemo(
    () => checkpoints.length,
    [checkpoints]
  );

  const handleCreate = () => {
    setEditingBranch(null);
    setIsFormOpen(true);
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsFormOpen(true);
  };

  const handleSave = (data: Partial<Branch>) => {
    if (editingBranch) {
      setBranches((prev) =>
        prev.map((branch) =>
          branch.id === editingBranch.id
            ? {
                ...branch,
                ...data,
              }
            : branch
        )
      );
    } else {
      const newBranch: Branch = {
        id: generateId("branch"),
        name: data.name ?? "",
        city: data.city ?? "",
        region: data.region ?? "",
        street: data.street ?? "",
        building: data.building ?? "",
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
        phone: data.phone ?? "",
        email: data.email ?? "",
        status: data.status ?? "active",
        createdAt: new Date().toLocaleDateString("ru-RU"),
        checkpointsCount: 0,
      };
      setBranches((prev) => [...prev, newBranch]);
    }
    setIsFormOpen(false);
    setEditingBranch(null);
  };

  const handleToggleStatus = (branch: Branch) => {
    setBranches((prev) =>
      prev.map((item) =>
        item.id === branch.id
          ? { ...item, status: item.status === "active" ? "inactive" : "active" }
          : item
      )
    );
  };

  const handleDelete = (branch: Branch) => {
    if (
      window.confirm(
        `Удалить филиал «${branch.name}»? Все связанные КПП будут удалены.`
      )
    ) {
      setBranches((prev) => prev.filter((item) => item.id !== branch.id));
      setCheckpoints((prev) =>
        prev.filter((checkpoint) => checkpoint.branchId !== branch.id)
      );
      setAgencies((prev) =>
        prev.map((agency) => {
          if (!agency.branches.includes(branch.id)) {
            return agency;
          }

          const updatedBranchIds = agency.branches.filter(
            (id) => id !== branch.id
          );
          const updatedBranchNames = updatedBranchIds
            .map((id) => branchNameMap.get(id))
            .filter((name): name is string => Boolean(name));

          return {
            ...agency,
            branches: updatedBranchIds,
            branchNames: updatedBranchNames,
          };
        })
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Управление филиалами</h2>
          <p className="text-muted-foreground">
            Всего филиалов: {branches.length} • Активных: {activeBranchesCount} •
            КПП: {totalCheckpointsCount}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Экспорт .xlsx
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить филиал
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, городу, телефону, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
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
                    label="Название"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    field="city"
                    label="Адрес"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>Контакты</TableHead>
                <TableHead>
                  <SortableTableHead
                    field="checkpointsCount"
                    label="КПП"
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
              {sortedBranches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Филиалы не найдены
                  </TableCell>
                </TableRow>
              ) : (
                sortedBranches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <div>
                        <p className="text-foreground">{branch.name}</p>
                        <p className="text-muted-foreground">{branch.city}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground">
                        {branch.street}, {branch.building}
                      </p>
                      <p className="text-muted-foreground">{branch.region}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground">{branch.phone}</p>
                      <p className="text-muted-foreground">{branch.email}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-foreground">{branch.checkpointsCount}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {branch.createdAt}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={branch.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(branch)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(branch)}>
                            {branch.status === "active" ? (
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
                            onClick={() => handleDelete(branch)}
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
      {filteredBranches.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Показано {filteredBranches.length} из {branches.length}
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
      <BranchFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        branch={editingBranch}
        onSave={handleSave}
      />
    </div>
  );
}
