import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import {
  Search,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  User,
  Building2,
  Shield,
  X,
  Filter,
  Loader2,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { StatusBadge } from "./StatusBadge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { AuthResponse, ShiftPhotoApiItem } from "../types";
import { fetchShiftPhotos } from "../api/shiftPhotos";
import { fetchGuardByIdFromApi } from "../api/guards";
import { getBranchById } from "../api/branches";
import { getCheckpointById } from "../api/checkpoints";
import { toast } from "sonner@2.0.3";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const SHIFT_PHOTO_PAGE_SIZE = 50;

interface PhotoGalleryProps {
  authTokens: AuthResponse | null;
}

type GuardDirectoryInfo = {
  name: string;
  agencyName?: string;
  branchName?: string;
  checkpointName?: string;
  shiftType?: "day" | "night";
};

interface DecoratedShiftPhoto extends ShiftPhotoApiItem {
  guardName: string;
  agencyName: string;
  branchName: string;
  checkpointName: string;
  shiftType?: "day" | "night";
  takenAtDate: Date | null;
  fullPreviewUrl: string | null;
  fullFileUrl: string | null;
}

const KIND_CONFIG: Record<string, { label: string; status: "success" | "warning" | "danger" }> = {
  START: { label: "Начало смены", status: "success" },
  FINISH: { label: "Завершение смены", status: "warning" },
};

const normalizeShiftType = (
  value?: string | null,
): GuardDirectoryInfo["shiftType"] => {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (normalized === "night") {
    return "night";
  }

  if (normalized === "day") {
    return "day";
  }

  return undefined;
};

const parseDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildFileUrl = (path?: string | null): string | null => {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = API_BASE_URL.replace(/\/$/, "");
  const relative = path.startsWith("/") ? path : `/${path}`;
  return `${base}${relative}`;
};

export function PhotoGallery({ authTokens }: PhotoGalleryProps) {
  const [shiftPhotos, setShiftPhotos] = useState<ShiftPhotoApiItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<DecoratedShiftPhoto | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedShift, setSelectedShift] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(true);
  const [reloadCounter, setReloadCounter] = useState(0);

  const [guardDetails, setGuardDetails] = useState<Record<string, GuardDirectoryInfo>>({});
  const [branchDetails, setBranchDetails] = useState<Record<string, string>>({});
  const [checkpointDetails, setCheckpointDetails] = useState<Record<string, string>>({});

  const pendingFetchesRef = useRef({
    guards: new Set<string>(),
    branches: new Set<string>(),
    checkpoints: new Set<string>(),
  });

  const isAuthorized = Boolean(
    authTokens?.accessToken && authTokens?.tokenType,
  );

  useEffect(() => {
    setPage(0);
  }, [authTokens?.accessToken, authTokens?.tokenType]);

  useEffect(() => {
    if (!isAuthorized) {
      setShiftPhotos([]);
      setTotal(0);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadPhotos = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchShiftPhotos(
          { page, size: SHIFT_PHOTO_PAGE_SIZE },
          {
            accessToken: authTokens!.accessToken,
            tokenType: authTokens!.tokenType,
          },
        );

        if (cancelled) {
          return;
        }

        setShiftPhotos(response.items ?? []);
        setTotal(response.total ?? response.items?.length ?? 0);

        if (typeof response.page === "number" && response.page !== page) {
          setPage(response.page);
        }
      } catch (fetchError) {
        console.error("Не удалось загрузить фото вступления", fetchError);
        if (!cancelled) {
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : "Не удалось загрузить фото вступления на смену";
          setError(message);
          toast.error(message);
          setShiftPhotos([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPhotos();

    return () => {
      cancelled = true;
    };
  }, [authTokens, isAuthorized, page, reloadCounter]);

  const sortedPhotos = useMemo(() => {
    return [...shiftPhotos].sort((a, b) => {
      const aDate = parseDate(a.takenAt) ?? parseDate(a.createdAt);
      const bDate = parseDate(b.takenAt) ?? parseDate(b.createdAt);
      const aTime = aDate?.getTime() ?? 0;
      const bTime = bDate?.getTime() ?? 0;
      return bTime - aTime;
    });
  }, [shiftPhotos]);

  useEffect(() => {
    if (!isAuthorized || sortedPhotos.length === 0) {
      return;
    }

    const guardIds = Array.from(
      new Set(sortedPhotos.map((photo) => photo.guardId).filter(Boolean)),
    );
    const branchIds = Array.from(
      new Set(sortedPhotos.map((photo) => photo.branchId).filter(Boolean)),
    );
    const checkpointIds = Array.from(
      new Set(sortedPhotos.map((photo) => photo.checkpointId).filter(Boolean)),
    );

    const missingGuardIds = guardIds.filter(
      (id) =>
        !guardDetails[id] && !pendingFetchesRef.current.guards.has(id),
    );
    const missingBranchIds = branchIds.filter(
      (id) =>
        !branchDetails[id] && !pendingFetchesRef.current.branches.has(id),
    );
    const missingCheckpointIds = checkpointIds.filter(
      (id) =>
        !checkpointDetails[id] &&
        !pendingFetchesRef.current.checkpoints.has(id),
    );

    if (
      missingGuardIds.length === 0 &&
      missingBranchIds.length === 0 &&
      missingCheckpointIds.length === 0
    ) {
      return;
    }

    missingGuardIds.forEach((id) => pendingFetchesRef.current.guards.add(id));
    missingBranchIds.forEach((id) =>
      pendingFetchesRef.current.branches.add(id),
    );
    missingCheckpointIds.forEach((id) =>
      pendingFetchesRef.current.checkpoints.add(id),
    );

    let cancelled = false;

    const tokens = {
      accessToken: authTokens!.accessToken,
      tokenType: authTokens!.tokenType,
    };

    const loadDirectories = async () => {
      try {
        const [guardsData, branchesData, checkpointsData] = await Promise.all([
          Promise.all(
            missingGuardIds.map(async (id) => {
              try {
                return await fetchGuardByIdFromApi(id, tokens);
              } catch (guardError) {
                console.error(
                  `Не удалось загрузить данные охранника ${id}`,
                  guardError,
                );
                return null;
              }
            }),
          ),
          Promise.all(
            missingBranchIds.map(async (id) => {
              try {
                return await getBranchById(id, tokens);
              } catch (branchError) {
                console.error(
                  `Не удалось загрузить данные филиала ${id}`,
                  branchError,
                );
                return null;
              }
            }),
          ),
          Promise.all(
            missingCheckpointIds.map(async (id) => {
              try {
                return await getCheckpointById(id, tokens);
              } catch (checkpointError) {
                console.error(
                  `Не удалось загрузить данные КПП ${id}`,
                  checkpointError,
                );
                return null;
              }
            }),
          ),
        ]);

        if (cancelled) {
          return;
        }

        if (guardsData.some(Boolean)) {
          setGuardDetails((prev) => {
            const next = { ...prev };
            guardsData.forEach((guard) => {
              if (!guard) {
                return;
              }

              next[guard.id] = {
                name: guard.fullName ?? guard.id,
                agencyName: guard.agencyName ?? prev[guard.id]?.agencyName ?? "",
                branchName: guard.branchName ?? prev[guard.id]?.branchName,
                checkpointName:
                  guard.checkpointName ?? prev[guard.id]?.checkpointName,
                shiftType: normalizeShiftType(guard.shiftType),
              };
            });
            return next;
          });
        }

        if (branchesData.some(Boolean)) {
          setBranchDetails((prev) => {
            const next = { ...prev };
            branchesData.forEach((branch) => {
              if (branch) {
                next[branch.id] = branch.name ?? branch.id;
              }
            });
            return next;
          });
        }

        if (checkpointsData.some(Boolean)) {
          setCheckpointDetails((prev) => {
            const next = { ...prev };
            checkpointsData.forEach((checkpoint) => {
              if (checkpoint) {
                next[checkpoint.id] = checkpoint.name ?? checkpoint.id;
              }
            });
            return next;
          });
        }
      } finally {
        missingGuardIds.forEach((id) =>
          pendingFetchesRef.current.guards.delete(id),
        );
        missingBranchIds.forEach((id) =>
          pendingFetchesRef.current.branches.delete(id),
        );
        missingCheckpointIds.forEach((id) =>
          pendingFetchesRef.current.checkpoints.delete(id),
        );
      }
    };

    loadDirectories();

    return () => {
      cancelled = true;
    };
  }, [
    authTokens,
    branchDetails,
    checkpointDetails,
    guardDetails,
    isAuthorized,
    sortedPhotos,
  ]);

  const decoratedPhotos = useMemo<DecoratedShiftPhoto[]>(() => {
    return sortedPhotos.map((photo) => {
      const guardInfo = guardDetails[photo.guardId];
      const branchName =
        branchDetails[photo.branchId] ?? guardInfo?.branchName ?? photo.branchId;
      const checkpointName =
        checkpointDetails[photo.checkpointId] ??
        guardInfo?.checkpointName ??
        photo.checkpointId;
      const takenAtDate = parseDate(photo.takenAt) ?? parseDate(photo.createdAt);

      return {
        ...photo,
        guardName: guardInfo?.name ?? photo.guardId,
        agencyName: guardInfo?.agencyName ?? "",
        branchName,
        checkpointName,
        shiftType: guardInfo?.shiftType,
        takenAtDate,
        fullPreviewUrl: buildFileUrl(photo.previewUrl ?? photo.fileUrl),
        fullFileUrl: buildFileUrl(photo.fileUrl),
      };
    });
  }, [branchDetails, checkpointDetails, guardDetails, sortedPhotos]);

  const agencies = useMemo(() => {
    return Array.from(
      new Set(
        decoratedPhotos
          .map((photo) => photo.agencyName.trim())
          .filter((name) => Boolean(name)),
      ),
    );
  }, [decoratedPhotos]);

  const branches = useMemo(() => {
    return Array.from(
      new Set(
        decoratedPhotos
          .map((photo) => photo.branchName.trim())
          .filter((name) => Boolean(name)),
      ),
    );
  }, [decoratedPhotos]);

  const filteredPhotos = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

    return decoratedPhotos.filter((photo) => {
      const matchesSearch =
        search === "" ||
        photo.guardName.toLowerCase().includes(search) ||
        photo.checkpointName.toLowerCase().includes(search) ||
        photo.branchName.toLowerCase().includes(search);

      const matchesAgency =
        selectedAgency === "all" || photo.agencyName === selectedAgency;

      const matchesBranch =
        selectedBranch === "all" || photo.branchName === selectedBranch;

      const matchesShift =
        selectedShift === "all" || photo.shiftType === selectedShift;

      const dateString = photo.takenAtDate
        ? format(photo.takenAtDate, "yyyy-MM-dd")
        : null;
      const matchesDate =
        selectedDate === "all" ||
        (selectedDate === "today" && dateString === today) ||
        (selectedDate === "yesterday" && dateString === yesterday);

      return (
        matchesSearch &&
        matchesAgency &&
        matchesBranch &&
        matchesShift &&
        matchesDate
      );
    });
  }, [
    decoratedPhotos,
    searchQuery,
    selectedAgency,
    selectedBranch,
    selectedShift,
    selectedDate,
  ]);

  const activeFiltersCount = useMemo(
    () =>
      [
        searchQuery !== "",
        selectedAgency !== "all",
        selectedBranch !== "all",
        selectedShift !== "all",
        selectedDate !== "all",
      ].filter(Boolean).length,
    [
      searchQuery,
      selectedAgency,
      selectedBranch,
      selectedShift,
      selectedDate,
    ],
  );

  const totalPages = useMemo(() => {
    if (total <= 0) {
      return 1;
    }

    return Math.max(1, Math.ceil(total / SHIFT_PHOTO_PAGE_SIZE));
  }, [total]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedAgency("all");
    setSelectedBranch("all");
    setSelectedShift("all");
    setSelectedDate("all");
  };

  const handleRefresh = () => {
    if (!isAuthorized) {
      return;
    }

    setReloadCounter((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-foreground mb-2">Фото-вступления на смену</h1>
          <p className="text-muted-foreground">
            Галерея фотографий охранников при вступлении на смену
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Всего: {total}</Badge>
          <Badge variant="outline">Показано: {filteredPhotos.length}</Badge>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={!isAuthorized || isLoading}
              title="Обновить"
            >
              <RefreshCcw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevPage}
                disabled={page === 0 || isLoading}
                title="Предыдущая страница"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm text-muted-foreground min-w-[4rem] text-center">
                {page + 1} / {totalPages}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextPage}
                disabled={page + 1 >= totalPages || isLoading}
                title="Следующая страница"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {!isAuthorized ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Отсутствуют данные авторизации. Выполните вход, чтобы просмотреть
            фото вступления на смену.
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-foreground">Фильтры</h3>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary">{activeFiltersCount}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Сбросить
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters((prev) => !prev)}
                >
                  {showFilters ? "Скрыть" : "Показать"}
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label>Поиск</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Имя или КПП..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Дата</Label>
                  <Select value={selectedDate} onValueChange={setSelectedDate}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все даты</SelectItem>
                      <SelectItem value="today">Сегодня</SelectItem>
                      <SelectItem value="yesterday">Вчера</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Агентство</Label>
                  <Select
                    value={selectedAgency}
                    onValueChange={setSelectedAgency}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все агентства</SelectItem>
                      {agencies.map((agency) => (
                        <SelectItem key={agency} value={agency}>
                          {agency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Филиал</Label>
                  <Select
                    value={selectedBranch}
                    onValueChange={setSelectedBranch}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все филиалы</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Смена</Label>
                  <Select value={selectedShift} onValueChange={setSelectedShift}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все смены</SelectItem>
                      <SelectItem value="day">Дневная</SelectItem>
                      <SelectItem value="night">Ночная</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </Card>

          {error && (
            <Card className="border-destructive/30 bg-destructive/5 text-destructive">
              <div className="p-4 text-sm">{error}</div>
            </Card>
          )}

          {isLoading && filteredPhotos.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">
                  Загружаем фотографии вступления на смену...
                </p>
              </div>
            </Card>
          ) : filteredPhotos.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                Нет фотографий, соответствующих выбранным фильтрам
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPhotos.map((photo) => {
                const kindConfig = KIND_CONFIG[photo.kind] ?? {
                  label: photo.kind,
                  status: "danger" as const,
                };

                return (
                  <Card
                    key={photo.id}
                    className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-slate-100">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Avatar className="h-32 w-32">
                          <AvatarFallback className="text-3xl">
                            {photo.guardName
                              .split(" ")
                              .map((namePart) => namePart[0])
                              .join("")
                              .substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      {photo.fullPreviewUrl && (
                        <img
                          src={photo.fullPreviewUrl}
                          alt={`Фото охранника ${photo.guardName}`}
                          className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.classList.add("hidden");
                          }}
                        />
                      )}
                      <div className="absolute left-2 top-2">
                        <StatusBadge
                          status={kindConfig.status}
                          label={kindConfig.label}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="text-foreground truncate">
                          {photo.guardName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {photo.takenAtDate
                            ? format(photo.takenAtDate, "dd MMM, HH:mm", {
                                locale: ru,
                              })
                            : "Дата не указана"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{photo.checkpointName}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle>Фото вступления на смену</DialogTitle>
                <DialogDescription>
                  Детальная информация о вступлении охранника на смену
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Avatar className="h-48 w-48">
                        <AvatarFallback className="text-6xl">
                          {selectedPhoto.guardName
                            .split(" ")
                            .map((namePart) => namePart[0])
                            .join("")
                            .substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    {selectedPhoto.fullFileUrl && (
                      <img
                        src={selectedPhoto.fullFileUrl}
                        alt={`Фото охранника ${selectedPhoto.guardName}`}
                        className="absolute inset-0 h-full w-full object-contain"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.classList.add("hidden");
                        }}
                      />
                    )}
                    <div className="absolute left-3 top-3">
                      <StatusBadge
                        status={
                          KIND_CONFIG[selectedPhoto.kind]?.status ?? "success"
                        }
                        label={
                          KIND_CONFIG[selectedPhoto.kind]?.label ?? selectedPhoto.kind
                        }
                      />
                    </div>
                  </div>
                  {selectedPhoto.fullFileUrl && (
                    <Button asChild variant="outline" className="w-full">
                      <a
                        href={selectedPhoto.fullFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Открыть оригинал
                      </a>
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="mb-1 text-muted-foreground">Охранник</h3>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="text-foreground">
                        {selectedPhoto.guardName}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      ID охранника: {selectedPhoto.guardId}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-1 text-muted-foreground">Время вступления</h3>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <span className="text-foreground">
                        {selectedPhoto.takenAtDate
                          ? format(selectedPhoto.takenAtDate, "dd MMMM yyyy, HH:mm", {
                              locale: ru,
                            })
                          : "Дата не указана"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-1 text-muted-foreground">Смена</h3>
                    {selectedPhoto.shiftType ? (
                      <StatusBadge status={selectedPhoto.shiftType} />
                    ) : (
                      <StatusBadge status="warning" label="Не указано" />
                    )}
                  </div>

                  <div>
                    <h3 className="mb-1 text-muted-foreground">КПП</h3>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-foreground">
                        {selectedPhoto.checkpointName}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      ID КПП: {selectedPhoto.checkpointId}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-1 text-muted-foreground">Филиал</h3>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-foreground">
                        {selectedPhoto.branchName}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      ID филиала: {selectedPhoto.branchId}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-1 text-muted-foreground">Агентство</h3>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-foreground">
                        {selectedPhoto.agencyName || "Не указано"}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4 text-sm text-muted-foreground">
                    <div>ID смены: {selectedPhoto.shiftId}</div>
                    <div>Создано: {selectedPhoto.createdAt}</div>
                    <div>Формат файла: {selectedPhoto.fileFormat.toUpperCase()}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
