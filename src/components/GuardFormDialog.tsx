import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form@7.55.0";
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
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import type { AuthResponse, Guard } from "../types";
import { toast } from "sonner@2.0.3";
import { CalendarIcon, Eye, EyeOff } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "./ui/utils";
import { getBranchesByAgencyId } from "../api/branches";
import type { BranchApiResponse } from "../api/branches";
import { getCheckpoints } from "../api/checkpoints";
import type { CheckpointApiItem } from "../api/checkpoints";

interface GuardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guard?: Guard | null;
  onSuccess: (data: any) => void;
  authTokens?: AuthResponse | null;
  agencyId?: string;
  loading?: boolean;
}

const weekDays = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

// Генерация времени с 00:00 до 23:00
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    times.push(timeStr);
  }
  return times;
};

const timeOptions = generateTimeOptions();

export function GuardFormDialog({
  open,
  onOpenChange,
  guard,
  onSuccess,
  authTokens,
  agencyId,
  loading = false,
}: GuardFormDialogProps) {
  const [branches, setBranches] = useState<BranchApiResponse[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointApiItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string>("");
  const [shiftType, setShiftType] = useState<"day" | "night">("day");
  const [workDays, setWorkDays] = useState<string[]>(["ПН", "ВТ", "СР", "ЧТ", "ПТ"]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [checkpointsLoading, setCheckpointsLoading] = useState(false);
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [shiftStart, setShiftStart] = useState<string>("");
  const [shiftEnd, setShiftEnd] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [guardStatus, setGuardStatus] = useState<"active" | "inactive" | "vacation" | "sick">("active");

  const guardAgencyId = guard?.agencyId ?? "";
  const effectiveAgencyId = agencyId ?? guardAgencyId;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    control,
  } = useForm();

  // Загрузка филиалов агентства
  useEffect(() => {
    if (!open) {
      return;
    }

    if (
      !authTokens?.accessToken ||
      !authTokens?.tokenType ||
      !effectiveAgencyId
    ) {
      setBranches([]);
      setBranchesLoading(false);
      return;
    }

    let isMounted = true;

    const loadBranches = async () => {
      try {
        setBranchesLoading(true);
        const data = await getBranchesByAgencyId(effectiveAgencyId, {
          accessToken: authTokens.accessToken,
          tokenType: authTokens.tokenType,
        });

        if (!isMounted) {
          return;
        }

        setBranches(data);
      } catch (error) {
        console.error("Ошибка загрузки филиалов:", error);
        if (isMounted) {
          toast.error("Не удалось загрузить филиалы");
        }
      } finally {
        if (isMounted) {
          setBranchesLoading(false);
        }
      }
    };

    loadBranches();

    return () => {
      isMounted = false;
    };
  }, [open, effectiveAgencyId, authTokens]);

  // Загрузка КПП выбранного филиала
  useEffect(() => {
    if (!open) {
      return;
    }

    if (!selectedBranch) {
      setCheckpoints([]);
      setCheckpointsLoading(false);
      return;
    }

    if (!authTokens?.accessToken || !authTokens?.tokenType) {
      setCheckpoints([]);
      setCheckpointsLoading(false);
      return;
    }

    let isMounted = true;

    const loadCheckpoints = async () => {
      try {
        setCheckpointsLoading(true);
        const response = await getCheckpoints(
          {
            accessToken: authTokens.accessToken,
            tokenType: authTokens.tokenType,
          },
          {
            branchId: selectedBranch,
            page: 0,
            size: 25,
          }
        );

        if (!isMounted) {
          return;
        }

        setCheckpoints(response.items);
      } catch (error) {
        console.error("Ошибка загрузки КПП:", error);
        if (isMounted) {
          toast.error("Не удалось загрузить КПП");
        }
      } finally {
        if (isMounted) {
          setCheckpointsLoading(false);
        }
      }
    };

    loadCheckpoints();

    return () => {
      isMounted = false;
    };
  }, [open, selectedBranch, authTokens]);

  // Заполнение формы при редактировании
  useEffect(() => {
    if (guard) {
      setValue("fullName", guard.fullName);
      setValue("iin", guard.iin);

      // Парсинг даты рождения
      if (guard.birthDate) {
        try {
          const parsedDate = parse(guard.birthDate, "dd.MM.yyyy", new Date());
          setBirthDate(parsedDate);
          setValue("birthDate", guard.birthDate);
        } catch (error) {
          console.error("Ошибка парсинга даты:", error);
        }
      }

      setValue("phone", guard.phone);
      setValue("email", guard.email || "");
      setValue("loginEmail", guard.loginEmail);

      setShiftStart(guard.shiftStart || "");
      setShiftEnd(guard.shiftEnd || "");
      setValue("shiftStart", guard.shiftStart);
      setValue("shiftEnd", guard.shiftEnd);

      setSelectedBranch(guard.branchId);
      setSelectedCheckpoint(guard.checkpointId);
      setShiftType(guard.shiftType);
      setWorkDays(guard.workDays);
      setGuardStatus(guard.status || "active");
    } else {
      reset();
      setSelectedBranch("");
      setSelectedCheckpoint("");
      setShiftType("day");
      setWorkDays(["ПН", "ВТ", "СР", "ЧТ", "ПТ"]);
      setBirthDate(undefined);
      setShiftStart("");
      setShiftEnd("");
      setShowPassword(false);
      setGuardStatus("active");
    }
  }, [guard, setValue, reset]);

  const onSubmit = (data: any) => {
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

    const guardData = {
      ...data,
      branchId: selectedBranch,
      checkpointId: selectedCheckpoint,
      shiftType,
      workDays,
      hireDate: guard?.hireDate || new Date().toISOString().split("T")[0],
      status: guardStatus,
    };

    onSuccess(guardData);
  };

  const toggleWorkDay = (day: string) => {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
    setSelectedCheckpoint("");
    setCheckpoints([]);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setBirthDate(date);
    if (date) {
      const formattedDate = format(date, "dd.MM.yyyy", { locale: ru });
      setValue("birthDate", formattedDate);
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Убираем все кроме цифр

    // Форматируем как DD.MM.YYYY
    if (value.length >= 2) {
      value = value.slice(0, 2) + "." + value.slice(2);
    }
    if (value.length >= 5) {
      value = value.slice(0, 5) + "." + value.slice(5);
    }
    if (value.length > 10) {
      value = value.slice(0, 10);
    }

    setValue("birthDate", value);

    // Пытаемся распарсить дату, если введено 10 символов
    if (value.length === 10) {
      try {
        const parsedDate = parse(value, "dd.MM.yyyy", new Date());
        if (isValid(parsedDate)) {
          setBirthDate(parsedDate);
        }
      } catch (error) {
        // Игнорируем ошибки парсинга
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Убираем все кроме цифр

    // Всегда начинаем с 7
    if (!value.startsWith("7")) {
      value = "7" + value.replace(/^7*/, "");
    }

    // Ограничиваем до 11 цифр (7 + 10 цифр)
    if (value.length > 11) {
      value = value.slice(0, 11);
    }

    // Форматируем как +7 (XXX) XXX XX XX
    let formatted = "+7";
    if (value.length > 1) {
      formatted += " (" + value.slice(1, 4);
    }
    if (value.length >= 5) {
      formatted += ") " + value.slice(4, 7);
    }
    if (value.length >= 8) {
      formatted += " " + value.slice(7, 9);
    }
    if (value.length >= 10) {
      formatted += " " + value.slice(9, 11);
    }

    setValue("phone", formatted);
  };

  const availableCheckpoints = selectedBranch
    ? checkpoints.filter((cp) => cp.branchId === selectedBranch)
    : [];

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
                <div className="space-y-2">
                  <Input
                    id="birthDate"
                    {...register("birthDate", {
                      required: "Обязательное поле",
                      pattern: {
                        value: /^\d{2}\.\d{2}\.\d{4}$/,
                        message: "Формат: ДД.ММ.ГГГГ",
                      },
                      validate: (value) => {
                        if (!value) return true;
                        
                        const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
                        if (!match) return "Формат: ДД.ММ.ГГГГ";
                        
                        const day = parseInt(match[1], 10);
                        const month = parseInt(match[2], 10);
                        const year = parseInt(match[3], 10);
                        
                        // Проверка диапазонов
                        if (day < 1 || day > 31) return "День должен быть от 01 до 31";
                        if (month < 1 || month > 12) return "Месяц должен быть от 01 до 12";
                        if (year < 1900) return "Год должен быть не раньше 1900";
                        if (year > new Date().getFullYear()) return "Год не может быть в будущем";
                        
                        // Проверка валидности даты
                        const date = new Date(year, month - 1, day);
                        if (
                          date.getDate() !== day ||
                          date.getMonth() !== month - 1 ||
                          date.getFullYear() !== year
                        ) {
                          return "Некорректная дата";
                        }
                        
                        return true;
                      },
                    })}
                    placeholder="ДД.ММ.ГГГГ"
                    onChange={handleDateInputChange}
                    maxLength={10}
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Выбрать из календаря
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={birthDate}
                        onSelect={handleDateSelect}
                        locale={ru}
                        captionLayout="dropdown-buttons"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
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
                  onChange={handlePhoneChange}
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
                <Select value={selectedBranch} onValueChange={handleBranchChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите филиал" />
                  </SelectTrigger>
                  <SelectContent>
                    {branchesLoading ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Загрузка...
                      </div>
                    ) : branches.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Нет доступных филиалов
                      </div>
                    ) : (
                      branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>КПП *</Label>
                <Select
                  value={selectedCheckpoint}
                  onValueChange={setSelectedCheckpoint}
                  disabled={!selectedBranch || checkpointsLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        selectedBranch ? "Выберите КПП" : "Сначала выберите филиал"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {checkpointsLoading ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Загрузка...
                      </div>
                    ) : availableCheckpoints.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {selectedBranch
                          ? "Нет доступных КПП"
                          : "Выберите филиал"}
                      </div>
                    ) : (
                      availableCheckpoints.map((cp) => (
                        <SelectItem key={cp.id} value={cp.id}>
                          {cp.name}
                        </SelectItem>
                      ))
                    )}
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
                <Controller
                  name="shiftStart"
                  control={control}
                  rules={{ required: "Обязательное поле" }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setShiftStart(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите время" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.shiftStart && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.shiftStart.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="shiftEnd">Конец смены *</Label>
                <Controller
                  name="shiftEnd"
                  control={control}
                  rules={{ required: "Обязательное поле" }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setShiftEnd(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите время" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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

          {/* Status - only when editing */}
          {guard && (
            <div className="space-y-4">
              <h3 className="text-foreground">Статус охранника</h3>
              <div>
                <Label>Статус *</Label>
                <Select
                  value={guardStatus}
                  onValueChange={(value: "active" | "inactive" | "vacation" | "sick") => setGuardStatus(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активен</SelectItem>
                    <SelectItem value="inactive">Неактивен</SelectItem>
                    <SelectItem value="vacation">В отпуске</SelectItem>
                    <SelectItem value="sick">На больничном</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-sm mt-1">
                  Измените статус для управления доступом и отображением охранника
                </p>
              </div>
            </div>
          )}

          {/* Login Info */}
          <div className="space-y-4">
            <h3 className="text-foreground">Данные для входа</h3>

            <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div>
                <Label htmlFor="password">
                  Пароль {!guard && <span className="text-destructive">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password", {
                      required: guard ? false : "Обязательное поле",
                      minLength: {
                        value: 6,
                        message: "Минимум 6 символов",
                      },
                    })}
                    placeholder={
                      guard ? "Оставьте пустым для сохранения текущего" : "Введите пароль"
                    }
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.password.message}
                  </p>
                )}
                {guard && (
                  <p className="text-muted-foreground text-sm mt-1">
                    Оставьте пустым, чтобы не менять пароль
                  </p>
                )}
              </div>
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