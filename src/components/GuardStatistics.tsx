import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Search, LogOut, Download, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { db } from "../services";
import type { Visit } from "../types";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

export function GuardStatistics() {
  const [activeTab, setActiveTab] = useState("on-site");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "guest" | "transport">("all");

  // Получаем визиты
  const visits = db.getVisits ? db.getVisits() : [];
  
  // Визиты на территории
  const onSiteVisits = visits.filter((v) => v.status === "on-site");
  
  // Все визиты за сегодня
  const todayVisits = visits.filter((v) => {
    const today = new Date().toLocaleDateString("ru-RU");
    const visitDate = new Date(v.createdAt).toLocaleDateString("ru-RU");
    return visitDate === today;
  });

  // Фильтрация по поиску и типу
  const filteredVisits = useMemo(() => {
    let source = activeTab === "on-site" ? onSiteVisits : todayVisits;
    
    // Фильтр по типу: Гости / Транспорт / Все
    if (typeFilter === "guest") {
      source = source.filter((v) => !v.hasVehicle);
    } else if (typeFilter === "transport") {
      source = source.filter((v) => v.hasVehicle);
    }
    
    // Поиск
    if (!searchQuery.trim()) return source;

    const query = searchQuery.toLowerCase().trim();
    return source.filter((v) =>
      v.fullName.toLowerCase().includes(query) ||
      v.iin.includes(query) ||
      v.company.toLowerCase().includes(query) ||
      v.phone.includes(query) ||
      v.vehicleNumber?.toLowerCase().includes(query) ||
      v.purpose.toLowerCase().includes(query)
    );
  }, [activeTab, onSiteVisits, todayVisits, searchQuery, typeFilter]);

  // Данные для графика
  const chartData = useMemo(() => {
    const guests = todayVisits.filter((v) => !v.hasVehicle).length;
    const transport = todayVisits.filter((v) => v.hasVehicle).length;
    
    return [
      {
        name: "Гости",
        count: guests,
        fill: "#3b82f6"
      },
      {
        name: "Транспорт",
        count: transport,
        fill: "#8b5cf6"
      }
    ];
  }, [todayVisits]);

  const handleQuickExit = (visit: Visit) => {
    const confirmed = window.confirm(
      `Зарегистрировать выезд для:\n${visit.fullName}?`
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

        toast.success("✅ Выезд зарегистрирован");
      } catch (error) {
        console.error("Ошибка:", error);
        toast.error("Ошибка при регистрации выезда");
      }
    }
  };

  const handleExport = () => {
    try {
      // Простой экспорт в CSV
      const headers = [
        "Время въезда",
        "Время выезда",
        "ФИО",
        "ИИН",
        "Компания",
        "Цель визита",
        "Телефон",
        "Транспорт",
        "Время на территории",
      ];

      const rows = filteredVisits.map((v) => [
        v.entryTime,
        v.exitTime || "На территории",
        v.fullName,
        v.iin,
        v.company,
        v.purpose,
        v.phone,
        v.vehicleNumber || "—",
        v.timeOnSite || "—",
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `statistika_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();

      toast.success("Данные экспортированы");
    } catch (error) {
      console.error("Ошибка экспорта:", error);
      toast.error("Ошибка при экспорте");
    }
  };

  const handleExportXLSX = () => {
    try {
      // Простой экспорт в XLSX
      const headers = [
        "Время въезда",
        "Время выезда",
        "ФИО",
        "ИИН",
        "Компания",
        "Цель визита",
        "Телефон",
        "Транспорт",
        "Время на территории",
      ];

      const rows = filteredVisits.map((v) => [
        v.entryTime,
        v.exitTime || "На территории",
        v.fullName,
        v.iin,
        v.company,
        v.purpose,
        v.phone,
        v.vehicleNumber || "—",
        v.timeOnSite || "—",
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Статистика");

      const blob = new Blob(
        [XLSX.write(workbook, { bookType: "xlsx", type: "array" })],
        { type: "application/octet-stream" }
      );
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `statistika_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();

      toast.success("Данные экспортированы");
    } catch (error) {
      console.error("Ошибка экспорта:", error);
      toast.error("Ошибка при экспорте");
    }
  };

  return (
    <div className="space-y-6">
      {/* График Гости vs Транспорт */}
      <Card>
        <CardHeader>
          <CardTitle>Гости vs Транспорт</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Bar 
                dataKey="count" 
                fill="#3b82f6" 
                radius={[8, 8, 0, 0]}
                name="Количество"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#3b82f6" }}></div>
              <span className="text-muted-foreground">Гости: {chartData[0]?.count || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#8b5cf6" }}></div>
              <span className="text-muted-foreground">Транспорт: {chartData[1]?.count || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Вкладки */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="on-site">
              На территории ({onSiteVisits.length})
            </TabsTrigger>
            <TabsTrigger value="all-shift">
              Все за смену ({todayVisits.length})
            </TabsTrigger>
          </TabsList>

          <Button onClick={handleExportXLSX} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Экспорт
          </Button>
        </div>

        {/* Поиск */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по ФИО, ИИН, компании..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Тип фильтрации */}
        <div className="relative mb-4">
          <Select onValueChange={setTypeFilter} value={typeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Тип фильтрации" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="guest">Гости</SelectItem>
              <SelectItem value="transport">Транспорт</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Таблицы */}
        <TabsContent value="on-site" className="mt-0">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Время въезда</TableHead>
                  <TableHead>Время выезда</TableHead>
                  <TableHead>ФИО</TableHead>
                  <TableHead>ИИН</TableHead>
                  <TableHead>Компания</TableHead>
                  <TableHead>Цель</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Транспорт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {searchQuery.trim() ? "Ничего не найдено" : "Нет гостей на территории"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVisits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell>{visit.entryTime}</TableCell>
                      <TableCell>{visit.exitTime || "—"}</TableCell>
                      <TableCell className="text-foreground">{visit.fullName}</TableCell>
                      <TableCell>{visit.iin}</TableCell>
                      <TableCell>{visit.company}</TableCell>
                      <TableCell>{visit.purpose}</TableCell>
                      <TableCell>{visit.phone}</TableCell>
                      <TableCell>
                        {visit.vehicleNumber ? (
                          <Badge variant="secondary">{visit.vehicleNumber}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="all-shift" className="mt-0">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Въезд</TableHead>
                  <TableHead>Выезд</TableHead>
                  <TableHead>ФИО</TableHead>
                  <TableHead>ИИН</TableHead>
                  <TableHead>Компания</TableHead>
                  <TableHead>Цель</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Транспорт</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {searchQuery.trim() ? "Ничего не найдено" : "Нет визитов за смену"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVisits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell>{visit.entryTime}</TableCell>
                      <TableCell>{visit.exitTime || "—"}</TableCell>
                      <TableCell className="text-foreground">{visit.fullName}</TableCell>
                      <TableCell>{visit.iin}</TableCell>
                      <TableCell>{visit.company}</TableCell>
                      <TableCell>{visit.purpose}</TableCell>
                      <TableCell>{visit.phone}</TableCell>
                      <TableCell>
                        {visit.vehicleNumber ? (
                          <Badge variant="secondary">{visit.vehicleNumber}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={visit.status === "on-site" ? "default" : "outline"}>
                          {visit.status === "on-site" ? "На территории" : "Покинул"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Итого */}
      {filteredVisits.length > 0 && (
        <p className="text-center text-muted-foreground">
          Показано: {filteredVisits.length} записей
        </p>
      )}
    </div>
  );
}