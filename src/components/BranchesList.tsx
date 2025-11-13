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
  CheckCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";
import {
  createBranch as createBranchRequest,
  getBranches as getBranchesRequest,
  updateBranch as updateBranchRequest,
} from "../api/branches";
import type { Branch, AuthResponse } from "../types";
import type { BranchFormValues } from "./BranchFormDialog";

interface BranchesListProps {
  authTokens: AuthResponse | null;
}

export function BranchesList({ authTokens }: BranchesListProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  const toNumberOrNull = (value?: string | number | null) => {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const sanitizePhoneNumber = (value: string) => value.replace(/[^+\d]/g, "");

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

  const mapBranchFromApi = (branch: any): Branch => ({
    id: branch.id,
    name: branch.name,
    city: branch.city ?? "",
    region: branch.region ?? "",
    street: branch.street ?? "",
    building: branch.house ?? branch.building ?? "",
    latitude:
      branch.latitude !== undefined && branch.latitude !== null
        ? String(branch.latitude)
        : "",
    longitude:
      branch.longitude !== undefined && branch.longitude !== null
        ? String(branch.longitude)
        : "",
    phone: branch.phone ?? "",
    email: branch.email ?? "",
    status: branch.active ? "active" : "inactive",
    createdAt: formatDate(branch.createdAt),
    checkpointsCount: branch.checkpointsCount ?? 0,
    active: branch.active,
    house: branch.house,
    updatedAt: branch.updatedAt,
    version: branch.version,
  });

  const loadBranches = async () => {
    if (!authTokens?.accessToken) {
      setBranches([]);
      return;
    }

    try {
      const response = await getBranchesRequest(
        {
          accessToken: authTokens.accessToken,
          tokenType: authTokens.tokenType,
        },
        { page: 0, size: 100 }
      );

      setBranches(response.items.map(mapBranchFromApi));
    } catch (error) {
      console.error('Ошибка загрузки филиалов:', error);
      toast.error(
        error instanceof Error ? error.message : 'Не удалось загрузить филиалы'
      );
    }
  };

  useEffect(() => {
    loadBranches();
  }, [authTokens?.accessToken, authTokens?.tokenType]);

  const handleCreateOrUpdate = async (data: BranchFormValues) => {
    try {
      if (!authTokens?.accessToken) {
        toast.error('Для работы с филиалами необходимо выполнить вход');
        return;
      }

      if (editingBranch) {
        await updateBranchRequest(
          editingBranch.id,
          {
            name: data.name,
            city: data.city,
            region: data.region,
            street: data.street,
            house: data.building,
            latitude: toNumberOrNull(data.latitude),
            longitude: toNumberOrNull(data.longitude),
            phone: sanitizePhoneNumber(data.phone),
            email: data.email,
            active: data.status === 'active',
          },
          {
            accessToken: authTokens.accessToken,
            tokenType: authTokens.tokenType,
          }
        );
        toast.success('Филиал успешно обновлен');
      } else {
        await createBranchRequest(
          {
            name: data.name,
            city: data.city,
            region: data.region,
            street: data.street,
            house: data.building,
            latitude: toNumberOrNull(data.latitude),
            longitude: toNumberOrNull(data.longitude),
            phone: sanitizePhoneNumber(data.phone),
            email: data.email,
            active: data.status === 'active',
          },
          {
            accessToken: authTokens.accessToken,
            tokenType: authTokens.tokenType,
          }
        );
        toast.success('Филиал успешно создан');
      }
      loadBranches();
      setIsFormOpen(false);
      setEditingBranch(null);
    } catch (error) {
      console.error('Ошибка сохранения филиала:', error);
      const message =
        error instanceof Error ? error.message : 'Не удалось сохранить филиал';
      toast.error(message);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (branch: Branch) => {
    try {
      if (!authTokens?.accessToken) {
        toast.error('Для изменения статуса необходимо выполнить вход');
        return;
      }

      const newStatus = branch.status === 'active' ? 'inactive' : 'active';

      await updateBranchRequest(
        branch.id,
        {
          name: branch.name,
          city: branch.city,
          region: branch.region,
          street: branch.street,
          house: branch.building,
          latitude: toNumberOrNull(branch.latitude),
          longitude: toNumberOrNull(branch.longitude),
          phone: sanitizePhoneNumber(branch.phone),
          email: branch.email,
          active: newStatus === 'active',
        },
        {
          accessToken: authTokens.accessToken,
          tokenType: authTokens.tokenType,
        }
      );

      toast.success(`Филиал ${newStatus === 'active' ? 'активирован' : 'деактивирован'}`);
      loadBranches();
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
      toast.error('Не удалось изменить статус');
    }
  };

  const filteredBranches = branches.filter((branch) => {
    const matchesSearch = 
      branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.phone.includes(searchQuery) ||
      branch.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || branch.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedBranches = sortData(filteredBranches);

  const handleCreate = () => {
    setEditingBranch(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Управление филиалами</h2>
          <p className="text-muted-foreground">
            Всего филиалов: {branches.length} • Активных: {branches.filter(b => b.status === "active").length}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Экспорт .xlsx
          </Button>
          <Button onClick={() => {
            setEditingBranch(null);
            setIsFormOpen(true);
          }}>
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
              {!sortedBranches || sortedBranches.length === 0 ? (
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
        onSave={handleCreateOrUpdate}
      />
    </div>
  );
}