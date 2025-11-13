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
import { Badge } from "./ui/badge";
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
  BarChart3,
  KeyRound,
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
import {
  fetchAgencies,
  createAgency as createAgencyRequest,
  updateAgency as updateAgencyRequest,
} from "../api/agencies";
import type {
  Agency,
  AuthResponse,
  AgencyApiItem,
  UpdateAgencyRequest,
} from "../types";

interface AgenciesListProps {
  authTokens: AuthResponse | null;
}

export function AgenciesList({ authTokens }: AgenciesListProps) {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const page = 0;
  const pageSize = 25;

  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  const mapAgencyFromApi = useCallback(
    (agency: AgencyApiItem, branchNames: Map<string, string>): Agency => {
      const branchIds = Array.isArray(agency.attachedBranchIds)
        ? agency.attachedBranchIds
        : [];
      const branchNameList = branchIds.map(
        (id) => branchNames.get(id) ?? id
      );

      return {
        id: agency.id,
        name: agency.name,
        bin: agency.bin,
        director: agency.directorFullName ?? "",
        phone: agency.phone ?? "",
        email: agency.email ?? "",
        legalAddress: agency.legalAddress ?? "",
        branches: branchIds,
        branchNames: branchNameList,
        contractStart: agency.contractStart ?? "",
        contractEnd: agency.contractEnd ?? "",
        loginEmail: agency.loginEmail ?? "",
        password: "",
        status: agency.active ? "active" : "inactive",
        createdAt: agency.createdAt ?? "",
        guardsCount: agency.guardsCount ?? 0,
        version: agency.version,
        active: agency.active,
      };
    },
    []
  );

  const loadAgenciesFromDb = useCallback(() => {
    try {
      const data = db.getAgencies();
      setAgencies(data);
      setTotal(data.length);
    } catch (error) {
      console.error("Ошибка загрузки агентств из локальной базы:", error);
      toast.error("Не удалось загрузить агентства");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAgencies = useCallback(async () => {
    setIsLoading(true);

    if (!authTokens?.accessToken) {
      loadAgenciesFromDb();
      return;
    }

    try {
      const statusParam =
        statusFilter === "all"
          ? undefined
          : statusFilter === "active"
          ? true
          : statusFilter === "inactive"
          ? false
          : undefined;

      let branchNames = new Map<string, string>();
      try {
        const branches = db.getBranches ? db.getBranches() : [];
        branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
      } catch (error) {
        console.error("Ошибка получения названий филиалов:", error);
      }

      const response = await fetchAgencies(
        {
          page,
          size: pageSize,
          q: debouncedSearch || undefined,
          active: statusParam,
        },
        {
          accessToken: authTokens.accessToken,
          tokenType: authTokens.tokenType,
        }
      );

      const mapped = Array.isArray(response.items)
        ? response.items.map((item) => mapAgencyFromApi(item, branchNames))
        : [];

      setAgencies(mapped);
      setTotal(response.total ?? mapped.length);
    } catch (error) {
      console.error("Ошибка загрузки агентств:", error);
      const message =
        error instanceof Error ? error.message : "Не удалось загрузить агентства";
      toast.error(message);
      loadAgenciesFromDb();
    } finally {
      setIsLoading(false);
    }
  }, [
    authTokens,
    debouncedSearch,
    loadAgenciesFromDb,
    mapAgencyFromApi,
    page,
    pageSize,
    statusFilter,
  ]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    loadAgencies();
  }, [loadAgencies]);

  const sanitizePhoneNumber = (value: string) => value.replace(/[^+\d]/g, "");

  const handleCreateOrUpdate = async (data: any) => {
    if (!authTokens?.accessToken) {
      try {
        if (editingAgency) {
          db.updateAgency(editingAgency.id, data);
          toast.success("Агентство успешно обновлено");
        } else {
          db.createAgency(data);
          toast.success("Агентство успешно создано");
        }
        setIsFormOpen(false);
        setEditingAgency(null);
        loadAgenciesFromDb();
      } catch (error) {
        console.error("Ошибка сохранения агентства в локальной базе:", error);
        toast.error("Не удалось сохранить агентство");
      }
      return;
    }

    try {
      const commonPayload = {
        name: data.name,
        bin: data.bin,
        directorFullName: data.director,
        legalAddress: data.legalAddress,
        phone: sanitizePhoneNumber(data.phone),
        email: data.email,
        attachedBranchIds: Array.isArray(data.branches) ? data.branches : [],
        contractStart: data.contractStart,
        contractEnd: data.contractEnd,
        loginEmail: data.loginEmail,
        active: data.status === "active",
      };

      if (editingAgency) {
        const payload: UpdateAgencyRequest = {
          ...commonPayload,
          version: editingAgency.version ?? 0,
        };

        if (data.password) {
          payload.newLoginPassword = data.password;
        }

        await updateAgencyRequest(
          editingAgency.id,
          payload,
          {
            accessToken: authTokens.accessToken,
            tokenType: authTokens.tokenType,
          }
        );

        try {
          db.updateAgency(editingAgency.id, {
            ...data,
            status: data.status,
          });
        } catch (error) {
          console.warn("Не удалось обновить локальную базу агентств", error);
        }

        toast.success("Агентство успешно обновлено");
      } else {
        await createAgencyRequest(
          {
            ...commonPayload,
            loginPassword: data.password,
          },
          {
            accessToken: authTokens.accessToken,
            tokenType: authTokens.tokenType,
          }
        );

        try {
          db.createAgency({
            ...data,
            status: data.status,
          });
        } catch (error) {
          console.warn("Не удалось синхронизировать локальную базу агентств", error);
        }

        toast.success("Агентство успешно создано");
      }

      setIsFormOpen(false);
      setEditingAgency(null);
      await loadAgencies();
    } catch (error) {
      console.error("Ошибка сохранения агентства:", error);
      const message =
        error instanceof Error ? error.message : "Не удалось сохранить агентство";
      toast.error(message);
    }
  };

  const handleEdit = (agency: Agency) => {
    setEditingAgency(agency);
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (agency: Agency) => {
    const shouldActivate = agency.status !== "active";

    if (!authTokens?.accessToken) {
      try {
        db.updateAgency(agency.id, {
          status: shouldActivate ? "active" : "inactive",
        });
        toast.success(
          `Агентство ${shouldActivate ? "активировано" : "деактивировано"}`
        );
        loadAgenciesFromDb();
      } catch (error) {
        console.error("Ошибка изменения статуса в локальной базе:", error);
        toast.error("Не удалось изменить статус");
      }
      return;
    }

    try {
      await updateAgencyRequest(
        agency.id,
        {
          active: shouldActivate,
          version: agency.version ?? 0,
        },
        {
          accessToken: authTokens.accessToken,
          tokenType: authTokens.tokenType,
        }
      );

      try {
        db.updateAgency(agency.id, {
          status: shouldActivate ? "active" : "inactive",
        });
      } catch (error) {
        console.warn("Не удалось обновить локальный статус агентства", error);
      }

      toast.success(
        `Агентство ${shouldActivate ? "активировано" : "деактивировано"}`
      );
      await loadAgencies();
    } catch (error) {
      console.error("Ошибка изменения статуса агентства:", error);
      const message =
        error instanceof Error ? error.message : "Не удалось изменить статус";
      toast.error(message);
    }
  };

  const handleResetPassword = (agency: Agency) => {
    toast.success(
      `Пароль для ${agency.loginEmail} сброшен. Новый пароль отправлен на email.`
    );
  };

  const handleViewStats = (agency: Agency) => {
    alert(
      `Статистика для ${agency.name}:\n\nОхранников: ${agency.guardsCount}\nФилиалов: ${agency.branches.length}`
    );
  };

  // Фильтрация данных
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
  const activeOnPage = agencies.filter((a) => a.status === "active").length;
  const guardsOnPage = agencies.reduce(
    (sum, agency) => sum + (agency.guardsCount ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Управление агентствами</h2>
          <p className="text-muted-foreground">
            Всего агентств: {total} • На странице: {agencies.length} • Активных
            на странице: {activeOnPage} • Охранников на странице: {guardsOnPage}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Экспорт .xlsx
          </Button>
          <Button onClick={() => {
            setEditingAgency(null);
            setIsFormOpen(true);
          }}>
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
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Загрузка агентств...
                  </TableCell>
                </TableRow>
              ) : sortedAgencies.length === 0 ? (
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
                          <DropdownMenuItem
                            onClick={() => handleResetPassword(agency)}
                          >
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
      {sortedAgencies.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Показано {sortedAgencies.length} из {agencies.length}
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
        onSave={handleCreateOrUpdate}
      />
    </div>
  );
}