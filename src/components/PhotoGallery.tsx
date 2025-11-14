import { useState, useMemo, useEffect, useCallback } from "react";
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
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { AuthResponse, ShiftPhotoApiItem } from "../types";
import {
  buildFileUrl,
  fetchShiftEntrancePhotos,
} from "../api/shiftPhotos";

const PAGE = 0;
const PAGE_SIZE = 50;

type DateFilterValue = "day" | "week" | "month";

const DATE_FILTER_LABELS: Record<DateFilterValue, string> = {
  day: "Сегодня",
  week: "Последние 7 дней",
  month: "Последний месяц",
};

type UserRole = "superadmin" | "agency" | "guard";

interface PhotoGalleryProps {
  authTokens: AuthResponse | null;
  userRole?: UserRole;
}

interface GalleryPhoto {
  id: string;
  shiftId: string;
  guardId: string;
  guardName: string;
  agencyId?: string;
  agencyName?: string;
  branchId?: string;
  branchName?: string;
  checkpointId?: string;
  checkpointName?: string;
  kind: "START" | "END";
  shiftType?: "day" | "night" | null;
  timestamp: Date;
  takenAtDate?: Date | null;
  takenAtRaw?: string | null;
  fileId?: string;
  fileFormat?: string;
  fileUrl?: string | null;
  previewUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface FilterOption {
  value: string;
  label: string;
}

function getDateRange(value: DateFilterValue): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);

  to.setMilliseconds(999);

  switch (value) {
    case "week": {
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - 6);
      break;
    }
    case "month": {
      from.setHours(0, 0, 0, 0);
      from.setMonth(from.getMonth() - 1);
      break;
    }
    case "day":
    default: {
      from.setHours(0, 0, 0, 0);
      break;
    }
  }

  return { from, to };
}

