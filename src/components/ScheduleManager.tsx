import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Calendar as CalendarIcon, Sun, Moon, Users, Filter, Eye } from "lucide-react";
import { ShiftDetailDialog } from "./ShiftDetailDialog";

interface ShiftEvent {
  id: string;
  guardName: string;
  guardId: string;
  date: string;
  shiftType: "day" | "night";
  timeRange: string;
  checkpoint: string;
  status: "scheduled" | "completed" | "missed";
}

const mockSchedule: ShiftEvent[] = [
  {
    id: "1",
    guardName: "Сергеев И.П.",
    guardId: "1",
    date: "2025-11-04",
    shiftType: "day",
    timeRange: "08:00 - 20:00",
    checkpoint: "КПП-1 (Главный въезд)",
    status: "completed",
  },
  {
    id: "2",
    guardName: "Абдуллаев М.С.",
    guardId: "2",
    date: "2025-11-04",
    shiftType: "day",
    timeRange: "06:00 - 18:00",
    checkpoint: "КПП-2 (Грузовой въезд)",
    status: "completed",
  },
  {
    id: "3",
    guardName: "Турсунов Б.Н.",
    guardId: "3",
    date: "2025-11-04",
    shiftType: "night",
    timeRange: "20:00 - 08:00",
    checkpoint: "КПП-4 (Универсальный)",
    status: "scheduled",
  },
  {
    id: "4",
    guardName: "Сергеев И.П.",
    guardId: "1",
    date: "2025-11-05",
    shiftType: "day",
    timeRange: "08:00 - 20:00",
    checkpoint: "КПП-1 (Главный въезд)",
    status: "scheduled",
  },
  {
    id: "5",
    guardName: "Абдуллаев М.С.",
    guardId: "2",
    date: "2025-11-05",
    shiftType: "day",
    timeRange: "06:00 - 18:00",
    checkpoint: "КПП-2 (Грузовой въезд)",
    status: "scheduled",
  },
  {
    id: "6",
    guardName: "Петров А.И.",
    guardId: "5",
    date: "2025-11-05",
    shiftType: "day",
    timeRange: "08:00 - 20:00",
    checkpoint: "КПП-1 (Главный)",
    status: "scheduled",
  },
];

const weekDays = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
const currentWeek = [
  { date: "2025-11-03", day: "ПН", dayNum: 3 },
  { date: "2025-11-04", day: "ВТ", dayNum: 4 },
  { date: "2025-11-05", day: "СР", dayNum: 5 },
  { date: "2025-11-06", day: "ЧТ", dayNum: 6 },
  { date: "2025-11-07", day: "ПТ", dayNum: 7 },
  { date: "2025-11-08", day: "СБ", dayNum: 8 },
  { date: "2025-11-09", day: "ВС", dayNum: 9 },
];

