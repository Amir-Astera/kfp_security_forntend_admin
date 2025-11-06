import { useState, useMemo } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
} from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { StatusBadge } from "./StatusBadge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface PhotoEntry {
  id: string;
  guardName: string;
  guardId: string;
  timestamp: Date;
  checkpointName: string;
  checkpointId: string;
  branchName: string;
  agencyName: string;
  shiftType: "day" | "night";
  visitId: string;
  direction: "entry" | "exit";
}

// Моковые данные фотографий
const MOCK_PHOTOS: PhotoEntry[] = [
  {
    id: "p1",
    guardName: "Нурсултан Абдуллаев",
    guardId: "g1",
    timestamp: new Date(2025, 10, 4, 8, 0),
    checkpointName: "КПП Главный въезд",
    checkpointId: "cp1",
    branchName: "Филиал Алматы",
    agencyName: "ТОО «Казахстан Секьюрити»",
    shiftType: "day",
    visitId: "v1",
    direction: "entry",
  },
  {
    id: "p2",
    guardName: "Ерлан Төлеген",
    guardId: "g2",
    timestamp: new Date(2025, 10, 4, 8, 15),
    checkpointName: "КПП Склад №1",
    checkpointId: "cp2",
    branchName: "Филиал Алматы",
    agencyName: "ТОО «Надежная Охрана»",
    shiftType: "day",
    visitId: "v2",
    direction: "entry",
  },
  {
    id: "p3",
    guardName: "Асхат Жұмабек",
    guardId: "g3",
    timestamp: new Date(2025, 10, 4, 20, 0),
    checkpointName: "КПП Офисное здание",
    checkpointId: "cp3",
    branchName: "Филиал Астана",
    agencyName: "ТОО «Казахстан Секьюрити»",
    shiftType: "night",
    visitId: "v3",
    direction: "entry",
  },
  {
    id: "p4",
    guardName: "Дархан Смағұлов",
    guardId: "g4",
    timestamp: new Date(2025, 10, 4, 8, 30),
    checkpointName: "КПП Производство",
    checkpointId: "cp4",
    branchName: "Филиал Шымкент",
    agencyName: "ТОО «Защита Плюс»",
    shiftType: "day",
    visitId: "v4",
    direction: "entry",
  },
  {
    id: "p5",
    guardName: "Бауыржан Кенжебеков",
    guardId: "g5",
    timestamp: new Date(2025, 10, 3, 8, 0),
    checkpointName: "КПП Главный въезд",
    checkpointId: "cp1",
    branchName: "Филиал Алматы",
    agencyName: "ТОО «Казахстан Секьюрити»",
    shiftType: "day",
    visitId: "v5",
    direction: "entry",
  },
  {
    id: "p6",
    guardName: "Марат Әбдіғали",
    guardId: "g6",
    timestamp: new Date(2025, 10, 3, 20, 15),
    checkpointName: "КПП Склад №2",
    checkpointId: "cp5",
    branchName: "Филиал Караганда",
    agencyName: "ТОО «Надежная Охрана»",
    shiftType: "night",
    visitId: "v6",
    direction: "entry",
  },
  {
    id: "p7",
    guardName: "Серік Жақыпов",
    guardId: "g7",
    timestamp: new Date(2025, 10, 4, 8, 45),
    checkpointName: "КПП Административное здание",
    checkpointId: "cp6",
    branchName: "Филиал Астана",
    agencyName: "ТОО «Казахстан Секьюрити»",
    shiftType: "day",
    visitId: "v7",
    direction: "entry",
  },
  {
    id: "p8",
    guardName: "Болат Қасымбеков",
    guardId: "g8",
    timestamp: new Date(2025, 10, 4, 9, 0),
    checkpointName: "КПП Парковка",
    checkpointId: "cp7",
    branchName: "Филиал Атырау",
    agencyName: "ТОО «Защита Плюс»",
    shiftType: "day",
    visitId: "v8",
    direction: "entry",
  },
];

