import { useState, useEffect, useMemo, useRef } from "react";
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
import { SortableTableHead } from "./SortableTableHead";
import { Search, Download, Eye, Filter, Calendar, Clock, Truck, User } from "lucide-react";
import { Badge } from "./ui/badge";
import type { AuthResponse, Visit } from "../types";
import { toast } from "sonner@2.0.3";
import { useSorting } from "./hooks/useSorting";
import { exportVisits } from "../utils/export";
import { getGuestVisits, mapGuestVisitToVisit, getVisitPurposes } from "../api/visits";
import {
  getBranches,
  getBranchById,
  type BranchApiResponse,
} from "../api/branches";
import {
  getCheckpoints,
  getCheckpointById,
  type CheckpointApiItem,
} from "../api/checkpoints";
import { fetchGuardByIdFromApi } from "../api/guards";

interface VisitsListProps {
  authTokens: AuthResponse | null;
}

type GuardDirectoryEntry = {
  name: string;
  agencyName?: string;
};

export function VisitsList({ authTokens }: VisitsListProps) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [branches, setBranches] = useState<BranchApiResponse[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointApiItem[]>([]);
  const [guardDetails, setGuardDetails] = useState<Record<string, GuardDirectoryEntry>>({});
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);

  const directoryFetchState = useRef({
    branches: new Set<string>(),
    checkpoints: new Set<string>(),
    guards: new Set<string>(),
  });

  // Пагинация (пока только первая страница)
  const [currentPage] = useState(0);
  const [pageSize] = useState(25);

  // Фильтры
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [checkpointFilter, setCheckpointFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [purposeFilter, setPurposeFilter] = useState<string>("all");

  // Сортировка
  const { sortField, sortDirection, handleSort, sortData } = useSorting();

  const purposes = useMemo(() => getVisitPurposes(), []);
  const isAuthorized = Boolean(authTokens?.accessToken && authTokens?.tokenType);

  const branchNameMap = useMemo(() => {
    const map: Record<string, string> = {};

    branches.forEach((branch) => {
      if (branch?.id) {
        map[branch.id] = branch.name ?? String(branch.id);
      }
    });

    return map;
  }, [branches]);

  const checkpointNameMap = useMemo(() => {
    const map: Record<string, string> = {};

    checkpoints.forEach((checkpoint) => {
      if (checkpoint?.id) {
        map[checkpoint.id] = checkpoint.name ?? String(checkpoint.id);
      }
    });

    return map;
  }, [checkpoints]);

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }

    let ignore = false;

    const loadVisits = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getGuestVisits(
          { accessToken: authTokens!.accessToken, tokenType: authTokens!.tokenType },
          {
            page: currentPage,
            size: pageSize,
            branchId: branchFilter === "all" ? undefined : branchFilter,
          }
        );

        if (ignore) {
          return;
        }

        setVisits(response.items.map(mapGuestVisitToVisit));
        setTotalItems(response.total ?? response.items.length);
      } catch (loadError) {
        if (ignore) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить визиты";
        setError(message);
        toast.error(message);
        setVisits([]);
        setTotalItems(0);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadVisits();

    return () => {
      ignore = true;
    };
  }, [authTokens, branchFilter, currentPage, isAuthorized, pageSize]);

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }

    const loadDirectories = async () => {
      try {
        const [branchesResponse, checkpointsResponse] = await Promise.all([
          getBranches(
            { accessToken: authTokens!.accessToken, tokenType: authTokens!.tokenType },
            { size: 100 }
          ),
          getCheckpoints(
            { accessToken: authTokens!.accessToken, tokenType: authTokens!.tokenType },
            { size: 100 }
          ),
        ]);

        setBranches(branchesResponse.items ?? []);
        setCheckpoints(checkpointsResponse.items ?? []);
      } catch (directoryError) {
        console.error("Не удалось загрузить справочники", directoryError);
      }
    };

    loadDirectories();
  }, [authTokens, isAuthorized]);

  useEffect(() => {
    if (!isAuthorized || !authTokens?.accessToken || !authTokens?.tokenType) {
      return;
    }

    const branchIds: string[] = [];
    const checkpointIds: string[] = [];
    const guardIds: string[] = [];

    visits.forEach((visit) => {
      if (visit.branchId) {
        const branchName = visit.branchName?.trim();
        const isBranchKnown = Boolean(branchName && branchName !== visit.branchId);
        if (
          !isBranchKnown &&
          !branchNameMap[visit.branchId] &&
          !directoryFetchState.current.branches.has(visit.branchId)
        ) {
          directoryFetchState.current.branches.add(visit.branchId);
          branchIds.push(visit.branchId);
        }
      }

      if (visit.checkpointId) {
        const checkpointName = visit.checkpointName?.trim();
        const isCheckpointKnown = Boolean(
          checkpointName && checkpointName !== visit.checkpointId,
        );
        if (
          !isCheckpointKnown &&
          !checkpointNameMap[visit.checkpointId] &&
          !directoryFetchState.current.checkpoints.has(visit.checkpointId)
        ) {
          directoryFetchState.current.checkpoints.add(visit.checkpointId);
          checkpointIds.push(visit.checkpointId);
        }
      }

      if (visit.guardId) {
        const guardName = visit.guardName?.trim();
        const guardInfo = guardDetails[visit.guardId];
        const isGuardKnown = Boolean(guardName && guardName !== visit.guardId);
        if (
          !isGuardKnown &&
          !guardInfo &&
          !directoryFetchState.current.guards.has(visit.guardId)
        ) {
          directoryFetchState.current.guards.add(visit.guardId);
          guardIds.push(visit.guardId);
        }
      }
    });

    if (branchIds.length === 0 && checkpointIds.length === 0 && guardIds.length === 0) {
      return;
    }

    let cancelled = false;

    const tokens = {
      accessToken: authTokens.accessToken,
      tokenType: authTokens.tokenType,
    };

    const fetchDirectories = async () => {
      try {
        const [branchesData, checkpointsData, guardsData] = await Promise.all([
          Promise.all(
            branchIds.map(async (id) => {
              try {
                return await getBranchById(id, tokens);
              } catch (error) {
                console.error(`Не удалось загрузить данные филиала ${id}`, error);
                return null;
              }
            }),
          ),
          Promise.all(
            checkpointIds.map(async (id) => {
              try {
                return await getCheckpointById(id, tokens);
              } catch (error) {
                console.error(`Не удалось загрузить данные КПП ${id}`, error);
                return null;
              }
            }),
          ),
          Promise.all(
            guardIds.map(async (id) => {
              try {
                return await fetchGuardByIdFromApi(id, tokens);
              } catch (error) {
                console.error(`Не удалось загрузить данные охранника ${id}`, error);
                return null;
              }
            }),
          ),
        ]);

        if (cancelled) {
          return;
        }

        if (branchesData.some(Boolean)) {
          setBranches((prev) => {
            const existingIds = new Set(prev.map((branch) => branch.id));
            const newItems = branchesData.filter(
              (branch): branch is BranchApiResponse =>
                Boolean(branch && !existingIds.has(branch.id)),
            );
            return newItems.length ? [...prev, ...newItems] : prev;
          });
        }

        if (checkpointsData.some(Boolean)) {
          setCheckpoints((prev) => {
            const existingIds = new Set(prev.map((checkpoint) => checkpoint.id));
            const newItems = checkpointsData.filter(
              (checkpoint): checkpoint is CheckpointApiItem =>
                Boolean(checkpoint && !existingIds.has(checkpoint.id)),
            );
            return newItems.length ? [...prev, ...newItems] : prev;
          });
        }

        if (guardsData.some(Boolean)) {
          setGuardDetails((prev) => {
            const next = { ...prev };
            guardsData.forEach((guard) => {
              if (guard) {
                const existing = prev[guard.id];
                next[guard.id] = {
                  name: guard.fullName ?? existing?.name ?? guard.id,
                  agencyName: guard.agencyName ?? existing?.agencyName ?? "",
                };
              }
            });
            return next;
          });
        }
      } catch (error) {
        console.error("Не удалось загрузить справочные данные визитов", error);
      } finally {
        branchIds.forEach((id) => directoryFetchState.current.branches.delete(id));
        checkpointIds.forEach((id) => directoryFetchState.current.checkpoints.delete(id));
        guardIds.forEach((id) => directoryFetchState.current.guards.delete(id));
      }
    };

    fetchDirectories();

    return () => {
      cancelled = true;
    };
  }, [
    authTokens,
    branchNameMap,
    checkpointNameMap,
    guardDetails,
    isAuthorized,
    visits,
  ]);

  const handleViewDetails = (visit: Visit) => {
    setSelectedVisit(visit);
    setDetailDialogOpen(true);
  };

  const handleExport = () => {
    if (!visits.length) {
      toast.info("Нет данных для экспорта");
      return;
    }

    exportVisits(visits);
  };

  if (!isAuthorized) {
    return (
      <Card className="p-6 text-muted-foreground">
        Не удалось получить токен авторизации. Выполните вход повторно.
      </Card>
    );
  }

  const filteredVisits = visits.filter((visit) => {
    const searchLower = searchQuery.trim().toLowerCase();
    const matchesSearch =
      searchLower.length === 0 ||
      visit.fullName?.toLowerCase().includes(searchLower) ||
      visit.iin?.includes(searchLower) ||
      visit.company?.toLowerCase().includes(searchLower) ||
      visit.phone?.includes(searchLower) ||
      visit.vehicleNumber?.toLowerCase().includes(searchLower);

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

  const decoratedVisits = useMemo(
    () =>
      sortedVisits.map((visit) => {
        const branchNameFromVisit = visit.branchName?.trim();
        const checkpointNameFromVisit = visit.checkpointName?.trim();
        const guardNameFromVisit = visit.guardName?.trim();
        const guardInfo = visit.guardId ? guardDetails[visit.guardId] : undefined;

        const branchName =
          branchNameFromVisit && branchNameFromVisit !== visit.branchId
            ? branchNameFromVisit
            : branchNameMap[visit.branchId] ?? "";

        const checkpointName =
          checkpointNameFromVisit && checkpointNameFromVisit !== visit.checkpointId
            ? checkpointNameFromVisit
            : checkpointNameMap[visit.checkpointId] ?? "";

        const guardName =
          guardNameFromVisit && guardNameFromVisit !== visit.guardId
            ? guardNameFromVisit
            : guardInfo?.name ?? "";

        const agencyName = visit.agencyName?.trim()
          ? visit.agencyName
          : guardInfo?.agencyName ?? "";

        return {
          ...visit,
          branchName,
          checkpointName,
          guardName,
          agencyName,
        };
      }),
    [branchNameMap, checkpointNameMap, guardDetails, sortedVisits],
  );

  const selectedVisitWithNames = useMemo(() => {
    if (!selectedVisit) {
      return null;
    }

    const branchNameFromVisit = selectedVisit.branchName?.trim();
    const checkpointNameFromVisit = selectedVisit.checkpointName?.trim();
    const guardNameFromVisit = selectedVisit.guardName?.trim();
    const guardInfo = selectedVisit.guardId
      ? guardDetails[selectedVisit.guardId]
      : undefined;

    const branchName =
      branchNameFromVisit && branchNameFromVisit !== selectedVisit.branchId
        ? branchNameFromVisit
        : branchNameMap[selectedVisit.branchId] ?? "";
    const checkpointName =
      checkpointNameFromVisit && checkpointNameFromVisit !== selectedVisit.checkpointId
        ? checkpointNameFromVisit
        : checkpointNameMap[selectedVisit.checkpointId] ?? "";
    const guardName =
      guardNameFromVisit && guardNameFromVisit !== selectedVisit.guardId
        ? guardNameFromVisit
        : guardInfo?.name ?? "";
    const agencyName = selectedVisit.agencyName?.trim()
      ? selectedVisit.agencyName
      : guardInfo?.agencyName ?? "";

    return {
      ...selectedVisit,
      branchName,
      checkpointName,
      guardName,
      agencyName,
    };
  }, [branchNameMap, checkpointNameMap, guardDetails, selectedVisit]);

  const onSiteCount = visits.filter((v) => v.status === "on-site").length;
  const vehicleCount = visits.filter((v) => v.hasVehicle).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Реестр визитов</h2>
          <p className="text-muted-foreground">
            Всего визитов: {totalItems} • На территории: {onSiteCount} • С транспортом: {vehicleCount}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport} disabled={!visits.length}>
            <Download className="w-4 h-4 mr-2" />
            Экспорт .xlsx
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/20 bg-destructive/5 p-4 text-destructive">
          {error}
        </Card>
      )}

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
                <Filter className="w-4 h-4 mr-2" />
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

            <Select value={checkpointFilter} onValueChange={setCheckpointFilter}>
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
                  <TableHead className="w-[80px] whitespace-nowrap">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-10 text-muted-foreground">
                      Загрузка визитов...
                    </TableCell>
                  </TableRow>
                ) : decoratedVisits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-12 text-muted-foreground">
                      Визиты не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  decoratedVisits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-foreground">{visit.entryTime || "—"}</p>
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
                          <p className="text-muted-foreground">{visit.company || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-foreground">{visit.iin || "—"}</p>
                          <p className="text-muted-foreground">{visit.phone || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-foreground">{visit.branchName || "—"}</p>
                          <p className="text-muted-foreground">{visit.checkpointName || "—"}</p>
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
                        {visit.purpose ? (
                          <Badge variant="outline">{visit.purpose}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {visit.hasVehicle ? (
                          <div className="flex items-start gap-2">
                            <Truck className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
                            <span className="text-foreground">{visit.vehicleNumber}</span>
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
                          <p className="text-foreground">{visit.guardName || "—"}</p>
                          <p className="text-muted-foreground text-xs">{visit.agencyName || "—"}</p>
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

      {/* Summary */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Показано {visits.length} из {totalItems} визитов</p>
        </div>
      )}

      {/* Detail Dialog */}
      <VisitDetailDialog
        visit={selectedVisitWithNames}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}