export function ScheduleManager() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2025, 10, 4));
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null);

  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  const todayShifts = mockSchedule.filter((s) => s.date === selectedDateStr);

  const getShiftsForDate = (date: string) => {
    return mockSchedule.filter((s) => s.date === date);
  };

  const handleViewShiftDetails = (shift: ShiftEvent) => {
    setSelectedShift(shift);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-1">Расписание смен</h2>
          <p className="text-muted-foreground">
            Управление графиком работы охранников
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="w-[240px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все филиалы</SelectItem>
              <SelectItem value="1">Алматы - Центральный офис</SelectItem>
              <SelectItem value="2">Астана - Северный</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={viewMode}
            onValueChange={(v: "week" | "month") => setViewMode(v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground">Смен сегодня</p>
              <p className="text-2xl text-foreground">{todayShifts.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <Sun className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-muted-foreground">Дневных</p>
              <p className="text-2xl text-foreground">
                {todayShifts.filter((s) => s.shiftType === "day").length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-info/10 rounded-lg">
              <Moon className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-muted-foreground">Ночных</p>
              <p className="text-2xl text-foreground">
                {todayShifts.filter((s) => s.shiftType === "night").length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-warning/10 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-muted-foreground">Завершено</p>
              <p className="text-2xl text-foreground">
                {todayShifts.filter((s) => s.status === "completed").length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Календарь
          </h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border"
          />
        </Card>

        {/* Today's Shifts */}
        <Card className="col-span-2 p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Смены на {selectedDate.toLocaleDateString("ru-RU")}
          </h3>

          {todayShifts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Нет смен на выбранную дату
            </div>
          ) : (
            <div className="space-y-3">
              {todayShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {shift.guardName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-foreground">{shift.guardName}</p>
                      <p className="text-muted-foreground">{shift.checkpoint}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {shift.shiftType === "day" ? (
                        <Sun className="w-4 h-4 text-warning" />
                      ) : (
                        <Moon className="w-4 h-4 text-info" />
                      )}
                      <span className="text-muted-foreground">
                        {shift.timeRange}
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className={
                        shift.status === "completed"
                          ? "bg-success/10 text-success border-success/20"
                          : shift.status === "missed"
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-info/10 text-info border-info/20"
                      }
                    >
                      {shift.status === "completed"
                        ? "Завершена"
                        : shift.status === "missed"
                        ? "Пропущена"
                        : "Запланирована"}
                    </Badge>

                    {shift.status === "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewShiftDetails(shift)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Детали
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Week View */}
      {viewMode === "week" && (
        <Card className="p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Расписание на неделю
          </h3>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid grid-cols-8 gap-2 mb-2">
                <div className="p-2 text-muted-foreground">Охранник</div>
                {currentWeek.map((day) => (
                  <div
                    key={day.date}
                    className={`p-2 text-center rounded-t-lg ${
                      day.date === selectedDateStr
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div>{day.day}</div>
                    <div className="text-xs">{day.dayNum} ноя</div>
                  </div>
                ))}
              </div>

              {/* Guards Rows */}
              <div className="space-y-2">
                {["Сергеев И.П.", "Абдуллаев М.С.", "Турсунов Б.Н.", "Петров А.И."].map(
                  (guardName, idx) => (
                    <div key={idx} className="grid grid-cols-8 gap-2">
                      <div className="p-3 bg-muted/50 rounded-lg flex items-center">
                        <p className="text-foreground">{guardName}</p>
                      </div>
                      {currentWeek.map((day) => {
                        const shifts = getShiftsForDate(day.date).filter(
                          (s) => s.guardName === guardName
                        );
                        return (
                          <div
                            key={day.date}
                            className="p-2 bg-muted/50 rounded-lg min-h-[60px]"
                          >
                            {shifts.map((shift) => (
                              <div
                                key={shift.id}
                                className={`text-xs p-1.5 rounded mb-1 ${
                                  shift.shiftType === "day"
                                    ? "bg-warning/20 text-warning"
                                    : "bg-info/20 text-info"
                                }`}
                              >
                                {shift.shiftType === "day" ? "☀️" : "🌙"}{" "}
                                {shift.timeRange.split(" - ")[0]}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Month View */}
      {viewMode === "month" && (
        <Card className="p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Расписание на месяц - Ноябрь 2025
          </h3>

          <div className="space-y-6">
            {/* Month Calendar View */}
            <div className="grid grid-cols-7 gap-2">
              {/* Headers */}
              {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-muted-foreground border-b"
                >
                  {day}
                </div>
              ))}

              {/* Days of November 2025 (starting from Saturday Nov 1) */}
              {/* Empty cells for days before month starts */}
              {[...Array(5)].map((_, i) => (
                <div key={`empty-${i}`} className="p-2 bg-muted/20 rounded-lg min-h-[80px]" />
              ))}

              {/* Days 1-30 */}
              {[...Array(30)].map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `2025-11-${String(dayNum).padStart(2, "0")}`;
                const dayShifts = getShiftsForDate(dateStr);
                const isToday = dateStr === selectedDateStr;

                return (
                  <div
                    key={dayNum}
                    className={`p-2 rounded-lg border min-h-[80px] ${
                      isToday
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className={`text-sm mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>
                      {dayNum}
                    </div>
                    <div className="space-y-1">
                      {dayShifts.slice(0, 2).map((shift) => (
                        <div
                          key={shift.id}
                          className={`text-xs p-1 rounded truncate ${
                            shift.shiftType === "day"
                              ? "bg-warning/20 text-warning"
                              : "bg-info/20 text-info"
                          }`}
                          title={`${shift.guardName} - ${shift.checkpoint}`}
                        >
                          {shift.shiftType === "day" ? "☀️" : "🌙"}{" "}
                          {shift.guardName.split(" ")[0]}
                        </div>
                      ))}
                      {dayShifts.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayShifts.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-warning/20"></div>
                <span className="text-muted-foreground">Дневная смена</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-info/20"></div>
                <span className="text-muted-foreground">Ночная смена</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-primary"></div>
                <span className="text-muted-foreground">Сегодня</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline">
          <CalendarIcon className="w-4 h-4 mr-2" />
          Экспорт расписания
        </Button>
        <Button variant="outline">Создать шаблон</Button>
      </div>

      {/* Shift Detail Dialog */}
      {selectedShift && (
        <ShiftDetailDialog
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
        />
      )}
    </div>
  );
}