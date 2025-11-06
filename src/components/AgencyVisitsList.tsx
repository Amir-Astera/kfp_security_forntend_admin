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
import {
  Search,
  Download,
  Eye,
  Calendar,
  Clock,
  Truck,
  User,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Visit, VisitFilters } from "../types";
import { getVisits, exportVisits } from "../api/visits";
import { toast } from "sonner@2.0.3";
import { SortableTableHead } from "./SortableTableHead";
import { useSorting } from "./hooks/useSorting";

export function AgencyVisitsList() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Фильтры
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [guardFilter, setGuardFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");

  // Сортировка
  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  useEffect(() => {
    loadVisits();
  }, [searchQuery, branchFilter, guardFilter, statusFilter, vehicleFilter]);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const filters: VisitFilters = {
        search: searchQuery || undefined,
        branchId: branchFilter !== "all" ? branchFilter : undefined,
        status: statusFilter !== "all" ? (statusFilter as "on-site" | "left") : undefined,
        hasVehicle: vehicleFilter === "yes" ? true : vehicleFilter === "no" ? false : undefined,
        // В реальном API здесь будет фильтр по агентству текущего пользователя
        agencyId: "1", // Mock: только визиты агентства
      };

      const response = await getVisits(filters);
      
      // Дополнительная фильтрация по охраннику (на клиенте, в реальном API на бэкенде)
      let filteredVisits = response.items;
      if (guardFilter !== "all") {
        filteredVisits = filteredVisits.filter(v => v.guardId === guardFilter);
      }

      setVisits(filteredVisits);
    } catch (error) {
      toast.error("Ошибка загрузки визитов");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (visit: Visit) => {
    setSelectedVisit(visit);
    setDetailDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const url = await exportVisits({
        search: searchQuery || undefined,
        branchId: branchFilter !== "all" ? branchFilter : undefined,
        agencyId: "1",
      });
      toast.success("Экспорт успешно выполнен");
      console.log("Export URL:", url);
    } catch (error) {
      toast.error("Ошибка экспорта");
    }
  };

  const branches = Array.from(
    new Map(visits.map((v) => [v.branchId, { id: v.branchId, name: v.branchName }])).values()
  );

  const guards = Array.from(
    new Map(visits.map((v) => [v.guardId, { id: v.guardId, name: v.guardName }])).values()
  );

  const onSiteCount = visits.filter((v) => v.status === "on-site").length;
  const vehicleCount = visits.filter((v) => v.hasVehicle).length;
  const sortedVisits = sortData(visits);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Журнал визитов</h2>
          <p className="text-muted-foreground">
            Всего визитов: {visits.length} • На территории: {onSiteCount} • С
            транспортом: {vehicleCount}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Экспорт .xlsx
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="p-4 bg-info/10 border-info/20">
        <p className="text-info flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Журнал содержит только визиты, зарегистрированные вашими охранниками
        </p>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по ФИО, ИИН, компании, телефону, гос. номеру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
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

            <Select value={guardFilter} onValueChange={setGuardFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Охранник" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все охранники</SelectItem>
                {guards.map((guard) => (
                  <SelectItem key={guard.id} value={guard.id}>
                    {guard.name}
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
                  <TableHead className="whitespace-nowrap">
                    <SortableTableHead
                      field="guardName"
                      label="Охранник"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
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
                  <TableHead className="w-[80px] whitespace-nowrap">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-12">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : sortedVisits.length === 0 ? (
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
                      <TableCell className="text-foreground">
                        {visit.guardName}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(visit)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
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
      />
    </div>
  );
}
