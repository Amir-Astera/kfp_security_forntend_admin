import { useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { AppLayout } from "./components/AppLayout";
import { SuperadminDashboard } from "./components/SuperadminDashboard";
import { AgencyDashboard } from "./components/AgencyDashboard";
import { BranchesList } from "./components/BranchesList";
import { CheckpointsList } from "./components/CheckpointsList";
import { AgenciesList } from "./components/AgenciesList";
import { VisitsList } from "./components/VisitsList";
import { GuardsList } from "./components/GuardsList";
import { AgencyGuardsManager } from "./components/AgencyGuardsManager";
import { AgencyVisitsList } from "./components/AgencyVisitsList";
import { ScheduleManager } from "./components/ScheduleManager";
import { PhotoGallery } from "./components/PhotoGallery";
import { ReportsPage } from "./components/ReportsPage";
import { EmptyState } from "./components/EmptyState";
import { Settings } from "lucide-react";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [userRole, setUserRole] = useState<"superadmin" | "agency">("superadmin");
  const [userName, setUserName] = useState("");

  const handleLogin = (role: "superadmin" | "agency", name: string) => {
    setUserRole(role);
    setUserName(name);
    setIsAuthenticated(true);
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole("superadmin");
    setUserName("");
    setCurrentPage("dashboard");
  };

  const renderPage = () => {
    // Разделение страниц по ролям
    if (userRole === "superadmin") {
      switch (currentPage) {
        case "dashboard":
          return <SuperadminDashboard />;
        case "branches":
          return <BranchesList />;
        case "checkpoints":
          return <CheckpointsList />;
        case "agencies":
          return <AgenciesList />;
        case "guards":
          return <GuardsList />;
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
    } else {
      // Интерфейс агентства
      switch (currentPage) {
        case "dashboard":
          return <AgencyDashboard />;
        case "guards":
          return <AgencyGuardsManager />;
        case "visits":
          return <AgencyVisitsList />;
        case "schedule":
          return <ScheduleManager />;
        case "photo-gallery":
          return <PhotoGallery />;
        case "reports":
          return <ReportsPage />;
        default:
          return <AgencyDashboard />;
      }
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
        onLogout={handleLogout}
      >
        {renderPage()}
      </AppLayout>
      <Toaster />
    </>
  );
}
