import { useState, useMemo } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { User, Truck, Search, LogOut, Clock, Phone, Building2, Target, MapPin, X } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { db } from "../services";
import type { Visit } from "../types";

// Функция для подсветки совпадений
const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-foreground font-medium">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

export function GuardExitRegistration() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isTransportMode, setIsTransportMode] = useState(false);

  // Получаем визиты на территории
  const visits = db.getVisits ? db.getVisits() : [];
  const onSiteVisits = visits.filter((v) => v.status === "on-site");

  // Фильтрация по типу и поисковому запросу
  const filteredVisits = useMemo(() => {
    let filtered = onSiteVisits;

    // Фильтр по типу (гость/транспорт)
    if (isTransportMode) {
      filtered = filtered.filter((v) => v.hasVehicle);
    } else {
      filtered = filtered.filter((v) => !v.hasVehicle);
    }

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((v) => {
        if (isTransportMode) {
          // Для транспорта: поиск по гос. номеру, ТТН
          return (
            v.vehicleNumber?.toLowerCase().includes(query) ||
            v.ttn?.toLowerCase().includes(query) ||
            v.fullName.toLowerCase().includes(query)
          );
        } else {
          // Для гостей: поиск по ФИО, ИИН
          return (
            v.fullName.toLowerCase().includes(query) ||
            v.iin.includes(query) ||
            v.company.toLowerCase().includes(query)
          );
        }
      });
    }

    return filtered;
  }, [onSiteVisits, isTransportMode, searchQuery]);

  const handleExit = (visit: Visit) => {
    const confirmed = window.confirm(
      `Зарегистрировать выезд для:\n${visit.fullName}\n${visit.company}?`
    );

    if (confirmed) {
      try {
        const now = new Date();
        const exitTime = `${now.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })} ${now.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;

        if (db.updateVisit) {
          db.updateVisit(visit.id, {
            exitTime,
            status: "exited",
          });
        }

        // Звуковое уведомление
        const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBCh+zPLTgjMGHm7A7+OZRQ0PVKzn77BdGA==");
        audio.play().catch(() => {});

        toast.success("✅ Выезд зарегистрирован", {
          description: `${visit.fullName} покинул территорию`,
        });

        setSearchQuery("");
      } catch (error) {
        console.error("Ошибка регистрации выезда:", error);
        toast.error("Ошибка при регистрации выезда");
      }
    }
  };

  const calculateTimeOnSite = (entryTime: string): string => {
    try {
      const [datePart, timePart] = entryTime.split(" ");
      const [day, month, year] = datePart.split(".");
      const [hours, minutes] = timePart.split(":");
      
      const entry = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );
      
      const now = new Date();
      const diffMs = now.getTime() - entry.getTime();
      const hours2 = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes2 = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours2}ч ${minutes2}м`;
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-6">
      {/* Переключатель типа */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <User className={`h-5 w-5 ${!isTransportMode ? "text-primary" : "text-muted-foreground"}`} />
          <span className={!isTransportMode ? "text-foreground" : "text-muted-foreground"}>
            Гость
          </span>
        </div>
        <Switch checked={isTransportMode} onCheckedChange={setIsTransportMode} />
        <div className="flex items-center gap-2">
          <Truck className={`h-5 w-5 ${isTransportMode ? "text-primary" : "text-muted-foreground"}`} />
          <span className={isTransportMode ? "text-foreground" : "text-muted-foreground"}>
            Транспорт
          </span>
        </div>
      </div>

      <Separator />

      {/* Поле поиска */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder={
            isTransportMode
              ? "Поиск по гос. номеру, ТТН или ФИО водителя..."
              : "Поиск по ФИО, ИИН или компании..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Результаты поиска */}
      <div className="space-y-3">
        {filteredVisits.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery.trim()
                ? "По вашему запросу ничего не найдено"
                : `Нет ${isTransportMode ? "транспорта" : "гостей"} на территории`}
            </p>
          </Card>
        ) : (
          filteredVisits.map((visit) => (
            <Card key={visit.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-4">
                {/* Иконка */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {visit.hasVehicle ? (
                    <Truck className="h-6 w-6 text-primary" />
                  ) : (
                    <User className="h-6 w-6 text-primary" />
                  )}
                </div>

                {/* Информация */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-foreground">{visit.fullName}</h4>
                      <p className="text-muted-foreground">
                        ИИН: {visit.iin}
                      </p>
                    </div>
                    <Badge variant="secondary">На территории</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{visit.company}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{visit.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      <span>{visit.purpose}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        Въезд: {visit.entryTime} • {calculateTimeOnSite(visit.entryTime)}
                      </span>
                    </div>
                    {visit.places && visit.places.length > 0 && (
                      <div className="flex items-center gap-2 col-span-2">
                        <MapPin className="h-4 w-4" />
                        <span>{visit.places.join(", ")}</span>
                      </div>
                    )}
                  </div>

                  {/* Информация о транспорте */}
                  {visit.hasVehicle && (
                    <div className="pt-2 mt-2 border-t space-y-1">
                      <div className="grid grid-cols-2 gap-x-6 text-muted-foreground">
                        {visit.vehicleNumber && (
                          <div>
                            <span className="text-foreground">Гос. номер:</span> {visit.vehicleNumber}
                          </div>
                        )}
                        {visit.techPassport && (
                          <div>
                            <span className="text-foreground">Тех. паспорт:</span> {visit.techPassport}
                          </div>
                        )}
                        {visit.ttn && (
                          <div>
                            <span className="text-foreground">ТТН:</span> {visit.ttn}
                          </div>
                        )}
                        {visit.cargoType && (
                          <div>
                            <span className="text-foreground">Груз:</span> {visit.cargoType}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Кнопка выезда */}
                <Button onClick={() => handleExit(visit)} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Выезд
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Счетчик */}
      {filteredVisits.length > 0 && (
        <p className="text-center text-muted-foreground">
          Показано {filteredVisits.length} из {onSiteVisits.length} на территории
        </p>
      )}
    </div>
  );
}