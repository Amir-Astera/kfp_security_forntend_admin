import { ReactNode, useState } from "react";
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
  Camera
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

type UserRole = "superadmin" | "agency";

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
  { id: "visits", label: "Визиты", icon: ClipboardList, roles: ["superadmin", "agency"] },
  { id: "schedule", label: "Расписание смен", icon: FileText, roles: ["superadmin", "agency"] },
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
  onLogout?: () => void;
}

export function AppLayout({ 
  children, 
  currentPage, 
  onPageChange,
  userRole = "superadmin",
  userName = "Администратор",
  onLogout
}: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-foreground">
                  {filteredMenuItems.find(item => item.id === currentPage)?.label || "Dashboard"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
                  <DropdownMenuItem onClick={() => onPageChange("settings")}>
                    <Settings className="w-4 h-4 mr-2" />
                    Настройки
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
    </div>
  );
}