function mapShiftPhoto(item: ShiftPhotoApiItem): GalleryPhoto {
  const rawTimestamp = item.takenAt ?? item.createdAt ?? item.updatedAt ?? null;
  const timestampCandidate = rawTimestamp ? new Date(rawTimestamp) : new Date();
  const timestamp = Number.isNaN(timestampCandidate.getTime())
    ? new Date()
    : timestampCandidate;
  const takenAtDateCandidate = item.takenAt ? new Date(item.takenAt) : null;
  const takenAtDate =
    takenAtDateCandidate && !Number.isNaN(takenAtDateCandidate.getTime())
      ? takenAtDateCandidate
      : null;

  const normalizedShiftType = item.shiftType
    ? String(item.shiftType).toLowerCase()
    : null;

  return {
    id: item.id,
    shiftId: item.shiftId,
    guardId: item.guardId,
    guardName:
      item.guardFullName ||
      item.guardName ||
      item.guardId ||
      "Неизвестный охранник",
    agencyId: item.agencyId ?? undefined,
    agencyName: item.agencyName ?? undefined,
    branchId: item.branchId ?? undefined,
    branchName: item.branchName ?? undefined,
    checkpointId: item.checkpointId ?? undefined,
    checkpointName: item.checkpointName ?? undefined,
    kind: item.kind,
    shiftType:
      normalizedShiftType === "day" || normalizedShiftType === "night"
        ? (normalizedShiftType as "day" | "night")
        : null,
    timestamp,
    takenAtDate,
    takenAtRaw: rawTimestamp,
    fileId: item.fileId,
    fileFormat: item.fileFormat,
    fileUrl: item.fileUrl ?? null,
    previewUrl: item.previewUrl ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "—";
}

function includesValue(values: Array<string | undefined>, target: string): boolean {
  return values.some((value) => value && value === target);
}

export function PhotoGallery({ authTokens, userRole = "superadmin" }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedShift, setSelectedShift] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<DateFilterValue>("day");
  const [showFilters, setShowFilters] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenPreviews, setBrokenPreviews] = useState<Record<string, boolean>>({});

  const dateRange = useMemo(() => getDateRange(selectedDate), [selectedDate]);

  const loadPhotos = useCallback(async () => {
    setIsLoading(true);

    if (!authTokens?.accessToken || !authTokens?.tokenType) {
      setError("Отсутствуют авторизационные данные для загрузки фотографий.");
      setPhotos([]);
      setTotal(0);
      setIsLoading(false);
      return;
    }

    const range = getDateRange(selectedDate);

    try {
      setError(null);
      const response = await fetchShiftEntrancePhotos(
        {
          page: PAGE,
          size: PAGE_SIZE,
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        },
        {
          accessToken: authTokens.accessToken,
          tokenType: authTokens.tokenType,
        },
        {
          scope: userRole === "superadmin" ? "superadmin" : "agency",
        }
      );

      const mapped = Array.isArray(response.items)
        ? response.items.map(mapShiftPhoto)
        : [];

      mapped.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      setPhotos(mapped);
      setTotal(response.total ?? mapped.length);
    } catch (fetchError) {
      console.error("Ошибка загрузки фотографий смен:", fetchError);
      setPhotos([]);
      setTotal(0);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Не удалось загрузить фотографии"
      );
    } finally {
      setIsLoading(false);
    }
  }, [authTokens, selectedDate, userRole]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  useEffect(() => {
    setBrokenPreviews({});
  }, [photos]);

  const agencies = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();

    photos.forEach((photo) => {
      const value = photo.agencyId || photo.agencyName;
      const label = photo.agencyName || photo.agencyId;
      if (value && label && !map.has(value)) {
        map.set(value, label);
      }
    });

    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [photos]);

  const branches = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();

    photos.forEach((photo) => {
      const value = photo.branchId || photo.branchName;
      const label = photo.branchName || photo.branchId;
      if (value && label && !map.has(value)) {
        map.set(value, label);
      }
    });

    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const fromTime = dateRange.from.getTime();
    const toTime = dateRange.to.getTime();

    return photos.filter((photo) => {
      const matchesSearch =
        query === "" ||
        [
          photo.guardName,
          photo.checkpointName,
          photo.branchName,
          photo.agencyName,
        ]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(query));

      const matchesAgency =
        userRole === "agency" ||
        selectedAgency === "all" ||
        includesValue(
          [photo.agencyId, photo.agencyName],
          selectedAgency
        );

      const matchesBranch =
        selectedBranch === "all" ||
        includesValue(
          [photo.branchId, photo.branchName],
          selectedBranch
        );

      const matchesShift =
        selectedShift === "all" || photo.shiftType === selectedShift;

      const time = photo.timestamp.getTime();
      const matchesDate = time >= fromTime && time <= toTime;

      return (
        matchesSearch &&
        matchesAgency &&
        matchesBranch &&
        matchesShift &&
        matchesDate
      );
    });
  }, [photos, searchQuery, selectedAgency, selectedBranch, selectedShift, dateRange, userRole]);

  const activeFiltersCount = [
    searchQuery.trim() !== "",
    selectedDate !== "day",
    userRole !== "agency" && selectedAgency !== "all",
    selectedBranch !== "all",
    selectedShift !== "all",
  ].filter(Boolean).length;

  const totalPages = useMemo(() => {
    if (total <= 0) {
      return 1;
    }

    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [total]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedAgency("all");
    setSelectedBranch("all");
    setSelectedShift("all");
    setSelectedDate("day");
  };

  const handleImageError = useCallback((photoId: string) => {
    setBrokenPreviews((prev) => ({ ...prev, [photoId]: true }));
  }, []);

  const selectedPhotoFullUrl = selectedPhoto
    ? buildFileUrl(selectedPhoto.fileUrl) ||
      buildFileUrl(selectedPhoto.previewUrl)
    : null;

  const selectedPhotoPreviewUrl = selectedPhoto
    ? buildFileUrl(selectedPhoto.previewUrl) ||
      buildFileUrl(selectedPhoto.fileUrl)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground mb-2">Фото-вступления на смену</h1>
          <p className="text-muted-foreground">
            Галерея фотографий охранников при вступлении на смену
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Всего: {total}</Badge>
          <Badge variant="outline">Показано: {filteredPhotos.length}</Badge>
        </div>
      </div>

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
              <Button variant="ghost" size="sm" onClick={resetFilters}>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Поиск</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Имя, КПП или филиал..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Дата</Label>
              <Select
                value={selectedDate}
                onValueChange={(value) =>
                  setSelectedDate(value as DateFilterValue)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите период" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">{DATE_FILTER_LABELS.day}</SelectItem>
                  <SelectItem value="week">{DATE_FILTER_LABELS.week}</SelectItem>
                  <SelectItem value="month">{DATE_FILTER_LABELS.month}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userRole !== "agency" && (
              <div className="space-y-2">
                <Label>Агентство</Label>
                <Select
                  value={selectedAgency}
                  onValueChange={setSelectedAgency}
                  disabled={agencies.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все агентства" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все агентства</SelectItem>
                    {agencies.map((agency) => (
                      <SelectItem key={agency.value} value={agency.value}>
                        {agency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Филиал</Label>
              <Select
                value={selectedBranch}
                onValueChange={setSelectedBranch}
                disabled={branches.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Все филиалы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все филиалы</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.value} value={branch.value}>
                      {branch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Смена</Label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger>
                  <SelectValue placeholder="Все смены" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все смены</SelectItem>
                  <SelectItem value="day">Дневная</SelectItem>
                  <SelectItem value="night">Ночная</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-destructive/30 bg-destructive/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3 text-destructive">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold">Не удалось загрузить фотографии</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadPhotos}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Повторить
          </Button>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={`photo-skeleton-${index}`} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredPhotos.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Отсутствуют данные авторизации. Выполните вход, чтобы просмотреть
            фото вступления на смену.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => {
            const previewUrl = buildFileUrl(photo.previewUrl) || buildFileUrl(photo.fileUrl);
            const showPreview = previewUrl && !brokenPreviews[photo.id];

            return (
              <Card
                key={photo.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="aspect-square relative overflow-hidden bg-slate-100">
                  {showPreview ? (
                    <img
                      src={previewUrl}
                      alt={`Фото ${photo.guardName}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={() => handleImageError(photo.id)}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-4xl font-semibold text-muted-foreground">
                      {getInitials(photo.guardName)}
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur text-foreground">
                      {photo.kind === "START" ? "Начало смены" : "Завершение"}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground truncate">{photo.guardName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">
                      {format(photo.timestamp, "dd MMM, HH:mm", { locale: ru })}
                    </span>
                  </div>
                  {photo.checkpointName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{photo.checkpointName}</span>
                    </div>
                  )}
                  {photo.branchName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{photo.branchName}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle>Фото вступления на смену</DialogTitle>
                <DialogDescription>
                  Детальная информация о вступлении охранника на смену
                </DialogDescription>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="aspect-square relative overflow-hidden rounded-lg bg-slate-100">
                    {selectedPhotoPreviewUrl ? (
                      <img
                        src={selectedPhotoPreviewUrl}
                        alt={`Фото ${selectedPhoto.guardName}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-6xl font-semibold text-muted-foreground">
                        {getInitials(selectedPhoto.guardName)}
                      </div>
                    )}
                  </div>
                  {selectedPhotoFullUrl && (
                    <Button asChild variant="outline" className="w-full">
                      <a
                        href={selectedPhotoFullUrl}
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
                    <Badge variant="secondary">
                      {selectedPhoto.kind === "START"
                        ? "Начало смены"
                        : "Завершение смены"}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-muted-foreground mb-1">Охранник</h3>
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

                  {selectedPhoto.checkpointName && (
                    <div>
                      <h3 className="text-muted-foreground mb-1">КПП</h3>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-foreground">
                          {selectedPhoto.checkpointName}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedPhoto.branchName && (
                    <div>
                      <h3 className="text-muted-foreground mb-1">Филиал</h3>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span className="text-foreground">
                          {selectedPhoto.branchName}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedPhoto.agencyName && (
                    <div>
                      <h3 className="text-muted-foreground mb-1">Агентство</h3>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="text-foreground">
                          {selectedPhoto.agencyName}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      ID смены: <span className="text-foreground">{selectedPhoto.shiftId}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ID охранника: <span className="text-foreground">{selectedPhoto.guardId}</span>
                    </p>
                    {selectedPhoto.fileId && (
                      <p className="text-sm text-muted-foreground">
                        ID файла: <span className="text-foreground">{selectedPhoto.fileId}</span>
                      </p>
                    )}
                    {selectedPhoto.fileFormat && (
                      <p className="text-sm text-muted-foreground">
                        Формат файла: <span className="text-foreground">{selectedPhoto.fileFormat}</span>
                      </p>
                    )}
                    {selectedPhoto.takenAtRaw && (
                      <p className="text-sm text-muted-foreground">
                        Зафиксировано: <span className="text-foreground">{selectedPhoto.takenAtRaw}</span>
                      </p>
                    )}
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
