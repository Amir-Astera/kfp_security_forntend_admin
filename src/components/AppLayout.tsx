import { ReactNode, useState, useEffect, useMemo, useCallback } from "react";
import { 
  LayoutDashboard, 
  Building2, 
  MapPin, 
  Shield, 
  Users, 
  ClipboardList, 
  FileText, 
  Settings,
  Menu,
  Bell,
  User,
  ChevronDown,
  LogOut,
  Camera,
  CalendarDays,
  ClipboardCheck,
  Clock,
  ArrowRightLeft
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { db } from "../services";
import { ShiftHandoverDialog } from "./ShiftHandoverDialog";
import type { AuthResponse, Guard, GuardShiftEventDetail } from "../types";
import { closeGuardSessions } from "../api/sessions";
import { getTodayGuardShift, finishTodayGuardShift } from "../api/guardShifts";
import { getGuardById as fetchGuardById } from "../api/guards";
import { toast } from "sonner";

type UserRole = "superadmin" | "agency" | "guard";

interface MenuItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["superadmin", "agency"] },
  { id: "branches", label: "Филиалы", icon: Building2, roles: ["superadmin"] },
  { id: "checkpoints", label: "КПП", icon: MapPin, roles: ["superadmin"] },
  { id: "agencies", label: "Агентства", icon: Shield, roles: ["superadmin"] },
  { id: "guards", label: "Охранники", icon: Users, roles: ["superadmin", "agency"] },
  { id: "timesheet", label: "Табель", icon: ClipboardCheck, roles: ["agency"] },
  { id: "visits", label: "Визиты", icon: ClipboardList, roles: ["superadmin"] },
  { id: "schedule", label: "Расписание смен", icon: CalendarDays, roles: ["superadmin", "agency"] },
  { id: "photo-gallery", label: "Фото-вступления", icon: Camera, roles: ["superadmin", "agency"] },
  { id: "reports", label: "Отчёты", icon: FileText, roles: ["superadmin", "agency"] },
  { id: "settings", label: "Настройки", icon: Settings, roles: ["superadmin"] },
];

interface AppLayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  userRole?: UserRole;
  userName?: string;
  userId?: string;
  onLogout?: () => void;
  authTokens?: AuthResponse | null;
}

