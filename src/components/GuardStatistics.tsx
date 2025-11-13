import { useEffect, useMemo, useState } from "react";
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
import { Search, Download } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { db } from "../services";
import { fetchGuardGuestKindChart } from "../api/dashboard";
import type { AuthResponse, GuardGuestKindScope, Visit } from "../types";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

type GuestKindChartEntry = {
  kind: string;
  name: string;
  count: number;
  fill: string;
};

interface GuardStatisticsProps {
  authTokens: AuthResponse | null;
}

const GUEST_KIND_LABELS: Record<string, string> = {
  PERSON: "Гости",
  VISITOR: "Гости",
  VEHICLE: "Транспорт",
  TRANSPORT: "Транспорт",
  CAR: "Транспорт",
  EMPLOYEE: "Сотрудники",
  STAFF: "Сотрудники",
  OTHER: "Прочее",
};

const GUEST_KIND_COLORS: Record<string, string> = {
  PERSON: "#3b82f6",
  VISITOR: "#3b82f6",
  VEHICLE: "#8b5cf6",
  TRANSPORT: "#8b5cf6",
  CAR: "#8b5cf6",
  EMPLOYEE: "#22c55e",
  STAFF: "#22c55e",
  OTHER: "#94a3b8",
};

const FALLBACK_COLORS = ["#3b82f6", "#8b5cf6", "#22c55e", "#f97316", "#0ea5e9"];

export function GuardStatistics({ authTokens }: GuardStatisticsProps) {
  const [activeTab, setActiveTab] = useState("on-site");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "guest" | "transport">("all");
  const [chartDataByScope, setChartDataByScope] = useState<
    Record<GuardGuestKindScope, GuestKindChartEntry[]>
  >({
    SHIFT: [],
    PRESENT: [],
  });
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

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
  const fallbackChartData = useMemo<GuestKindChartEntry[]>(() => {
    const guests = todayVisits.filter((v) => !v.hasVehicle).length;
    const transport = todayVisits.filter((v) => v.hasVehicle).length;

    return [
      {
        kind: "PERSON",
        name: "Гости",
        count: guests,
        fill: "#3b82f6",
      },
      {
        kind: "TRANSPORT",
        name: "Транспорт",
        count: transport,
        fill: "#8b5cf6",
      },
    ];
  }, [todayVisits]);

  const normalizeGuestKindData = (items: { kind: string; count: number }[]): GuestKindChartEntry[] => {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item, index) => {
      const normalizedKind = (item.kind ?? "").toUpperCase();
      const label = GUEST_KIND_LABELS[normalizedKind] ?? item.kind ?? `Категория ${index + 1}`;
      const color =
        GUEST_KIND_COLORS[normalizedKind] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];

      return {
        kind: normalizedKind || `UNKNOWN_${index}`,
        name: label,
        count: typeof item.count === "number" ? item.count : 0,
        fill: color,
      };
    });
  };

  useEffect(() => {
    if (!authTokens?.accessToken || !authTokens?.tokenType) {
      setChartDataByScope({ SHIFT: [], PRESENT: [] });
      return;
    }

    let isMounted = true;
    setChartLoading(true);
    setChartError(null);

    const scopes: GuardGuestKindScope[] = ["PRESENT", "SHIFT"];

    Promise.all(
      scopes.map(async (scope) => {
        const data = await fetchGuardGuestKindChart(scope, authTokens);
        return [scope, normalizeGuestKindData(data)] as const;
      })
    )
      .then((results) => {
        if (!isMounted) return;

        const next: Record<GuardGuestKindScope, GuestKindChartEntry[]> = {
          SHIFT: [],
          PRESENT: [],
        };

        results.forEach(([scope, data]) => {
          next[scope] = data;
        });

        setChartDataByScope(next);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("Не удалось загрузить диаграмму гостей", error);
        setChartError(
          error instanceof Error ? error.message : "Не удалось загрузить статистику гостей"
        );
        setChartDataByScope({ SHIFT: [], PRESENT: [] });
      })
      .finally(() => {
        if (!isMounted) return;
        setChartLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authTokens]);

  const activeScope: GuardGuestKindScope = activeTab === "on-site" ? "PRESENT" : "SHIFT";
  const apiChartData = chartDataByScope[activeScope];
  const shouldUseFallback = !authTokens?.accessToken || !authTokens?.tokenType || chartError;
  const chartData = shouldUseFallback || apiChartData.length === 0 ? fallbackChartData : apiChartData;

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
          {chartLoading && (
            <p className="text-sm text-muted-foreground mb-2">Загрузка данных...</p>
          )}
          {chartError && (
            <p className="text-sm text-destructive mb-2">
              {chartError}. Показаны данные локальной базы.
            </p>
          )}
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
                {chartData.map((entry) => (
                  <Cell key={entry.kind} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {chartData.length > 0 ? (
              chartData.map((item) => (
                <div
                  key={`summary-${item.kind}`}
                  className="flex items-center justify-center md:justify-start gap-2"
                >
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill }}></div>
                  <span className="text-muted-foreground">
                    {item.name}: {item.count.toLocaleString("ru-RU")}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center md:col-span-2 lg:col-span-3">
                {chartLoading ? "Загрузка данных..." : "Нет данных для отображения"}
              </p>
            )}
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