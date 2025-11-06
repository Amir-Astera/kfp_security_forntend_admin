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
  Filter,
  Calendar,
  Clock,
  Truck,
  User,
  LogOut,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Visit, VisitFilters } from "../types";
import { getVisits, checkoutVisit, exportVisits } from "../api/visits";
import { toast } from "sonner@2.0.3";

type SortField = "entryTime" | "fullName" | "company" | "branchName" | "purpose" | "status";
type SortDirection = "asc" | "desc" | null;

export function VisitsList() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Фильтры
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [checkpointFilter, setCheckpointFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [purposeFilter, setPurposeFilter] = useState<string>("all");

  // Сортировка
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Загрузка данных
  useEffect(() => {
    loadVisits();
  }, [searchQuery, branchFilter, checkpointFilter, statusFilter, vehicleFilter, purposeFilter]);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const filters: VisitFilters = {
        search: searchQuery || undefined,
        branchId: branchFilter !== "all" ? branchFilter : undefined,
        checkpointId: checkpointFilter !== "all" ? checkpointFilter : undefined,
        status: statusFilter !== "all" ? (statusFilter as "on-site" | "left") : undefined,
        hasVehicle: vehicleFilter === "yes" ? true : vehicleFilter === "no" ? false : undefined,
        purpose: purposeFilter !== "all" ? purposeFilter : undefined,
      };

      const response = await getVisits(filters);
      setVisits(response.items);
    } catch (error) {
      toast.error("Ошибка загрузки визитов");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycling through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortedVisits = () => {
    if (!sortField || !sortDirection) return visits;

    return [...visits].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Special handling for dates
      if (sortField === "entryTime") {
        aVal = new Date(a.entryTime.split(" ").reverse().join("-")).getTime();
        bVal = new Date(b.entryTime.split(" ").reverse().join("-")).getTime();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="w-4 h-4" />
        ) : (
          <ArrowDown className="w-4 h-4" />
        )
      ) : (
        <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
      )}
    </button>
  );

  const handleViewDetails = (visit: Visit) => {
    setSelectedVisit(visit);
    setDetailDialogOpen(true);
  };

  const handleCheckout = async (visit: Visit) => {
    try {
      await checkoutVisit(visit.id);
      toast.success(`${visit.fullName} покинул территорию`);
      loadVisits();
    } catch (error) {
      toast.error("Ошибка при регистрации выхода");
    }
  };

  const handleExport = async () => {
    try {
      const url = await exportVisits({
        search: searchQuery || undefined,
        branchId: branchFilter !== "all" ? branchFilter : undefined,
      });
      toast.success("Экспорт успешно выполнен");
      // В реальном приложении здесь будет скачивание файла
      console.log("Export URL:", url);
    } catch (error) {
      toast.error("Ошибка экспорта");
    }
  };

  const branches = Array.from(
    new Map(visits.map((v) => [v.branchId, { id: v.branchId, name: v.branchName }])).values()
  );

  const checkpoints = branchFilter === "all"
    ? Array.from(
        new Map(visits.map((v) => [v.checkpointId, { id: v.checkpointId, name: v.checkpointName }])).values()
      )
    : Array.from(
        new Map(
          visits
            .filter((v) => v.branchId === branchFilter)
            .map((v) => [v.checkpointId, { id: v.checkpointId, name: v.checkpointName }])
        ).values()
      );

  const purposes = [
    "Деловая встреча",
    "Поставка товаров",
    "Обслуживание",
    "Совещание",
    "Инспекция",
    "Ремонтные работы",
    "Прочее",
  ];

  const onSiteCount = visits.filter((v) => v.status === "on-site").length;
  const vehicleCount = visits.filter((v) => v.hasVehicle).length;
  const sortedVisits = getSortedVisits();

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
                    <SortButton field="entryTime" label="Время въезда" />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    <SortButton field="fullName" label="ФИО / Компания" />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">ИИН / Телефон</TableHead>
                  <TableHead className="whitespace-nowrap">
                    <SortButton field="branchName" label="Филиал / КПП" />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Места посещения</TableHead>
                  <TableHead className="whitespace-nowrap">
                    <SortButton field="purpose" label="Цель визита" />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Транспорт</TableHead>
                  <TableHead className="whitespace-nowrap">Тип груза</TableHead>
                  <TableHead className="whitespace-nowrap">Тех. паспорт</TableHead>
                  <TableHead className="whitespace-nowrap">ТТН</TableHead>
                  <TableHead className="whitespace-nowrap">Охранник / Агентство</TableHead>
                  <TableHead className="whitespace-nowrap">Время на территории</TableHead>
                  <TableHead className="whitespace-nowrap">
                    <SortButton field="status" label="Статус" />
                  </TableHead>
                  <TableHead className="w-[100px] whitespace-nowrap">Действия</TableHead>
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
    </div>
  );
}