export function PhotoGallery() {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedShift, setSelectedShift] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(true);

  // Уникальные значения для фильтров
  const agencies = useMemo(
    () => Array.from(new Set(MOCK_PHOTOS.map((p) => p.agencyName))),
    []
  );
  const branches = useMemo(
    () => Array.from(new Set(MOCK_PHOTOS.map((p) => p.branchName))),
    []
  );

  // Фильтрация фотографий
  const filteredPhotos = useMemo(() => {
    return MOCK_PHOTOS.filter((photo) => {
      const matchesSearch =
        searchQuery === "" ||
        photo.guardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.checkpointName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAgency =
        selectedAgency === "all" || photo.agencyName === selectedAgency;

      const matchesBranch =
        selectedBranch === "all" || photo.branchName === selectedBranch;

      const matchesShift =
        selectedShift === "all" || photo.shiftType === selectedShift;

      const matchesDate =
        selectedDate === "all" ||
        (selectedDate === "today" &&
          format(photo.timestamp, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")) ||
        (selectedDate === "yesterday" &&
          format(photo.timestamp, "yyyy-MM-dd") ===
            format(new Date(Date.now() - 86400000), "yyyy-MM-dd"));

      return (
        matchesSearch &&
        matchesAgency &&
        matchesBranch &&
        matchesShift &&
        matchesDate
      );
    });
  }, [searchQuery, selectedAgency, selectedBranch, selectedShift, selectedDate]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedAgency("all");
    setSelectedBranch("all");
    setSelectedShift("all");
    setSelectedDate("all");
  };

  const activeFiltersCount = [
    searchQuery !== "",
    selectedAgency !== "all",
    selectedBranch !== "all",
    selectedShift !== "all",
    selectedDate !== "all",
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground mb-2">Фото-вступления на смену</h1>
          <p className="text-muted-foreground">
            Галерея фотографий охранников при вступлении на смену
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Всего фотографий: {MOCK_PHOTOS.length}
          </Badge>
          <Badge variant="outline">
            Показано: {filteredPhotos.length}
          </Badge>
        </div>
      </div>

      {/* Filters */}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
              >
                <X className="w-4 h-4 mr-2" />
                Сбросить
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Скрыть" : "Показать"}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Поиск</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Имя или КПП..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Date */}
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

            {/* Agency */}
            <div className="space-y-2">
              <Label>Агентство</Label>
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
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

            {/* Branch */}
            <div className="space-y-2">
              <Label>Филиал</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
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

            {/* Shift */}
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

      {/* Photo Grid */}
      {filteredPhotos.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Нет фотографий, соответствующих выбранным фильтрам
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <Card
              key={photo.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => setSelectedPhoto(photo)}
            >
              <div className="aspect-square relative overflow-hidden bg-slate-100 flex items-center justify-center">
                <Avatar className="w-32 h-32">
                  <AvatarFallback className="text-3xl">
                    {photo.guardName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute top-2 right-2">
                  <StatusBadge status={photo.shiftType} />
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{photo.checkpointName}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Photo Detail Dialog */}
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

              <div className="grid md:grid-cols-2 gap-6">
                {/* Photo */}
                <div className="space-y-4">
                  <div className="aspect-square relative overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
                    <Avatar className="w-48 h-48">
                      <AvatarFallback className="text-6xl">
                        {selectedPhoto.guardName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-muted-foreground mb-1">Охранник</h3>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-foreground">{selectedPhoto.guardName}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-muted-foreground mb-1">Время вступления</h3>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-primary" />
                      <span className="text-foreground">
                        {format(selectedPhoto.timestamp, "dd MMMM yyyy, HH:mm", {
                          locale: ru,
                        })}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-muted-foreground mb-1">Смена</h3>
                    <StatusBadge status={selectedPhoto.shiftType} />
                  </div>

                  <div>
                    <h3 className="text-muted-foreground mb-1">КПП</h3>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-foreground">
                        {selectedPhoto.checkpointName}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-muted-foreground mb-1">Филиал</h3>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="text-foreground">{selectedPhoto.branchName}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-muted-foreground mb-1">Агентство</h3>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-foreground">{selectedPhoto.agencyName}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      ID визита: <span className="text-foreground">{selectedPhoto.visitId}</span>
                    </div>
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
