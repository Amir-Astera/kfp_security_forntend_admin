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
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { db } from "../services";
import { Camera, RotateCw, X, CheckCircle, AlertCircle } from "lucide-react";
import type { Guard } from "../types";

interface ShiftHandoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGuard: Guard;
  onSuccess: () => void;
}

export function ShiftHandoverDialog({
  open,
  onOpenChange,
  currentGuard,
  onSuccess,
}: ShiftHandoverDialogProps) {
  const [step, setStep] = useState<"select" | "newGuardPhoto" | "confirm">(
    "select"
  );
  const [selectedGuard, setSelectedGuard] = useState<string>("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [newGuardPhoto, setNewGuardPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Получаем охранников того же агентства и КПП
  const availableGuards = (db.getGuards ? db.getGuards() : []).filter(
    (g) =>
      g.id !== currentGuard.id &&
      g.agencyId === currentGuard.agencyId &&
      g.checkpointId === currentGuard.checkpointId &&
      g.status === "active"
  );

  // Запуск камеры
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

  // Остановка камеры
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

  // Сделать фото
  const takePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const photoData = canvas.toDataURL("image/jpeg", 0.9);
    setNewGuardPhoto(photoData);
    stopCamera();
    setStep("confirm");
  };

  // Переснять фото
  const retakePhoto = () => {
    setNewGuardPhoto(null);
    setStep("newGuardPhoto");
  };

  // Подтвердить передачу смены
  const confirmHandover = async () => {
    if (!selectedGuard || !newGuardPhoto) {
      toast.error("Выберите охранника и сделайте фото");
      return;
    }

    setLoading(true);

    try {
      const handoverData = {
        previousGuardId: currentGuard.id,
        newGuardId: selectedGuard,
        checkpointId: currentGuard.checkpointId,
        photo: newGuardPhoto,
        timestamp: new Date().toISOString(),
      };

      const handovers = JSON.parse(
        localStorage.getItem("shift_handovers") || "[]"
      );
      handovers.push(handoverData);
      localStorage.setItem("shift_handovers", JSON.stringify(handovers));

      if (db.updateGuard) {
        db.updateGuard(currentGuard.id, {
          lastActivity: new Date().toISOString(),
        });
      }

      toast.success("Смена успешно передана!");

      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
      }, 500);
    } catch (error) {
      console.error("Ошибка передачи смены:", error);
      toast.error("Ошибка при передаче смены");
    } finally {
      setLoading(false);
    }
  };

  // Переход к фото
  const handleNext = () => {
    if (!selectedGuard) {
      toast.error("Выберите охранника");
      return;
    }

    setStep("newGuardPhoto");
  };

  // Управление камерой по шагу/открытию диалога
  useEffect(() => {
    if (open && step === "newGuardPhoto") {
      startCamera();
    } else {
      stopCamera();
    }
  }, [open, step, startCamera, stopCamera]);

  // Сброс состояния при закрытии диалога
  useEffect(() => {
    if (!open) {
      stopCamera();
      setStep("select");
      setSelectedGuard("");
      setNewGuardPhoto(null);
      setCameraError(null);
    }
  }, [open, stopCamera]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const selectedGuardData = availableGuards.find((g) => g.id === selectedGuard);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Передача смены</DialogTitle>
          <DialogDescription>
            {step === "select" && "Выберите охранника, который заступает на смену"}
            {step === "newGuardPhoto" && "Сфотографируйте заступающего охранника"}
            {step === "confirm" && "Подтвердите передачу смены"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Шаг 1: Выбор охранника */}
          {step === "select" && (
            <div className="space-y-4">
              <div>
                <Label>Текущий охранник</Label>
                <div className="p-3 bg-muted rounded-lg mt-2">
                  <p className="text-foreground">{currentGuard.fullName}</p>
                  <p className="text-muted-foreground text-sm">
                    {currentGuard.loginEmail}
                  </p>
                </div>
              </div>

              <div>
                <Label>Заступающий охранник *</Label>
                <Select value={selectedGuard} onValueChange={setSelectedGuard}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите охранника" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGuards.length === 0 ? (
                      <div className="p-2 text-center text-muted-foreground">
                        Нет доступных охранников
                      </div>
                    ) : (
                      availableGuards.map((guard) => (
                        <SelectItem key={guard.id} value={guard.id}>
                          {guard.fullName} ({guard.loginEmail})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {availableGuards.length === 0 && (
                <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Нет охранников этого агентства на данном КПП
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Шаг 2: Фото нового охранника */}
          {step === "newGuardPhoto" && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Заступающий охранник:
                </p>
                <p className="text-foreground">{selectedGuardData?.fullName}</p>
              </div>

              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {/* Видео ВСЕГДА в DOM на шаге фото */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Ошибка камеры поверх видео */}
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

                {/* Пока камера не активна, но ошибки нет — "Подключение..." */}
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
                    Убедитесь, что лицо заступающего охранника хорошо видно в кадре
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Шаг 3: Подтверждение */}
          {step === "confirm" && newGuardPhoto && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Заступающий охранник:
                </p>
                <p className="text-foreground">{selectedGuardData?.fullName}</p>
              </div>

              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <img
                  src={newGuardPhoto}
                  alt="Фото охранника"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  После подтверждения ваша сессия будет закрыта, а новый охранник
                  автоматически войдет в систему
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "select" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedGuard || availableGuards.length === 0}
              >
                Далее
              </Button>
            </>
          )}

          {step === "newGuardPhoto" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  stopCamera();
                  setStep("select");
                }}
              >
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
              <Button onClick={confirmHandover} disabled={loading}>
                {loading ? "Передача смены..." : "Подтвердить передачу"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
