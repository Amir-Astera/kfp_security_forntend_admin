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
import type { Agency } from "../types";

export function AgenciesList() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);

  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  // Загрузка данных
  const loadAgencies = () => {
    try {
      const data = db.getAgencies();
      setAgencies(data);
    } catch (error) {
      console.error("Ошибка загрузки агентств:", error);
      toast.error("Не удалось загрузить агентства");
    }
  };

  useEffect(() => {
    loadAgencies();
  }, []);

  const handleCreateOrUpdate = (data: any) => {
    try {
      if (editingAgency) {
        db.updateAgency(editingAgency.id, data);
        toast.success("Агентство успешно обновлено");
      } else {
        db.createAgency(data);
        toast.success("Агентство успешно создано");
      }
      loadAgencies();
      setIsFormOpen(false);
      setEditingAgency(null);
    } catch (error) {
      console.error("Ошибка сохранения агентства:", error);
      toast.error("Не удалось сохранить агентство");
    }
  };

  const handleEdit = (agency: Agency) => {
    setEditingAgency(agency);
    setIsFormOpen(true);
  };

  const handleToggleStatus = (agency: Agency) => {
    try {
      const newStatus = agency.status === "active" ? "inactive" : "active";
      db.updateAgency(agency.id, { status: newStatus });
      toast.success(
        `Агентство ${newStatus === "active" ? "активировано" : "деактивировано"}`
      );
      loadAgencies();
    } catch (error) {
      console.error("Ошибка изменения статуса:", error);
      toast.error("Не удалось изменить статус");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Управление агентствами</h2>
          <p className="text-muted-foreground">
            Всего агентств: {agencies.length} • Активных:{" "}
            {agencies.filter((a) => a.status === "active").length} • Охранников:{" "}
            {agencies.reduce((sum, a) => sum + a.guardsCount, 0)}
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
              {!sortedAgencies || sortedAgencies.length === 0 ? (
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