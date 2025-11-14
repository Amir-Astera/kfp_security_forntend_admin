import { useState, useEffect, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { GuardEntryRegistration } from "./GuardEntryRegistration";
import { GuardExitRegistration } from "./GuardExitRegistration";
import { GuardStatistics } from "./GuardStatistics";
import { StartWorkDialog } from "./StartWorkDialog";
import { LogIn, LogOut, BarChart3, Users, UserCheck, UserX } from "lucide-react";
import { fetchGuardDashboardCards } from "../api/dashboard";
import { fetchGuardByIdFromApi, mapGuardFromApi } from "../api/guards";
import { getBranchById } from "../api/branches";
import { getCheckpointById } from "../api/checkpoints";
import {
  completeGuestVisit,
  createGuestVisit,
  getGuestVisits,
  mapGuestVisitToVisit,
} from "../api/visits";
import type {
  AuthResponse,
  Branch,
  Checkpoint,
  Guard,
  GuardDashboardCardsResponse,
  Visit,
} from "../types";
import { toast } from "sonner@2.0.3";

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
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [isCreatingVisit, setIsCreatingVisit] = useState(false);
  const [isCompletingVisit, setIsCompletingVisit] = useState(false);

  // Загружаем данные охранника
  useEffect(() => {
    let isMounted = true;

    const resetState = () => {
      setGuard(null);
      setBranch(null);
      setCheckpoint(null);
      setWorkStarted(false);
      setShowStartDialog(false);
    };

    const loadGuardData = async () => {
      if (!authTokens?.accessToken || !authTokens?.tokenType) {
        setLoadError("Отсутствуют данные авторизации");
        setLoadingGuard(false);
        return;
      }

      if (!guardId) {
        setLoadError("Идентификатор охранника не указан");
        setLoadingGuard(false);
        return;
      }

      setLoadingGuard(true);
      setLoadError(null);
      resetState();

      try {
        const tokens = {
          accessToken: authTokens.accessToken,
          tokenType: authTokens.tokenType,
        } as const;

        const guardResponse = await fetchGuardByIdFromApi(guardId, tokens);

        let branchData: Branch | null = null;
        let checkpointData: Checkpoint | null = null;

        try {
          if (guardResponse.branchId) {
            const branchResponse = await getBranchById(guardResponse.branchId, tokens);
            branchData = {
              id: branchResponse.id,
              name: branchResponse.name,
              city: branchResponse.city ?? "",
              region: branchResponse.region ?? "",
              street: branchResponse.street ?? "",
              building: branchResponse.house ?? branchResponse.building ?? "",
              latitude:
                branchResponse.latitude !== undefined && branchResponse.latitude !== null
                  ? String(branchResponse.latitude)
                  : "",
              longitude:
                branchResponse.longitude !== undefined && branchResponse.longitude !== null
                  ? String(branchResponse.longitude)
                  : "",
              phone: branchResponse.phone ?? "",
              email: branchResponse.email ?? "",
              status: branchResponse.active ? "active" : "inactive",
              createdAt: branchResponse.createdAt ?? "",
              checkpointsCount: branchResponse.checkpointsCount ?? 0,
              active: branchResponse.active,
              house: branchResponse.house,
              updatedAt: branchResponse.updatedAt,
              version: branchResponse.version,
            };
          }
        } catch (error) {
          console.error("Не удалось загрузить филиал охранника", error);
        }

        try {
          if (guardResponse.checkpointId) {
            const checkpointResponse = await getCheckpointById(guardResponse.checkpointId, tokens);
            checkpointData = {
              id: checkpointResponse.id,
              name: checkpointResponse.name,
              branchId: checkpointResponse.branchId,
              branchName: branchData?.name ?? "",
              type: "universal",
              description: checkpointResponse.description ?? "",
              status: checkpointResponse.active ? "active" : "inactive",
              createdAt: checkpointResponse.createdAt ?? "",
              guardsCount: 0,
              active: checkpointResponse.active,
              updatedAt: checkpointResponse.updatedAt,
              version: checkpointResponse.version,
            };
          }
        } catch (error) {
          console.error("Не удалось загрузить КПП охранника", error);
        }

        if (!isMounted) {
          return;
        }

        const mappedGuard = mapGuardFromApi(guardResponse, {
          branchName: branchData?.name,
          checkpointName: checkpointData?.name,
        });

        setGuard(mappedGuard);
        setBranch(branchData);
        setCheckpoint(checkpointData);

        const shiftStart = localStorage.getItem(`guard_shift_start_${mappedGuard.id}`);
        if (shiftStart) {
          setWorkStarted(true);
        } else {
          setShowStartDialog(true);
        }

        setLoadError(null);
      } catch (error) {
        console.error("Не удалось загрузить данные охранника", error);
        if (!isMounted) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Не удалось загрузить данные охранника. Обновите страницу или выполните вход снова.";
        setLoadError(message);
      } finally {
        if (isMounted) {
          setLoadingGuard(false);
        }
      }
    };

    loadGuardData();

    return () => {
      isMounted = false;
    };
  }, [authTokens, guardId]);

  const refreshVisits = useCallback(async () => {
    if (!authTokens?.accessToken || !authTokens?.tokenType || !guardId) {
      setVisits([]);
      return;
    }

    setVisitsLoading(true);
    setVisitsError(null);

    try {
      const tokens = {
        accessToken: authTokens.accessToken,
        tokenType: authTokens.tokenType,
      } as const;

      const response = await getGuestVisits(tokens, { guardId, size: 200, page: 0 });
      setVisits(response.items.map(mapGuestVisitToVisit));
    } catch (error) {
      console.error("Не удалось загрузить визиты охранника", error);
      const message =
        error instanceof Error ? error.message : "Не удалось загрузить список визитов";
      setVisitsError(message);
      setVisits([]);
    } finally {
      setVisitsLoading(false);
    }
  }, [authTokens, guardId]);

  useEffect(() => {
    refreshVisits();
  }, [refreshVisits]);

  const parseDateString = useCallback((value?: string) => {
    if (!value) {
      return null;
    }

    const match = value.match(/(\d{2})\.(\d{2})\.(\d{4})(?:[^\d]*(\d{2}):(\d{2}))?/);
    if (!match) {
      return null;
    }

    const [, day, month, year, hour, minute] = match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      hour ? Number(hour) : 0,
      minute ? Number(minute) : 0
    );
  }, []);

  const fallbackCards = useMemo<GuardDashboardCardsResponse>(() => {
    const presentNow = visits.filter((v) => v.status === "on-site").length;

    const today = new Date();
    const arrivedThisShift = visits.filter((visit) => {
      const date = parseDateString(visit.entryTime ?? visit.createdAt);
      if (!date) {
        return false;
      }
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    }).length;

    const leftThisShift = visits.filter((visit) => {
      const date = parseDateString(visit.exitTime);
      if (!date) {
        return false;
      }
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    }).length;

    return {
      presentNow,
      arrivedThisShift,
      leftThisShift,
    };
  }, [parseDateString, visits]);

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
      localStorage.removeItem(`guard_shift_session_${guard.id}`);
      localStorage.removeItem(`guard_shift_id_${guard.id}`);
    }
    if (guardId) {
      localStorage.removeItem(`guard_shift_start_${guardId}`);
      localStorage.removeItem(`guard_shift_session_${guardId}`);
      localStorage.removeItem(`guard_shift_id_${guardId}`);
    }
    onLogout();
  };

  const handleStartCancelled = () => {
    setShowStartDialog(false);
    setWorkStarted(false);
    handleShiftHandover();
  };

  const handleVisitCreated = useCallback(
    async (payload: {
      fullName: string;
      iin: string;
      phone: string;
      company: string;
      purpose: string;
      places: string[];
      notes?: string;
      hasVehicle: boolean;
      vehicleNumber?: string;
      techPassport?: string;
      ttn?: string;
      cargoType?: string;
    }) => {
      if (!authTokens?.accessToken || !authTokens?.tokenType || !guard) {
        throw new Error("Нет данных авторизации или охранника");
      }

      setIsCreatingVisit(true);

      try {
        const tokens = {
          accessToken: authTokens.accessToken,
          tokenType: authTokens.tokenType,
        } as const;

        const response = await createGuestVisit(
          {
            guardId: guard.id,
            branchId: guard.branchId,
            checkpointId: guard.checkpointId,
            fullName: payload.fullName,
            iin: payload.iin,
            phone: payload.phone,
            company: payload.company,
            visitPurpose: payload.purpose,
            visitPlaces: payload.places,
            notes: payload.notes,
            kind: payload.hasVehicle ? "TRANSPORT" : "PERSON",
            licensePlate: payload.vehicleNumber,
            techPassportNo: payload.techPassport,
            ttnNo: payload.ttn,
            cargoType: payload.cargoType,
            hasVehicle: payload.hasVehicle,
          },
          tokens
        );

        const mappedVisit = mapGuestVisitToVisit(response);
        setVisits((prev) => [mappedVisit, ...prev]);
        return mappedVisit;
      } finally {
        setIsCreatingVisit(false);
      }
    },
    [authTokens, guard]
  );

  const handleVisitCompleted = useCallback(
    async (visit: Visit) => {
      if (!authTokens?.accessToken || !authTokens?.tokenType) {
        throw new Error("Нет данных авторизации");
      }

      setIsCompletingVisit(true);

      try {
        const tokens = {
          accessToken: authTokens.accessToken,
          tokenType: authTokens.tokenType,
        } as const;

        const response = await completeGuestVisit(
          visit.id,
          {
            exitAt: new Date().toISOString(),
          },
          tokens
        );

        const updatedVisit = mapGuestVisitToVisit(response);
        setVisits((prev) =>
          prev.map((item) => (item.id === updatedVisit.id ? updatedVisit : item))
        );
        return updatedVisit;
      } finally {
        setIsCompletingVisit(false);
      }
    },
    [authTokens]
  );

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

        {visitsError && (
          <p className="text-sm text-destructive/80">
            {visitsError}. Показаны последние загруженные данные.
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
                <GuardEntryRegistration
                  visits={visits}
                  onRegisterVisit={async (formData) => {
                    try {
                      const created = await handleVisitCreated(formData);
                      await refreshVisits();
                      return created;
                    } catch (error) {
                      console.error("Ошибка регистрации визита", error);
                      const message =
                        error instanceof Error
                          ? error.message
                          : "Не удалось зарегистрировать въезд";
                      toast.error(message);
                      throw error;
                    }
                  }}
                  isSubmitting={isCreatingVisit}
                />
              </TabsContent>

              <TabsContent value="exit" className="mt-0">
                <GuardExitRegistration
                  visits={visits}
                  onCompleteVisit={async (visit) => {
                    try {
                      const updated = await handleVisitCompleted(visit);
                      await refreshVisits();
                      return updated;
                    } catch (error) {
                      console.error("Ошибка завершения визита", error);
                      const message =
                        error instanceof Error
                          ? error.message
                          : "Не удалось зарегистрировать выезд";
                      toast.error(message);
                      throw error;
                    }
                  }}
                  isSubmitting={isCompletingVisit}
                />
              </TabsContent>

              <TabsContent value="statistics" className="mt-0">
                <GuardStatistics
                  authTokens={authTokens}
                  visits={visits}
                  visitsLoading={visitsLoading}
                  visitsError={visitsError}
                />
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
        authTokens={authTokens?.accessToken && authTokens?.tokenType ? {
          accessToken: authTokens.accessToken,
          tokenType: authTokens.tokenType,
        } : null}
        onConfirm={handleStartWork}
        onCancel={handleStartCancelled}
      />
    </>
  );
}