export function AppLayout({
  children,
  currentPage,
  onPageChange,
  userRole = "superadmin",
  userName = "Администратор",
  userId = "",
  onLogout,
  authTokens,
}: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [guardInfo, setGuardInfo] = useState<{ shift: string; checkpoint: string } | null>(null);
  const [showHandoverDialog, setShowHandoverDialog] = useState(false);
  const [guardData, setGuardData] = useState<Guard | null>(null);

  const authHeaders = useMemo(() => {
    if (!authTokens?.accessToken || !authTokens?.tokenType) {
      return null;
    }

    return {
      accessToken: authTokens.accessToken,
      tokenType: authTokens.tokenType,
    } as const;
  }, [authTokens]);

  const getShiftRange = useCallback(() => {
    if (!guardData) {
      return "—";
    }

    const shiftStart = guardData.shiftStart?.trim() ?? "";
    const shiftEnd = guardData.shiftEnd?.trim() ?? "";

    if (shiftStart && shiftEnd) {
      return `${shiftStart} - ${shiftEnd}`;
    }

    return shiftStart || shiftEnd || "—";
  }, [guardData]);

  const getCheckpointName = useCallback(() => {
    if (guardData?.checkpointName) {
      return guardData.checkpointName;
    }

    if (guardData?.checkpointId && db.getCheckpointById) {
      const checkpoint = db.getCheckpointById(guardData.checkpointId);
      if (checkpoint?.name) {
        return checkpoint.name;
      }
    }

    return "—";
  }, [guardData]);

  const guardHeaderDetails = useMemo(() => {
    if (!guardData) {
      return null;
    }

    const branchLabel = guardData.branchName?.trim() ?? "";
    const checkpointLabel = guardData.checkpointName?.trim() ?? "";
    const locationLabel = branchLabel && checkpointLabel
      ? `${branchLabel} - ${checkpointLabel}`
      : branchLabel || checkpointLabel || "—";

    const shiftStart = guardData.shiftStart?.trim() ?? "";
    const shiftEnd = guardData.shiftEnd?.trim() ?? "";
    const shiftRange = shiftStart && shiftEnd
      ? `${shiftStart}-${shiftEnd}`
      : shiftStart || shiftEnd || "—";
    const shiftLabel = `Время смены (${shiftRange})`;

    return {
      fullName: guardData.fullName || "—",
      locationLabel,
      shiftLabel,
    };
  }, [guardData]);
  
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  // Загружаем информацию о смене для охранников
  useEffect(() => {
    if (userRole !== "guard" || !userId) {
      setGuardData(null);
      return;
    }

    let isMounted = true;

    const loadGuardData = async () => {
      const localGuard = db.getGuardById ? db.getGuardById(userId) : null;

      if (isMounted) {
        setGuardData(localGuard);
      }

      if (!localGuard) {
        try {
          const remoteGuard = await fetchGuardById(userId);
          if (isMounted && remoteGuard) {
            setGuardData(remoteGuard);
          }
        } catch (error) {
          console.error("Не удалось загрузить данные охранника", error);
        }
      }
    };

    loadGuardData();

    return () => {
      isMounted = false;
    };
  }, [userId, userRole]);

  // Обновляем информацию о смене из локального хранилища
  useEffect(() => {
    if (userRole !== "guard" || !userId) {
      setGuardInfo(null);
      return;
    }

    if (typeof window === "undefined") {
      setGuardInfo(null);
      return;
    }

    if (!guardData) {
      setGuardInfo(null);
      return;
    }

    const shiftStart = window.localStorage.getItem(`guard_shift_start_${userId}`);

    if (shiftStart) {
      setGuardInfo({
        shift: getShiftRange(),
        checkpoint: getCheckpointName(),
      });
    } else {
      setGuardInfo(null);
    }
  }, [getCheckpointName, getShiftRange, guardData, userId, userRole]);

  // Обновляем статус смены через API
  useEffect(() => {
    if (!authHeaders || userRole !== "guard" || !userId) {
      return;
    }

    let isActive = true;

    getTodayGuardShift(authHeaders)
      .then((shift) => {
        if (!isActive) {
          return;
        }

        if (shift.hasShift && shift.shiftStatus === "ACTIVE") {
          const checkpointFromDb =
            guardData?.checkpointId && db.getCheckpointById
              ? db.getCheckpointById(guardData.checkpointId)
              : null;

          const checkpointLabel =
            checkpointFromDb?.name ?? guardData?.checkpointName ?? shift.checkpointName ?? "—";

          setGuardInfo({
            shift: guardData ? getShiftRange() : "Активная смена",
            checkpoint: checkpointLabel,
          });
        } else {
          setGuardInfo(null);
        }
      })
      .catch((error) => {
        console.error("Не удалось получить статус смены охранника", error);
      });

    return () => {
      isActive = false;
    };
  }, [authHeaders, getShiftRange, guardData, userId, userRole]);

  useEffect(() => {
    if (typeof window === "undefined" || userRole !== "guard") {
      return;
    }

    const handleShiftUpdated = (event: CustomEvent<GuardShiftEventDetail>) => {
      const detail = event.detail;
      if (!detail) {
        return;
      }

      if (detail.status === "ACTIVE") {
        setGuardInfo({
          shift: getShiftRange(),
          checkpoint: getCheckpointName(),
        });
      } else if (detail.status === "DONE" || detail.status === "PLANNED") {
        setGuardInfo(null);
      }
    };

    window.addEventListener(
      "guard-shift-updated",
      handleShiftUpdated as unknown as EventListener
    );

    return () => {
      window.removeEventListener(
        "guard-shift-updated",
        handleShiftUpdated as unknown as EventListener
      );
    };
  }, [getCheckpointName, getShiftRange, userId, userRole]);

  const handleShiftHandover = useCallback(async () => {
    setShowHandoverDialog(false);

    if (userRole === "guard" && userId && typeof window !== "undefined") {
      const storage = window.localStorage;
      const sessionKey = `guard_shift_session_${userId}`;
      const shiftStartKey = `guard_shift_start_${userId}`;
      const shiftIdKey = `guard_shift_id_${userId}`;
      const deviceKey = `guard_shift_device_${userId}`;

      if (!authHeaders) {
        toast.error("Нет данных авторизации для завершения смены");
        return;
      }

      const storedShiftId = storage.getItem(shiftIdKey) ?? undefined;
      const fallbackShiftId = guardData?.currentShiftId ?? undefined;
      const shiftId = storedShiftId || fallbackShiftId;

      if (!shiftId) {
        toast.error("Не удалось определить активную смену охранника");
        return;
      }

      let deviceInfo: {
        deviceFp?: string;
        deviceKind?: string;
        deviceLabel?: string;
        userAgent?: string;
      } = {};

      const rawDevice = storage.getItem(deviceKey);
      if (rawDevice) {
        try {
          deviceInfo = { ...JSON.parse(rawDevice) };
        } catch (error) {
          console.warn("Не удалось разобрать данные устройства смены", error);
        }
      }

      if (typeof navigator !== "undefined") {
        const userAgent = navigator.userAgent;
        if (!deviceInfo.userAgent) {
          deviceInfo.userAgent = userAgent;
        }
        if (!deviceInfo.deviceLabel) {
          deviceInfo.deviceLabel = userAgent;
        }
        if (!deviceInfo.deviceKind) {
          deviceInfo.deviceKind = /Mobi|Android/i.test(userAgent) ? "MOBILE" : "BROWSER";
        }
      }

      if (typeof window !== "undefined" && !deviceInfo.deviceFp) {
        const storedFp = window.localStorage.getItem("guard_device_fingerprint") ?? undefined;
        if (storedFp) {
          deviceInfo.deviceFp = storedFp;
        }
      }

      try {
        await closeGuardSessions(
          {
            shiftId,
            deviceFp: deviceInfo.deviceFp,
            deviceKind: deviceInfo.deviceKind,
            deviceLabel: deviceInfo.deviceLabel,
            userAgent: deviceInfo.userAgent,
          },
          authHeaders
        );
      } catch (error) {
        console.error("Не удалось закрыть сессии охранника", error);
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Не удалось закрыть смену";
        toast.error(message);
        return;
      }

      try {
        const finishResult = await finishTodayGuardShift(authHeaders);
        const detail: GuardShiftEventDetail = {
          status: finishResult.shiftStatus ?? "DONE",
          shiftId: finishResult.shiftId,
          finishedAt: finishResult.finishedAt,
        };
        window.dispatchEvent(
          new CustomEvent<GuardShiftEventDetail>("guard-shift-updated", { detail })
        );
      } catch (error) {
        console.error("Не удалось завершить смену", error);
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Не удалось завершить смену";
        toast.error(message);
        return;
      }

      storage.removeItem(sessionKey);
      storage.removeItem(shiftStartKey);
      storage.removeItem(shiftIdKey);
      storage.removeItem(deviceKey);
      setGuardInfo(null);
    }

    if (onLogout) {
      onLogout();
    }
  }, [authHeaders, guardData?.currentShiftId, onLogout, userId, userRole]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - скрыт для охранников */}
      {userRole !== "guard" && (
        <aside 
          className={`bg-card border-r border-border transition-all duration-300 ${
            isSidebarOpen ? "w-64" : "w-0"
          } overflow-hidden`}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <h2 className="text-foreground">KFP Security</h2>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-1">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => onPageChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* User Info */}
            <div className="p-4 border-t border-border">
              <div className="text-muted-foreground mb-1">
                {userRole === "superadmin" ? "Суперадминистратор" : "Агентство"}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Кнопка меню скрыта для охранников */}
              {userRole !== "guard" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
              )}
              <div>
                {userRole === "guard" && guardInfo ? (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <h1 className="text-foreground">
                      Смена активна - {guardInfo.shift} <span className="text-muted-foreground">||</span> {guardInfo.checkpoint}
                    </h1>
                  </div>
                ) : userRole === "guard" && guardHeaderDetails ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                    <span className="font-semibold text-foreground">{guardHeaderDetails.fullName}</span>
                    <span className="text-muted-foreground">||</span>
                    <span className="text-foreground">{guardHeaderDetails.locationLabel}</span>
                    <span className="text-muted-foreground">||</span>
                    <span className="text-foreground">{guardHeaderDetails.shiftLabel}</span>
                  </div>
                ) : (
                  <h1 className="text-foreground">
                    {userRole === "guard"
                      ? "Рабочее место охранника"
                      : filteredMenuItems.find(item => item.id === currentPage)?.label || "Dashboard"
                    }
                  </h1>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Кнопка передачи смены для охранников */}
              {userRole === "guard" && guardData && (
                <Button
                  onClick={() => setShowHandoverDialog(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Передать смену
                </Button>
              )}

              {userRole === "guard" && guardData && (
                <Button
                  onClick={handleShiftHandover}
                  variant="destructive"
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Закончить смену
                </Button>
              )}

              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <div className="bg-primary/10 p-1.5 rounded-full">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span>{userName}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Мой профиль</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {userRole === "superadmin" && (
                    <>
                      <DropdownMenuItem onClick={() => onPageChange("settings")}>
                        <Settings className="w-4 h-4 mr-2" />
                        Настройки
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={onLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Диалог передачи смены для охранников */}
      {userRole === "guard" && guardData && (
        <ShiftHandoverDialog
          open={showHandoverDialog}
          onOpenChange={setShowHandoverDialog}
          currentGuard={guardData}
          authTokens={authTokens?.accessToken && authTokens?.tokenType ? {
            accessToken: authTokens.accessToken,
            tokenType: authTokens.tokenType,
          } : null}
          onSuccess={handleShiftHandover}
        />
      )}
    </div>
  );
}