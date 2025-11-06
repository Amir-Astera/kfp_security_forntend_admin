import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form@7.55.0";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Guard, CreateGuardRequest, Branch, Checkpoint } from "../types";
import { createGuard, updateGuard } from "../api/guards";
import { toast } from "sonner@2.0.3";
import { usePersistentCollection } from "../hooks/usePersistentCollection";
import { STORAGE_KEYS } from "../utils/storage";
import { initialBranches, initialCheckpoints } from "../data/initialData";

interface GuardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guard?: Guard | null;
  onSuccess: () => void;
}

  const weekDays = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

export function GuardFormDialog({
  open,
  onOpenChange,
  guard,
  onSuccess,
}: GuardFormDialogProps) {
  const [branches] = usePersistentCollection<Branch>(
    STORAGE_KEYS.branches,
    initialBranches
  );
  const [checkpoints] = usePersistentCollection<Checkpoint>(
    STORAGE_KEYS.checkpoints,
    initialCheckpoints
  );
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string>("");
  const [shiftType, setShiftType] = useState<"day" | "night">("day");
  const [workDays, setWorkDays] = useState<string[]>(["ПН", "ВТ", "СР", "ЧТ", "ПТ"]);

  const branchOptions = useMemo(
    () => branches.map((branch) => ({ id: branch.id, name: branch.name })),
    [branches]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<CreateGuardRequest>();

  useEffect(() => {
    if (guard) {
      // Заполнить форму данными охранника
      setValue("fullName", guard.fullName);
      setValue("iin", guard.iin);
      setValue("birthDate", guard.birthDate);
      setValue("phone", guard.phone);
      setValue("email", guard.email || "");
      setValue("loginEmail", guard.loginEmail);
      setValue("shiftStart", guard.shiftStart);
      setValue("shiftEnd", guard.shiftEnd);
      setSelectedBranch(guard.branchId);
      setSelectedCheckpoint(guard.checkpointId);
      setShiftType(guard.shiftType);
      setWorkDays(guard.workDays);
    } else {
      // Сброс формы
      reset();
      setSelectedBranch("");
      setSelectedCheckpoint("");
      setShiftType("day");
      setWorkDays(["ПН", "ВТ", "СР", "ЧТ", "ПТ"]);
    }
  }, [guard, setValue, reset]);

  const onSubmit = async (data: CreateGuardRequest) => {
    if (!selectedBranch) {
      toast.error("Выберите филиал");
      return;
    }
    if (!selectedCheckpoint) {
      toast.error("Выберите КПП");
      return;
    }
    if (workDays.length === 0) {
      toast.error("Выберите хотя бы один рабочий день");
      return;
    }

    setLoading(true);

    try {
      const guardData: CreateGuardRequest = {
        ...data,
        agencyId: "1", // В реальном приложении - ID текущего агентства
        branchId: selectedBranch,
        checkpointId: selectedCheckpoint,
        shiftType,
        workDays,
      };

      if (guard) {
        await updateGuard(guard.id, guardData);
        toast.success("Охранник обновлен");
      } else {
        await createGuard(guardData);
        toast.success("Охранник добавлен");
      }

      onSuccess();
    } catch (error) {
      toast.error(
        guard ? "Ошибка обновления охранника" : "Ошибка добавления охранника"
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkDay = (day: string) => {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const availableCheckpoints = useMemo(
    () =>
      checkpoints.filter((checkpoint) => checkpoint.branchId === selectedBranch),
    [checkpoints, selectedBranch]
  );

  useEffect(() => {
    if (!selectedBranch) {
      setSelectedCheckpoint("");
      return;
    }

    if (
      selectedCheckpoint &&
      !availableCheckpoints.some((checkpoint) => checkpoint.id === selectedCheckpoint)
    ) {
      setSelectedCheckpoint("");
    }
  }, [availableCheckpoints, selectedBranch, selectedCheckpoint]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {guard ? "Редактировать охранника" : "Добавить охранника"}
          </DialogTitle>
          <DialogDescription>
            {guard
              ? "Обновите информацию об охраннике"
              : "Заполните данные нового охранника"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-foreground">Персональные данные</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="fullName">ФИО *</Label>
                <Input
                  id="fullName"
                  {...register("fullName", {
                    required: "Обязательное поле",
                  })}
                  placeholder="Иванов Иван Иванович"
                />
                {errors.fullName && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="iin">ИИН *</Label>
                <Input
                  id="iin"
                  {...register("iin", {
                    required: "Обязательное поле",
                    pattern: {
                      value: /^\d{12}$/,
                      message: "ИИН должен содержать 12 цифр",
                    },
                  })}
                  placeholder="920315301234"
                  maxLength={12}
                />
                {errors.iin && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.iin.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="birthDate">Дата рождения *</Label>
                <Input
                  id="birthDate"
                  {...register("birthDate", {
                    required: "Обязательное поле",
                  })}
                  placeholder="15.03.1992"
                />
                {errors.birthDate && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.birthDate.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Телефон *</Label>
                <Input
                  id="phone"
                  {...register("phone", {
                    required: "Обязательное поле",
                  })}
                  placeholder="+7 727 123 4567"
                />
                {errors.phone && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="ivanov@example.com"
                />
              </div>
            </div>
          </div>

          {/* Work Location */}
          <div className="space-y-4">
            <h3 className="text-foreground">Место работы</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Филиал *</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите филиал" />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>КПП *</Label>
                <Select
                  value={selectedCheckpoint}
                  onValueChange={setSelectedCheckpoint}
                  disabled={!selectedBranch}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите КПП" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCheckpoints.map((cp) => (
                      <SelectItem key={cp.id} value={cp.id}>
                        {cp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Shift Info */}
          <div className="space-y-4">
            <h3 className="text-foreground">Смена</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Тип смены *</Label>
                <Select
                  value={shiftType}
                  onValueChange={(value: "day" | "night") => setShiftType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Дневная</SelectItem>
                    <SelectItem value="night">Ночная</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="shiftStart">Начало смены *</Label>
                <Input
                  id="shiftStart"
                  {...register("shiftStart", {
                    required: "Обязательное поле",
                  })}
                  placeholder="08:00"
                />
                {errors.shiftStart && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.shiftStart.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="shiftEnd">Конец смены *</Label>
                <Input
                  id="shiftEnd"
                  {...register("shiftEnd", {
                    required: "Обязательное поле",
                  })}
                  placeholder="20:00"
                />
                {errors.shiftEnd && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.shiftEnd.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label>Рабочие дни *</Label>
              <div className="flex gap-2 mt-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className={`flex items-center justify-center w-12 h-12 rounded-lg border-2 cursor-pointer transition-colors ${
                      workDays.includes(day)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleWorkDay(day)}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Login Info */}
          <div className="space-y-4">
            <h3 className="text-foreground">Данные для входа</h3>

            <div>
              <Label htmlFor="loginEmail">Email для входа *</Label>
              <Input
                id="loginEmail"
                type="email"
                {...register("loginEmail", {
                  required: "Обязательное поле",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Некорректный email",
                  },
                })}
                placeholder="guard@kfp.kz"
              />
              {errors.loginEmail && (
                <p className="text-destructive text-sm mt-1">
                  {errors.loginEmail.message}
                </p>
              )}
              <p className="text-muted-foreground text-sm mt-1">
                {guard
                  ? "При сохранении пароль не изменится"
                  : "Пароль будет сгенерирован автоматически и отправлен на email"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Сохранение..."
                : guard
                ? "Сохранить изменения"
                : "Добавить охранника"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
