import { useState } from "react";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";

export interface Agency {
  id: string;
  name: string;
  bin: string;
  director: string;
  phone: string;
  email: string;
  legalAddress: string;
  branches: string[]; // Array of branch IDs
  branchNames: string[]; // Array of branch names for display
  contractStart: string;
  contractEnd: string;
  loginEmail: string;
  status: "active" | "inactive";
  createdAt: string;
  guardsCount: number;
}

const mockAgencies: Agency[] = [
  {
    id: "1",
    name: "ТОО «Казахстан Секьюрити»",
    bin: "123456789012",
    director: "Иванов Петр Сергеевич",
    phone: "+7 727 250 1000",
    email: "info@kzsecurity.kz",
    legalAddress: "г. Алматы, ул. Абая, 120",
    branches: ["1", "2"],
    branchNames: ["Алматы - Центральный офис", "Астана - Северный"],
    contractStart: "01.01.2025",
    contractEnd: "31.12.2025",
    loginEmail: "kzsecurity@kfp.kz",
    status: "active",
    createdAt: "15.12.2023",
    guardsCount: 45,
  },
  {
    id: "2",
    name: "ТОО «Альфа-Охрана»",
    bin: "987654321098",
    director: "Смирнов Алексей Иванович",
    phone: "+7 727 250 2000",
    email: "info@alfaguard.kz",
    legalAddress: "г. Алматы, пр. Достык, 45",
    branches: ["3"],
    branchNames: ["Шымкент - Южный филиал"],
    contractStart: "15.02.2025",
    contractEnd: "14.02.2026",
    loginEmail: "alfaguard@kfp.kz",
    status: "active",
    createdAt: "01.02.2025",
    guardsCount: 28,
  },
  {
    id: "3",
    name: "АО «БезопасностьПлюс»",
    bin: "456789012345",
    director: "Касымов Нурлан Бекович",
    phone: "+7 721 056 8000",
    email: "office@securityplus.kz",
    legalAddress: "г. Караганда, ул. Ермекова, 80",
    branches: ["4", "5"],
    branchNames: ["Караганда - Промышленный", "Актобе - Западный"],
    contractStart: "01.03.2025",
    contractEnd: "28.02.2026",
    loginEmail: "securityplus@kfp.kz",
    status: "active",
    createdAt: "15.02.2025",
    guardsCount: 35,
  },
  {
    id: "4",
    name: "ТОО «ОхранаСервис»",
    bin: "111222333444",
    director: "Абдуллаев Марат Саматович",
    phone: "+7 727 250 3000",
    email: "info@guardservice.kz",
    legalAddress: "г. Алматы, ул. Жандосова, 23",
    branches: ["1"],
    branchNames: ["Алматы - Центральный офис"],
    contractStart: "10.01.2025",
    contractEnd: "09.01.2026",
    loginEmail: "guardservice@kfp.kz",
    status: "inactive",
    createdAt: "28.12.2023",
    guardsCount: 0,
  },
];

export function AgenciesList() {
  const [agencies, setAgencies] = useState<Agency[]>(mockAgencies);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);

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
      setAgencies(
        agencies.map((a) =>
          a.id === editingAgency.id ? { ...a, ...data } : a
        )
      );
    } else {
      const newAgency: Agency = {
        id: String(agencies.length + 1),
        ...data as Agency,
        createdAt: new Date().toLocaleDateString("ru-RU"),
        guardsCount: 0,
      };
      setAgencies([...agencies, newAgency]);
    }
    setIsFormOpen(false);
    setEditingAgency(null);
  };

  const handleToggleStatus = (agency: Agency) => {
    setAgencies(
      agencies.map((a) =>
        a.id === agency.id
          ? { ...a, status: a.status === "active" ? "inactive" : "active" }
          : a
      )
    );
  };

  const handleResetPassword = (agency: Agency) => {
    alert(`Пароль для ${agency.name} сброшен. Новый пароль отправлен на ${agency.loginEmail}`);
  };

  const handleViewStats = (agency: Agency) => {
    alert(`Статистика для ${agency.name}:\n\nОхранников: ${agency.guardsCount}\nФилиалов: ${agency.branches.length}`);
  };

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
