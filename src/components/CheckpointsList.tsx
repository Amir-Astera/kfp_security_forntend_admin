import { useState } from "react";
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
  Copy
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";

export interface Checkpoint {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  type: "entry" | "exit" | "universal";
  description?: string;
  status: "active" | "inactive";
  createdAt: string;
  guardsCount: number;
}

const mockCheckpoints: Checkpoint[] = [
  {
    id: "1",
    name: "КПП-1 (Главный въезд)",
    branchId: "1",
    branchName: "Алматы - Центральный офис",
    type: "entry",
    description: "Главные ворота для легкового транспорта",
    status: "active",
    createdAt: "15.01.2025",
    guardsCount: 2,
  },
  {
    id: "2",
    name: "КПП-2 (Грузовой въезд)",
    branchId: "1",
    branchName: "Алматы - Центральный офис",
    type: "entry",
    description: "Для грузового транспорта и поставок",
    status: "active",
    createdAt: "15.01.2025",
    guardsCount: 2,
  },
  {
    id: "3",
    name: "КПП-3 (Выезд)",
    branchId: "1",
    branchName: "Алматы - Центральный офис",
    type: "exit",
    description: "Основной выезд",
    status: "active",
    createdAt: "15.01.2025",
    guardsCount: 1,
  },
  {
    id: "4",
    name: "КПП-4 (Универсальный)",
    branchId: "1",
    branchName: "Алматы - Центральный офис",
    type: "universal",
    description: "Въезд/выезд для сотрудников",
    status: "active",
    createdAt: "20.01.2025",
    guardsCount: 2,
  },
  {
    id: "5",
    name: "КПП-1 (Главный)",
    branchId: "2",
    branchName: "Астана - Северный",
    type: "universal",
    status: "active",
    createdAt: "20.02.2025",
    guardsCount: 2,
  },
  {
    id: "6",
    name: "КПП-2 (Грузовой)",
    branchId: "2",
    branchName: "Астана - Северный",
    type: "entry",
    status: "active",
    createdAt: "20.02.2025",
    guardsCount: 1,
  },
  {
    id: "7",
    name: "КПП-1",
    branchId: "3",
    branchName: "Шымкент - Южный филиал",
    type: "universal",
    status: "active",
    createdAt: "10.03.2025",
    guardsCount: 2,
  },
  {
    id: "8",
    name: "КПП-2",
    branchId: "3",
    branchName: "Шымкент - Южный филиал",
    type: "entry",
    status: "inactive",
    createdAt: "10.03.2025",
    guardsCount: 0,
  },
];

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
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(mockCheckpoints);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);

  // Сортировка
  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  const branches = Array.from(
    new Map(checkpoints.map((c) => [c.branchId, { id: c.branchId, name: c.branchName }])).values()
  );

  const filteredCheckpoints = checkpoints.filter((checkpoint) => {
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

  const sortedCheckpoints = sortData(filteredCheckpoints);

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
      setCheckpoints(
        checkpoints.map((c) =>
          c.id === editingCheckpoint.id ? { ...c, ...data } : c
        )
      );
    } else {
      const newCheckpoint: Checkpoint = {
        id: String(checkpoints.length + 1),
        ...data as Checkpoint,
        createdAt: new Date().toLocaleDateString("ru-RU"),
        guardsCount: 0,
      };
      setCheckpoints([...checkpoints, newCheckpoint]);
    }
    setIsFormOpen(false);
    setEditingCheckpoint(null);
  };

  const handleToggleStatus = (checkpoint: Checkpoint) => {
    setCheckpoints(
      checkpoints.map((c) =>
        c.id === checkpoint.id
          ? { ...c, status: c.status === "active" ? "inactive" : "active" }
          : c
      )
    );
  };

  const handleDuplicate = (checkpoint: Checkpoint) => {
    const newCheckpoint: Checkpoint = {
      ...checkpoint,
      id: String(checkpoints.length + 1),
      name: `${checkpoint.name} (копия)`,
      createdAt: new Date().toLocaleDateString("ru-RU"),
      guardsCount: 0,
    };
    setCheckpoints([...checkpoints, newCheckpoint]);
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
              {branches.map((branch) => (
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
