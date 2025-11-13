import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { GuardEntryRegistration } from "./GuardEntryRegistration";
import { GuardExitRegistration } from "./GuardExitRegistration";
import { GuardStatistics } from "./GuardStatistics";
import { StartWorkDialog } from "./StartWorkDialog";
import { LogIn, LogOut, BarChart3, Users, UserCheck, UserX } from "lucide-react";
import { db } from "../services";
import { fetchGuardDashboardCards } from "../api/dashboard";
import type {
  AuthResponse,
  Branch,
  Checkpoint,
  Guard,
  GuardDashboardCardsResponse,
} from "../types";

interface GuardDashboardProps {
  guardId: string;
  guardName: string;
  onLogout: () => void;
  authTokens: AuthResponse | null;
}

export function GuardDashboard({ guardId, guardName, onLogout, authTokens }: GuardDashboardProps) {
  const [activeTab, setActiveTab] = useState("entry");
  const [workStarted, setWorkStarted] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [guard, setGuard] = useState<Guard | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [loadingGuard, setLoadingGuard] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cardsData, setCardsData] = useState<GuardDashboardCardsResponse | null>(null);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);

  // Загружаем данные охранника
  useEffect(() => {
    let isMounted = true;
    let retryTimeout: number | null = null;
    let attempts = 0;

    const resetState = () => {
      setGuard(null);
      setBranch(null);
      setCheckpoint(null);
      setWorkStarted(false);
      setShowStartDialog(false);
    };

    const resolveGuard = (): Guard | null => {
      if (!db.getGuards) {
        return null;
      }

      let guardData = guardId && db.getGuardById ? db.getGuardById(guardId) : null;

      if (!guardData) {
        const guards = db.getGuards();
        const normalizedName = guardName?.trim().toLowerCase();

        if (normalizedName) {
          guardData = guards.find((g) =>
            g.loginEmail?.toLowerCase() === normalizedName ||
            g.fullName.toLowerCase() === normalizedName
          ) ?? null;
        }

        if (!guardData && guardId) {
          guardData = guards.find((g) => g.id === guardId) ?? null;
        }
      }

      return guardData ?? null;
    };

    const loadGuardData = () => {
      if (!isMounted) {
        return;
      }

      const guardData = resolveGuard();

      if (guardData) {
        const branchData = db.getBranchById ? db.getBranchById(guardData.branchId) : null;
        const checkpointData = db.getCheckpointById ? db.getCheckpointById(guardData.checkpointId) : null;

        setGuard(guardData);
        setBranch(branchData ?? null);
        setCheckpoint(checkpointData ?? null);

        const shiftStart = localStorage.getItem(`guard_shift_start_${guardData.id}`);
        if (shiftStart) {
          setWorkStarted(true);
        } else {
          setShowStartDialog(true);
        }

        setLoadError(null);
        setLoadingGuard(false);
        return;
      }

      if (attempts < 10) {
        attempts += 1;
        retryTimeout = window.setTimeout(loadGuardData, 300);
      } else {
        setLoadError("Не удалось загрузить данные охранника. Обновите страницу или выполните вход снова.");
        setLoadingGuard(false);
      }
    };

    setLoadingGuard(true);
    setLoadError(null);
    resetState();
    loadGuardData();

    return () => {
      isMounted = false;
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, [guardId, guardName]);
  
  // Получаем статистику для мини-панели
  const visits = db.getVisits ? db.getVisits() : [];
  const onSite = visits.filter((v) => v.status === "on-site").length;
  const arrivedToday = visits.filter((v) => {
    const today = new Date().toLocaleDateString("ru-RU");
    const visitDate = new Date(v.createdAt).toLocaleDateString("ru-RU");
    return visitDate === today;
  }).length;
  const exitedToday = visits.filter((v) => {
    const today = new Date().toLocaleDateString("ru-RU");
    return v.exitTime && new Date(v.exitTime).toLocaleDateString("ru-RU") === today;
  }).length;

  const fallbackCards = useMemo<GuardDashboardCardsResponse>(
    () => ({
      presentNow: onSite,
      arrivedThisShift: arrivedToday,
      leftThisShift: exitedToday,
    }),
    [arrivedToday, exitedToday, onSite]
  );

  const displayedCards = cardsData ?? fallbackCards;

  useEffect(() => {
    if (!authTokens?.accessToken || !authTokens?.tokenType) {
      setCardsData(null);
      setCardsError(null);
      setCardsLoading(false);
      return;
    }

    let isActive = true;
    setCardsLoading(true);
    setCardsError(null);

    fetchGuardDashboardCards(authTokens)
      .then((data) => {
        if (!isActive) return;
        setCardsData(data);
      })
      .catch((error) => {
        console.error("Не удалось загрузить карточки охранника", error);
        if (!isActive) return;
        setCardsError(error instanceof Error ? error.message : "Не удалось загрузить данные");
        setCardsData(null);
      })
      .finally(() => {
        if (!isActive) return;
        setCardsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [authTokens]);

  const handleStartWork = () => {
    setWorkStarted(true);
    setShowStartDialog(false);
  };

  const handleShiftHandover = () => {
    // Закрываем сессию и делаем logout
    if (guard?.id) {
      localStorage.removeItem(`guard_shift_start_${guard.id}`);
    }
    if (guardId) {
      localStorage.removeItem(`guard_shift_start_${guardId}`);
    }
    onLogout();
  };

  if (loadingGuard) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Загрузка данных охранника...</p>
      </div>
    );
  }

  if (!guard) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            {loadError ?? "Охранник не найден. Проверьте учетные данные и попробуйте снова."}
          </p>
          <Button variant="outline" onClick={onLogout}>
            Вернуться к входу
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Мини-панель статистики */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-medium">На территории</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-3xl font-semibold text-foreground">
                {cardsLoading ? "…" : displayedCards.presentNow.toLocaleString("ru-RU")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-medium">Прибыло за смену</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-3xl font-semibold text-foreground">
                {cardsLoading ? "…" : displayedCards.arrivedThisShift.toLocaleString("ru-RU")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-medium">Выбыло за смену</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-3xl font-semibold text-foreground">
                {cardsLoading ? "…" : displayedCards.leftThisShift.toLocaleString("ru-RU")}
              </div>
            </CardContent>
          </Card>
        </div>

        {cardsError && (
          <p className="text-sm text-destructive/80">
            {cardsError}. Показаны данные локальной базы.
          </p>
        )}

        {/* Основные вкладки */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="entry" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Регистрация въезда
                </TabsTrigger>
                <TabsTrigger value="exit" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Регистрация выезда
                </TabsTrigger>
                <TabsTrigger value="statistics" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Статистика и история
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="entry" className="mt-0">
                <GuardEntryRegistration />
              </TabsContent>

              <TabsContent value="exit" className="mt-0">
                <GuardExitRegistration />
              </TabsContent>

              <TabsContent value="statistics" className="mt-0">
                <GuardStatistics authTokens={authTokens} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Диалог начала работы */}
      <StartWorkDialog
        open={showStartDialog}
        onOpenChange={setShowStartDialog}
        guard={guard}
        branch={branch}
        checkpoint={checkpoint}
        onConfirm={handleStartWork}
      />
    </>
  );
}