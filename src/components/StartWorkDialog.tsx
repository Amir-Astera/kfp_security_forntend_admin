import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  ClipboardCheck,
  MapPin,
  Clock,
  Calendar,
  Camera,
  RotateCw,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AuthResponse,
  Branch,
  Checkpoint,
  Guard,
  GuardShiftEventDetail,
} from "../types";
import {
  closeGuardSessions,
  openGuardSession,
  uploadShiftPhoto,
} from "../api/sessions";
import { startTodayGuardShift } from "../api/guardShifts";
import { dataUrlToFile } from "../utils/file";

interface StartWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guard: Guard;
  branch: Branch | null;
  checkpoint: Checkpoint | null;
  authTokens: Pick<AuthResponse, "accessToken" | "tokenType"> | null;
  onConfirm: (payload: { shiftId: string; startedAt?: string }) => void;
  onCancel: () => void;
}

export function StartWorkDialog({
  open,
  onOpenChange,
  guard,
  branch,
  checkpoint,
  authTokens,
  onConfirm,
  onCancel,
}: StartWorkDialogProps) {
  const [step, setStep] = useState<"info" | "photo" | "confirm">("info");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const allowCloseRef = useRef(false);

  const getDeviceFingerprint = () => {
    if (typeof window === "undefined") {
      return "unknown-device";
    }

    const storageKey = "guard_device_fingerprint";
    let fingerprint = window.localStorage.getItem(storageKey);

    if (!fingerprint) {
      const randomId = window.crypto?.randomUUID?.() ?? `device-${Date.now()}`;
      fingerprint = randomId;
      window.localStorage.setItem(storageKey, fingerprint);
    }

    return fingerprint;
  };

  const requestClose = useCallback(() => {
    allowCloseRef.current = true;
    onOpenChange(false);
  }, [onOpenChange]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsCameraActive(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Ваш браузер не поддерживает доступ к камере");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch {
          /* ignore */
        }
      }

      setIsCameraActive(true);
      setCameraError(null);
    } catch (error: any) {
      let errorMessage = "Не удалось получить доступ к камере";

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage =
          "Доступ к камере запрещен. Разрешите доступ к камере в настройках браузера и попробуйте снова.";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "Камера не найдена. Подключите камеру и попробуйте снова.";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorMessage =
          "Камера используется другим приложением. Закройте другие приложения и попробуйте снова.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage =
          "Камера не поддерживает запрошенные параметры. Попробуйте другую камеру.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setCameraError(errorMessage);
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
  }, []);

  const takePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const photoData = canvas.toDataURL("image/jpeg", 0.9);
    setPhoto(photoData);
    stopCamera();
    setStep("confirm");
  };

  const retakePhoto = () => {
    setPhoto(null);
    setStep("photo");
  };

  const handleStart = async () => {
    if (!photo) {
      toast.error("Необходимо сделать фото перед началом смены");
      return;
    }

    if (!authTokens?.accessToken || !authTokens?.tokenType) {
      toast.error("Отсутствуют данные авторизации. Выполните вход снова.");
      return;
    }

    const tokens = {
      accessToken: authTokens.accessToken,
      tokenType: authTokens.tokenType,
    } as const;

    if (!guard.branchId || !guard.checkpointId) {
      toast.error("Не хватает данных филиала или КПП для открытия смены");
      return;
    }

    setLoading(true);

    let shiftId: string | null = null;
    let fallbackDeviceInfo: {
      deviceLabel?: string;
      deviceKind?: string;
      deviceFp?: string;
      userAgent?: string;
    } | null = null;

    try {
      const startPayload = await startTodayGuardShift(tokens);
      shiftId = startPayload.shiftId;
      const startTime = startPayload.startedAt ?? new Date().toISOString();

      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
      const deviceLabel = userAgent;
      const deviceKind = /Mobi|Android/i.test(userAgent) ? "MOBILE" : "BROWSER";
      const deviceFp = getDeviceFingerprint();

      fallbackDeviceInfo = { deviceLabel, deviceKind, deviceFp, userAgent };

      const { sessionId } = await openGuardSession(
        {
          shiftId,
          guardId: guard.id,
          branchId: guard.branchId,
          checkpointId: guard.checkpointId,
          deviceLabel,
          deviceKind,
          deviceFp,
        },
        tokens
      );

      const photoFile = dataUrlToFile(
        photo,
        `shift-start-${guard.id}-${Date.now()}.jpg`
      );

      await uploadShiftPhoto(
        shiftId,
        photoFile,
        { kind: "START", takenAt: startTime },
        tokens
      );

      if (typeof window !== "undefined") {
        window.localStorage.setItem(`guard_shift_start_${guard.id}`, startTime);
        window.localStorage.setItem(`guard_shift_id_${guard.id}`, shiftId);
        window.localStorage.setItem(`guard_shift_session_${guard.id}`, sessionId);
        window.localStorage.setItem(
          `guard_shift_device_${guard.id}`,
          JSON.stringify({ deviceLabel, deviceKind, deviceFp, userAgent })
        );

        const shiftRecords = JSON.parse(
          window.localStorage.getItem("shift_records") || "[]"
        );
        shiftRecords.push({
          guardId: guard.id,
          checkpointId: guard.checkpointId,
          photo,
          timestamp: startTime,
          type: "shift_start",
        });
        window.localStorage.setItem(
          "shift_records",
          JSON.stringify(shiftRecords)
        );
      }

      if (typeof window !== "undefined") {
        const detail: GuardShiftEventDetail = {
          status: "ACTIVE",
          shiftId,
          startedAt: startTime,
        };
        window.dispatchEvent(
          new CustomEvent<GuardShiftEventDetail>("guard-shift-updated", { detail })
        );
      }

      toast.success("Смена успешно начата!");

      setTimeout(() => {
        requestClose();
        onConfirm({ shiftId, startedAt: startTime });
      }, 500);
    } catch (error) {
      console.error("Ошибка начала смены:", error);
      if (shiftId) {
        try {
          await closeGuardSessions(
            {
              shiftId,
              deviceFp:
                fallbackDeviceInfo?.deviceFp ??
                (typeof window !== "undefined"
                  ? window.localStorage.getItem("guard_device_fingerprint") ?? undefined
                  : undefined),
              deviceKind: fallbackDeviceInfo?.deviceKind,
              deviceLabel: fallbackDeviceInfo?.deviceLabel,
              userAgent: fallbackDeviceInfo?.userAgent,
            },
            tokens
          );
        } catch (closeError) {
          console.error("Не удалось откатить сессию охранника", closeError);
        }
      }

      const message =
        error instanceof Error && error.message
          ? error.message
          : "Ошибка при начале смены";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setStep("photo");
  };

  const handleCancel = () => {
    stopCamera();
    setPhoto(null);
    setStep("info");
    setCameraError(null);
    requestClose();
    onCancel();
  };

  useEffect(() => {
    if (open && step === "photo") {
      startCamera();
    } else {
      stopCamera();
    }
  }, [open, step, startCamera, stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setStep("info");
      setPhoto(null);
      setCameraError(null);
    }
  }, [open, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const currentTime = new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const currentDate = new Date().toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    if (open) {
      allowCloseRef.current = false;
    }
  }, [open]);

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        allowCloseRef.current = false;
        onOpenChange(true);
        return;
      }

      if (allowCloseRef.current) {
        allowCloseRef.current = false;
        onOpenChange(false);
      }
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-w-2xl"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Начало смены
          </DialogTitle>
          <DialogDescription>
            {step === "info" && "Подтвердите начало работы на КПП"}
            {step === "photo" && "Сфотографируйтесь для фиксации начала смены"}
            {step === "confirm" && "Подтвердите начало смены"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Шаг 1: Информация */}
          {step === "info" && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Охранник</p>
                  <p className="text-foreground">{guard.fullName}</p>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Филиал: </span>
                    <span className="text-foreground">{branch?.name || "—"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">КПП: </span>
                    <span className="text-foreground">{checkpoint?.name || "—"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Смена: </span>
                    <span className="text-foreground">
                      {guard.shiftStart} - {guard.shiftEnd}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Дата: </span>
                    <span className="text-foreground">{currentDate}</span>
                  </div>
                </div>
              </div>

              <div className="text-center p-6 border-2 border-dashed border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Текущее время
                </p>
                <p className="text-foreground">{currentTime}</p>
              </div>

              <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Для начала смены необходимо сделать фото для фиксации
                  вступления на пост
                </p>
              </div>
            </div>
          )}

          {/* Шаг 2: Фото */}
          {step === "photo" && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">Охранник:</p>
                <p className="text-foreground">{guard.fullName}</p>
              </div>

              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center p-8 bg-black/60">
                    <div className="text-center">
                      <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                      <p className="text-white mb-4">Камера недоступна</p>
                      <Button onClick={startCamera} variant="secondary" size="sm">
                        <Camera className="h-4 w-4 mr-2" />
                        Попробовать снова
                      </Button>
                    </div>
                  </div>
                )}

                {!cameraError && !isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="text-center">
                      <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Подключение камеры...</p>
                    </div>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                      {cameraError}
                    </p>
                    {cameraError.includes("Разрешите доступ") && (
                      <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                        <p className="font-medium">Как разрешить доступ к камере:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Chrome: Нажмите на иконку камеры в адресной строке</li>
                          <li>Firefox: Нажмите на иконку замка и разрешите камеру</li>
                          <li>Safari: Настройки → Веб-сайты → Камера</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!cameraError && (
                <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Убедитесь, что ваше лицо хорошо видно в кадре
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Шаг 3: Подтверждение */}
          {step === "confirm" && photo && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">Охранник:</p>
                <p className="text-foreground">{guard.fullName}</p>
              </div>

              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <img
                  src={photo}
                  alt="Фото охранника"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  После подтверждения смена будет зафиксирована и вы сможете приступить к работе
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "info" && (
            <>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Отмена
              </Button>
              <Button onClick={handleNext}>
                <Camera className="h-4 w-4 mr-2" />
                Далее
              </Button>
            </>
          )}

          {step === "photo" && (
            <>
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Отмена
              </Button>
              <Button onClick={takePhoto} disabled={!isCameraActive}>
                <Camera className="h-4 w-4 mr-2" />
                Сделать фото
              </Button>
            </>
          )}

          {step === "confirm" && (
            <>
              <Button type="button" variant="outline" onClick={retakePhoto}>
                <RotateCw className="h-4 w-4 mr-2" />
                Переснять
              </Button>
              <Button onClick={handleStart} disabled={loading}>
                {loading ? "Начинаем смену..." : "Начать работу"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
