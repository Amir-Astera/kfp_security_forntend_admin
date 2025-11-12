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
import { VisitDetailDialog } from "./VisitDetailDialog";
import { VisitFormDialog } from "./VisitFormDialog";
import { SortableTableHead } from "./SortableTableHead";
import { Search, Download, Eye, Filter, Calendar, Clock, Truck, User, LogOut, Plus } from "lucide-react";
import { Badge } from "./ui/badge";
import { Visit } from "../types";
import { db } from "../services";
import { toast } from "sonner@2.0.3";
import { useSorting } from "./hooks/useSorting";
import { exportVisits } from "../utils/export";

export function VisitsList() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  
  // Фильтры
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [checkpointFilter, setCheckpointFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [purposeFilter, setPurposeFilter] = useState<string>("all");

  // Сортировка
  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  // Загрузка данных
  useEffect(() => {
    loadVisits();
    loadBranches();
    loadCheckpoints();
  }, []);

  const loadVisits = () => {
    try {
      const data = db.getVisits();
      setVisits(data);
    } catch (error) {
      console.error('Ошибка загрузки визитов:', error);
      toast.error('Не удалось загрузить визиты');
    }
  };

  const loadBranches = () => {
    try {
      const data = db.getBranches();
      setBranches(data);
    } catch (error) {
      console.error('Ошибка загрузки филиалов:', error);
    }
  };

  const loadCheckpoints = () => {
    try {
      const data = db.getCheckpoints();
      setCheckpoints(data);
    } catch (error) {
      console.error('Ошибка загрузки КПП:', error);
    }
  };

  const handleCreateOrUpdate = (data: any) => {
    try {
      if (editingVisit) {
        db.updateVisit(editingVisit.id, data);
        toast.success('Визит успешно обновлен');
      } else {
        db.createVisit(data);
        toast.success('Визит успешно зарегистрирован');
      }
      loadVisits();
      setFormDialogOpen(false);
      setEditingVisit(null);
    } catch (error) {
      console.error('Ошибка сохранения визита:', error);
      toast.error('Не удалось сохранить визит');
    }
  };

  const handleCheckout = (visit: Visit) => {
    try {
      const exitTime = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
      db.updateVisit(visit.id, { 
        status: 'left',
        exitTime 
      });
      toast.success(`Визитор ${visit.fullName} выписан в ${exitTime}`);
      loadVisits();
    } catch (error) {
      console.error('Ошибка выписки визита:', error);
      toast.error('Не удалось выписать визитора');
    }
  };

  const handleViewDetails = (visit: Visit) => {
    setSelectedVisit(visit);
    setDetailDialogOpen(true);
  };

  const handleExport = () => {
    exportVisits(visits);
  };

  const purposes = [
    "Деловая встреча",
    "Поставка товаров",
    "Обслуживание",
    "Совещание",
    "Инспекция",
    "Ремонтные работы",
    "Прочее",
  ];

  // Фильтрация
  const filteredVisits = visits.filter((visit) => {
    const matchesSearch =
      visit.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.iin?.includes(searchQuery) ||
      visit.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.phone?.includes(searchQuery) ||
      visit.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch = branchFilter === "all" || visit.branchId === branchFilter;
    const matchesCheckpoint = checkpointFilter === "all" || visit.checkpointId === checkpointFilter;
    const matchesStatus = statusFilter === "all" || visit.status === statusFilter;
    const matchesVehicle =
      vehicleFilter === "all" ||
      (vehicleFilter === "yes" && visit.hasVehicle) ||
      (vehicleFilter === "no" && !visit.hasVehicle);
    const matchesPurpose = purposeFilter === "all" || visit.purpose === purposeFilter;

    return (
      matchesSearch &&
      matchesBranch &&
      matchesCheckpoint &&
      matchesStatus &&
      matchesVehicle &&
      matchesPurpose
    );
  });

  const sortedVisits = sortData(filteredVisits);

  const onSiteCount = visits.filter((v) => v.status === "on-site").length;
  const vehicleCount = visits.filter((v) => v.hasVehicle).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Реестр визитов</h2>
          <p className="text-muted-foreground">
            Всего визитов: {visits.length} • На территории: {onSiteCount} • С
            транспортом: {vehicleCount}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Экспорт .xlsx
          </Button>
          <Button variant="outline" onClick={() => setFormDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить визит
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по ФИО, ИИН, компании, телефону, гос. номеру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-5 gap-3">
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Филиал" />
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

            <Select
              value={checkpointFilter}
              onValueChange={setCheckpointFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="КПП" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все КПП</SelectItem>
                {checkpoints.map((checkpoint) => (
                  <SelectItem key={checkpoint.id} value={checkpoint.id}>
                    {checkpoint.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="on-site">На территории</SelectItem>
                <SelectItem value="left">Покинул</SelectItem>
              </SelectContent>
            </Select>

            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Транспорт" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="yes">С транспортом</SelectItem>
                <SelectItem value="no">Без транспорта</SelectItem>
              </SelectContent>
            </Select>

            <Select value={purposeFilter} onValueChange={setPurposeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Цель" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все цели</SelectItem>
                {purposes.map((purpose) => (
                  <SelectItem key={purpose} value={purpose}>
                    {purpose}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="border rounded-lg">
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="group">
                  <TableHead className="whitespace-nowrap">
                    <SortableTableHead
                      field="entryTime"
                      label="Время въезда"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    <SortableTableHead
                      field="fullName"
                      label="ФИО / Компания"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">ИИН / Телефон</TableHead>
                  <TableHead className="whitespace-nowrap">
                    <SortableTableHead
                      field="branchName"
                      label="Филиал / КПП"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Места посещения</TableHead>
                  <TableHead className="whitespace-nowrap">
                    <SortableTableHead
                      field="purpose"
                      label="Цель визита"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Транспорт</TableHead>
                  <TableHead className="whitespace-nowrap">Тип груза</TableHead>
                  <TableHead className="whitespace-nowrap">Тех. паспорт</TableHead>
                  <TableHead className="whitespace-nowrap">ТТН</TableHead>
                  <TableHead className="whitespace-nowrap">Охранник / Агентство</TableHead>
                  <TableHead className="whitespace-nowrap">Время на территории</TableHead>
                  <TableHead className="whitespace-nowrap">
                    <SortableTableHead
                      field="status"
                      label="Статус"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-[100px] whitespace-nowrap">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!sortedVisits || sortedVisits.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={14}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Визиты не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedVisits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-foreground">{visit.entryTime}</p>
                            {visit.exitTime && (
                              <p className="text-muted-foreground">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {visit.exitTime}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-foreground">{visit.fullName}</p>
                          <p className="text-muted-foreground">{visit.company}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-foreground">{visit.iin}</p>
                          <p className="text-muted-foreground">{visit.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-foreground">{visit.branchName}</p>
                          <p className="text-muted-foreground">
                            {visit.checkpointName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {visit.places && visit.places.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {visit.places.slice(0, 2).map((place, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {place}
                              </Badge>
                            ))}
                            {visit.places.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{visit.places.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{visit.purpose}</Badge>
                      </TableCell>
                      <TableCell>
                        {visit.hasVehicle ? (
                          <div className="flex items-start gap-2">
                            <Truck className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
                            <span className="text-foreground">
                              {visit.vehicleNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-2">
                            <User className="w-4 h-4 flex-shrink-0" />
                            Пешком
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {visit.cargoType ? (
                          <span className="text-foreground">{visit.cargoType}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {visit.techPassport ? (
                          <span className="text-foreground text-sm">{visit.techPassport}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {visit.ttn ? (
                          <span className="text-foreground text-sm">{visit.ttn}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-foreground">{visit.guardName}</p>
                          <p className="text-muted-foreground text-xs">{visit.agencyName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {visit.timeOnSite ? (
                          <span className="text-foreground">{visit.timeOnSite}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={visit.status === "on-site" ? "active" : "inactive"}
                          activeLabel="На территории"
                          inactiveLabel="Покинул"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(visit)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {visit.status === "on-site" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCheckout(visit)}
                              title="Зарегистрировать выход"
                            >
                              <LogOut className="w-4 h-4 text-warning" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Pagination */}
      {visits.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Показано {visits.length} визитов
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

      {/* Detail Dialog */}
      <VisitDetailDialog
        visit={selectedVisit}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onCheckout={handleCheckout}
      />

      {/* Form Dialog */}
      <VisitFormDialog
        visit={editingVisit}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onCreateOrUpdate={handleCreateOrUpdate}
      />
    </div>
  );
}