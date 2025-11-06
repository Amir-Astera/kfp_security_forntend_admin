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
import { AgencyFormDialog } from "./AgencyFormDialog";
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
  KeyRound,
  BarChart3,
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
import { Agency, Branch, Guard } from "../types";
import { usePersistentCollection } from "../hooks/usePersistentCollection";
import { STORAGE_KEYS } from "../utils/storage";
import {
  initialAgencies,
  initialBranches,
  initialGuards,
} from "../data/initialData";
import { generateId } from "../utils/id";

export function AgenciesList() {
  const [agencies, setAgencies] = usePersistentCollection<Agency>(
    STORAGE_KEYS.agencies,
    initialAgencies
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);

  const branchNameMap = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches]
  );

  useEffect(() => {
    const guardCounts = guards.reduce<Record<string, number>>((acc, guard) => {
      acc[guard.agencyId] = (acc[guard.agencyId] || 0) + 1;
      return acc;
    }, {});

    setAgencies((prev) => {
      let changed = false;
      const updated = prev.map((agency) => {
        const guardCount = guardCounts[agency.id] || 0;
        const branchNames = agency.branches
          .map((id) => branchNameMap.get(id))
          .filter((name): name is string => Boolean(name));

        const branchNamesChanged =
          branchNames.length !== agency.branchNames.length ||
          branchNames.some((name, index) => name !== agency.branchNames[index]);

        if (agency.guardsCount !== guardCount || branchNamesChanged) {
          changed = true;
          return {
            ...agency,
            guardsCount: guardCount,
            branchNames,
          };
        }

        return agency;
      });

      return changed ? updated : prev;
    });
  }, [branchNameMap, guards, setAgencies]);

  // Сортировка
  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  const filteredAgencies = agencies.filter((agency) => {
    const matchesSearch =
      agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agency.bin.includes(searchQuery) ||
      agency.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agency.phone.includes(searchQuery) ||
      agency.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || agency.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedAgencies = sortData(filteredAgencies);
  const activeAgenciesCount = useMemo(
    () => agencies.filter((agency) => agency.status === "active").length,
    [agencies]
  );
  const totalGuardsCount = useMemo(() => guards.length, [guards]);

  const handleCreate = () => {
    setEditingAgency(null);
    setIsFormOpen(true);
  };

  const handleEdit = (agency: Agency) => {
    setEditingAgency(agency);
    setIsFormOpen(true);
  };

  const handleSave = (data: Partial<Agency>) => {
    if (editingAgency) {
      setAgencies((prev) =>
        prev.map((agency) => {
          if (agency.id !== editingAgency.id) {
            return agency;
          }

          const updatedBranches = data.branches ?? agency.branches;
          const updatedBranchNames = updatedBranches
            .map((id) => branchNameMap.get(id))
            .filter((name): name is string => Boolean(name));

          return {
            ...agency,
            ...data,
            branches: updatedBranches,
            branchNames: updatedBranchNames,
          };
        })
      );
    } else {
      const branchIds = data.branches ?? [];
      const branchNames = branchIds
        .map((id) => branchNameMap.get(id))
        .filter((name): name is string => Boolean(name));

      const newAgency: Agency = {
        id: generateId("agency"),
        name: data.name ?? "",
        bin: data.bin ?? "",
        director: data.director ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        legalAddress: data.legalAddress ?? "",
        branches: branchIds,
        branchNames,
        contractStart: data.contractStart ?? new Date().toLocaleDateString("ru-RU"),
        contractEnd: data.contractEnd ?? new Date().toLocaleDateString("ru-RU"),
        loginEmail: data.loginEmail ?? "",
        status: data.status ?? "active",
        createdAt: new Date().toLocaleDateString("ru-RU"),
        guardsCount: 0,
      };

      setAgencies((prev) => [...prev, newAgency]);
    }
    setIsFormOpen(false);
    setEditingAgency(null);
  };

  const handleToggleStatus = (agency: Agency) => {
    setAgencies((prev) =>
      prev.map((item) =>
        item.id === agency.id
          ? { ...item, status: item.status === "active" ? "inactive" : "active" }
          : item
      )
    );
  };

  const handleResetPassword = (agency: Agency) => {
    alert(`Пароль для ${agency.name} сброшен. Новый пароль отправлен на ${agency.loginEmail}`);
  };

  const handleViewStats = (agency: Agency) => {
    alert(`Статистика для ${agency.name}:\n\nОхранников: ${agency.guardsCount}\nФилиалов: ${agency.branches.length}`);
  };

  const handleDelete = (agency: Agency) => {
    if (
      window.confirm(
        `Удалить агентство «${agency.name}»? Связанные охранники останутся в системе.`
      )
    ) {
      setAgencies((prev) => prev.filter((item) => item.id !== agency.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Управление агентствами</h2>
          <p className="text-muted-foreground">
            Всего агентств: {agencies.length} • Активных: {activeAgenciesCount} •
            Охранников: {totalGuardsCount}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Экспорт .xlsx
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить агентство
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, БИН, директору, телефону, email..."
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
                    field="bin"
                    label="БИН"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    field="director"
                    label="Директор"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>Контакты</TableHead>
                <TableHead>Филиалы</TableHead>
                <TableHead>
                  <SortableTableHead
                    field="contractEnd"
                    label="Контракт"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
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
              {sortedAgencies.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Агентства не найдены
                  </TableCell>
                </TableRow>
              ) : (
                sortedAgencies.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell>
                      <div>
                        <p className="text-foreground">{agency.name}</p>
                        <p className="text-muted-foreground">{agency.loginEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {agency.bin}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {agency.director}
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground">{agency.phone}</p>
                      <p className="text-muted-foreground">{agency.email}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {agency.branchNames.map((branch, idx) => (
                          <Badge key={idx} variant="outline">
                            {branch}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground">
                        {agency.contractStart}
                      </p>
                      <p className="text-muted-foreground">
                        до {agency.contractEnd}
                      </p>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {agency.guardsCount}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={agency.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(agency)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewStats(agency)}>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Статистика
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleResetPassword(agency)}>
                            <KeyRound className="w-4 h-4 mr-2" />
                            Сбросить пароль
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(agency)}
                          >
                            {agency.status === "active" ? (
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
                            onClick={() => handleDelete(agency)}
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
      {filteredAgencies.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Показано {filteredAgencies.length} из {agencies.length}
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
      <AgencyFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        agency={editingAgency}
        onSave={handleSave}
      />
    </div>
  );
}
