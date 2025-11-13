import { useState, useEffect } from "react";
import { LoginPage } from "./components/LoginPage";
import { AppLayout } from "./components/AppLayout";
import { SuperadminDashboard } from "./components/SuperadminDashboard";
import { AgencyDashboard } from "./components/AgencyDashboard";
import { GuardDashboard } from "./components/GuardDashboard";
import { BranchesList } from "./components/BranchesList";
import { CheckpointsList } from "./components/CheckpointsList";
import { AgenciesList } from "./components/AgenciesList";
import { VisitsList } from "./components/VisitsList";
import { GuardsList } from "./components/GuardsList";
import { AgencyGuardsManager } from "./components/AgencyGuardsManager";
import { AgencyTimesheet } from "./components/AgencyTimesheet";
import { ScheduleManager } from "./components/ScheduleManager";
import { PhotoGallery } from "./components/PhotoGallery";
import { ReportsPage } from "./components/ReportsPage";
import { EmptyState } from "./components/EmptyState";
import { Settings } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { db } from "./services";
import type { AuthResponse } from "./types";

type UserRole = "superadmin" | "agency" | "guard";

interface LoginSuccessPayload {
  role: UserRole;
  userName: string;
  userId: string;
  tokens: AuthResponse;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [userRole, setUserRole] = useState<UserRole>("superadmin");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [authTokens, setAuthTokens] = useState<AuthResponse | null>(null);

  // Инициализация базы данных при загрузке приложения
  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log('🚀 Инициализация базы данных...');
        await db.initialize();
        setIsDbInitialized(true);
        console.log('✅ База данных готова к использованию');
        
        // Для тестирования в консоли браузера
        if (typeof window !== 'undefined') {
          (window as any).db = db;
          (window as any).resetDatabase = async () => {
            console.log('🔄 Сброс базы данных...');
            db.clearDatabase();
            await db.initialize();
            console.log('✅ База данных сброшена. Перезагрузите страницу.');
            window.location.reload();
          };
          (window as any).showGuards = () => {
            console.log('📋 Список всех охранников с учетными данными:');
            const guards = db.getGuards ? db.getGuards() : [];
            guards.forEach((guard, index) => {
              console.log(`\n${index + 1}. ${guard.fullName}`);
              console.log(`   Email: ${guard.loginEmail}`);
              console.log(`   Пароль: ${guard.password || 'НЕ УСТАНОВЛЕН'}`);
              console.log(`   Статус: ${guard.status}`);
            });
            console.log(`\n✅ Всего охранников: ${guards.length}`);
          };
          (window as any).fixPasswords = () => {
            console.log('🔧 Исправление паролей...');
            const guards = db.getGuards ? db.getGuards() : [];
            let fixed = 0;
            guards.forEach((guard) => {
              if (!guard.password || guard.password === 'null') {
                console.log(`⚙️ Установка пароля для ${guard.fullName} (${guard.loginEmail})`);
                db.updateGuard(guard.id, { password: 'password123' });
                fixed++;
              }
            });
            console.log(`✅ Исправлено паролей: ${fixed}`);
            console.log('💡 Теперь используйте window.showGuards() для проверки');
          };
          console.log('💡 Совет: Используйте window.db для тестирования в консоли');
          console.log('💡 Для сброса базы данных введите: window.resetDatabase()');
          console.log('💡 Для просмотра списка охранников: window.showGuards()');
          console.log('💡 Для исправления NULL паролей: window.fixPasswords()');
        }
      } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
      }
    };

    initDatabase();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedTokens = window.localStorage.getItem("authTokens");
      const storedRole = window.localStorage.getItem("authRole");
      const storedName = window.localStorage.getItem("authUserName");
      const storedId = window.localStorage.getItem("authUserId");

      if (storedTokens && storedRole && storedName && storedId) {
        const parsedTokens = JSON.parse(storedTokens) as AuthResponse;
        if (parsedTokens?.accessToken && parsedTokens?.tokenType) {
          setAuthTokens(parsedTokens);
          setUserRole(storedRole as UserRole);
          setUserName(storedName);
          setUserId(storedId);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error("Ошибка восстановления сессии", error);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("authTokens");
        window.localStorage.removeItem("authRole");
        window.localStorage.removeItem("authUserName");
        window.localStorage.removeItem("authUserId");
      }
    }
  }, []);

  const handleLogin = ({ role, userName, userId, tokens }: LoginSuccessPayload) => {
    setUserRole(role);
    setUserName(userName);
    setUserId(userId);
    setAuthTokens(tokens);
    setIsAuthenticated(true);
    setCurrentPage("dashboard");

    if (typeof window !== "undefined") {
      window.localStorage.setItem("authTokens", JSON.stringify(tokens));
      window.localStorage.setItem("authRole", role);
      window.localStorage.setItem("authUserName", userName);
      window.localStorage.setItem("authUserId", userId);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole("superadmin");
    setUserName("");
    setUserId("");
    setCurrentPage("dashboard");
    setAuthTokens(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("authTokens");
      window.localStorage.removeItem("authRole");
      window.localStorage.removeItem("authUserName");
      window.localStorage.removeItem("authUserId");
    }
  };

  const renderPage = () => {
    // Разделение страниц по ролям
    if (userRole === "superadmin") {
      switch (currentPage) {
        case "dashboard":
          return <SuperadminDashboard />;
        case "branches":
          return <BranchesList authTokens={authTokens} />;
        case "checkpoints":
          return <CheckpointsList authTokens={authTokens} />;
        case "agencies":
          return <AgenciesList authTokens={authTokens} />;
        case "guards":
          return <GuardsList authTokens={authTokens} />;
        case "visits":
          return <VisitsList />;
        case "schedule":
          return <ScheduleManager />;
        case "photo-gallery":
          return <PhotoGallery />;
        case "reports":
          return <ReportsPage />;
        case "settings":
          return (
            <EmptyState
              icon={Settings}
              title="Настройки системы"
              description="Здесь будут технические параметры системы, справочники и настройки безопасности. Раздел будет доступен в Этапе 5."
            />
          );
        default:
          return <SuperadminDashboard />;
      }
    } else if (userRole === "agency") {
      // Интерфейс агентства
      switch (currentPage) {
        case "dashboard":
          return <AgencyDashboard />;
        case "guards":
          return <AgencyGuardsManager />;
        case "timesheet":
          return <AgencyTimesheet />;
        case "schedule":
          return <ScheduleManager />;
        case "photo-gallery":
          return <PhotoGallery />;
        case "reports":
          return <ReportsPage />;
        default:
          return <AgencyDashboard />;
      }
    } else if (userRole === "guard") {
      // Интерфейс охранника - только дашборд
      return <GuardDashboard guardId={userId} guardName={userName} onLogout={handleLogout} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <AppLayout
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        userRole={userRole}
        userName={userName}
        userId={userId}
        onLogout={handleLogout}
      >
        {renderPage()}
      </AppLayout>
      <Toaster />
    </>
  );
}