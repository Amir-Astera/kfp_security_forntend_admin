import { ReactNode, useState, useEffect, useMemo } from "react";
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
import type { Guard } from "../types";

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
}

export function AppLayout({ 
  children, 
  currentPage, 
  onPageChange,
  userRole = "superadmin",
  userName = "Администратор",
  userId = "",
  onLogout
}: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [guardInfo, setGuardInfo] = useState<{ shift: string; checkpoint: string } | null>(null);
  const [showHandoverDialog, setShowHandoverDialog] = useState(false);
  const [guardData, setGuardData] = useState<Guard | null>(null);

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
    if (userRole === "guard" && userId) {
      const guard = db.getGuardById ? db.getGuardById(userId) : null;
      setGuardData(guard);
      
      if (guard) {
        const checkpointData = db.getCheckpointById ? db.getCheckpointById(guard.checkpointId) : null;
        const shiftStart = localStorage.getItem(`guard_shift_start_${userId}`);
        
        if (shiftStart && checkpointData) {
          setGuardInfo({
            shift: `${guard.shiftStart} - ${guard.shiftEnd}`,
            checkpoint: checkpointData.name
          });
        }
      }
    }
  }, [userRole, userId]);

  const handleShiftHandover = () => {
    // Закрываем сессию и делаем logout
    if (userId) {
      localStorage.removeItem(`guard_shift_start_${userId}`);
    }
    if (onLogout) {
      onLogout();
    }
  };

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
              {userRole === "guard" && guardInfo && (
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
          onSuccess={handleShiftHandover}
        />
      )}
    </div>
  );
}