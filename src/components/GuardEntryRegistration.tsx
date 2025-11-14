import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form@7.55.0";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
import { User, Truck, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner@2.0.3";
import type { Visit } from "../types";

interface GuardEntryRegistrationProps {
  visits: Visit[];
  onRegisterVisit: (payload: {
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
  }) => Promise<Visit>;
  isSubmitting?: boolean;
}

interface GuestFormData {
  fullName: string;
  iin: string;
  phone: string;
  company: string;
  purpose: string;
  places: string;
  notes?: string;
  hasVehicle: boolean;
  vehicleNumber?: string;
  techPassport?: string;
  ttn?: string;
  cargoType?: string;
}

// Черновик для сохранения данных при переключении типа
interface FormDraft {
  guest: Partial<GuestFormData>;
  transport: Partial<GuestFormData>;
}

export function GuardEntryRegistration({ visits, onRegisterVisit, isSubmitting }: GuardEntryRegistrationProps) {
  const [isTransport, setIsTransport] = useState(false);
  const [draft, setDraft] = useState<FormDraft>({
    guest: {},
    transport: {},
  });
  
  // Состояния для автозаполнения
  const [suggestions, setSuggestions] = useState<Visit[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeField, setActiveField] = useState<"fullName" | "iin" | "phone" | "company" | null>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<GuestFormData>({
    defaultValues: {
      hasVehicle: false,
    },
  });

  // Следим за изменением ИИН для автозаполнения
  const watchedIin = watch("iin");
  const phoneValue = watch("phone");

  useEffect(() => {
    if (watchedIin && watchedIin.length === 12) {
      // Ищем предыдущие визиты по ИИН
      const previousVisit = visits
        .filter((v) => v.iin === watchedIin)
        .sort((a, b) => {
          // Сортируем по времени въезда (последний визит первым)
          return new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime();
        })[0];

      if (previousVisit) {
        // Автозаполняем только если поля пустые
        const currentFullName = getValues("fullName");
        const currentPhone = getValues("phone");
        const currentCompany = getValues("company");

        if (!currentFullName && previousVisit.fullName) {
          setValue("fullName", previousVisit.fullName);
        }
        if (!currentPhone && previousVisit.phone) {
          setValue("phone", formatPhoneNumber(previousVisit.phone), {
            shouldValidate: true,
          });
        }
        if (!currentCompany && previousVisit.company) {
          setValue("company", previousVisit.company);
        }
        if (previousVisit.purpose) {
          setValue("purpose", previousVisit.purpose);
        }

        toast.info("📋 Данные заполнены из предыдущего визита", {
          description: `${previousVisit.fullName} • ${previousVisit.company}`,
        });
      }
    }
  }, [watchedIin, setValue, getValues]);

  const formatPhoneNumber = (value: string): string => {
    let digits = value.replace(/\D/g, "");

    if (digits.length === 0) {
      return "";
    }

    if (digits.startsWith("8")) {
      digits = `7${digits.slice(1)}`;
    }

    if (!digits.startsWith("7")) {
      digits = `7${digits}`;
    }

    if (digits.length === 10 && digits.startsWith("7")) {
      digits = `7${digits}`;
    }

    let normalized = digits.slice(0, 11);

    const area = normalized.slice(1, Math.min(4, normalized.length));
    const first = normalized.slice(4, Math.min(7, normalized.length));
    const second = normalized.slice(7, Math.min(9, normalized.length));
    const third = normalized.slice(9, Math.min(11, normalized.length));

    let result = "+7";

    if (!area) {
      return result;
    }

    result += ` (${area}${area.length === 3 ? ")" : ""}`;

    if (area.length < 3) {
      return result;
    }

    if (first) {
      result += ` ${first}`;
    }

    if (first.length < 3) {
      return result;
    }

    if (second) {
      result += ` ${second}`;
    }

    if (second.length < 2) {
      return result;
    }

    if (third) {
      result += ` ${third}`;
    }

    return result;
  };

  const phoneRegister = register("phone", {
    required: "Телефон обязателен",
    validate: (value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length === 11 || "Введите корректный номер";
    },
  });

  const { ref: phoneRef, onBlur: phoneOnBlur, name: phoneName } = phoneRegister;

  // Функция поиска подсказок
  const searchSuggestions = (field: "fullName" | "iin" | "phone" | "company", value: string) => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = value.toLowerCase().trim();

    // Получаем уникальные визиты по ИИН
    const uniqueVisitsMap = new Map<string, Visit>();
    visits.forEach(visit => {
      if (!uniqueVisitsMap.has(visit.iin)) {
        uniqueVisitsMap.set(visit.iin, visit);
      }
    });
    
    const uniqueVisits = Array.from(uniqueVisitsMap.values());
    
    // Фильтруем по активному полю
    let filtered: Visit[] = [];
    
    switch (field) {
      case "fullName":
        filtered = uniqueVisits.filter(v => 
          v.fullName.toLowerCase().includes(query)
        );
        break;
      case "iin":
        filtered = uniqueVisits.filter(v => 
          v.iin.includes(query)
        );
        break;
      case "phone":
        const phoneDigits = value.replace(/\D/g, "");
        filtered = uniqueVisits.filter(v => 
          v.phone.replace(/\\D/g, "").includes(phoneDigits)
        );
        break;
      case "company":
        filtered = uniqueVisits.filter(v => 
          v.company.toLowerCase().includes(query)
        );
        break;
    }
    
    // Ограничиваем количество подсказок
    setSuggestions(filtered.slice(0, 5));
    setShowSuggestions(filtered.length > 0);
  };

  // Функция автозаполнения при выборе подсказки
  const selectSuggestion = (visit: Visit) => {
    setValue("fullName", visit.fullName);
    setValue("iin", visit.iin);
    setValue("phone", formatPhoneNumber(visit.phone), {
      shouldValidate: true,
    });
    setValue("company", visit.company);
    if (visit.purpose) {
      setValue("purpose", visit.purpose);
    }
    
    setShowSuggestions(false);
    setSuggestions([]);
    
    toast.success("✅ Данные заполнены", {
      description: `${visit.fullName} • ${visit.company}`,
    });
  };

  // Закрытие подсказок при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const onSubmit = async (data: GuestFormData) => {
    if (!onRegisterVisit) {
      return;
    }

    try {
      const created = await onRegisterVisit({
        fullName: data.fullName,
        iin: data.iin,
        phone: data.phone,
        company: data.company,
        purpose: data.purpose,
        places: data.places.split(",").map((p) => p.trim()).filter(Boolean),
        notes: data.notes,
        hasVehicle: isTransport,
        vehicleNumber: data.vehicleNumber || undefined,
        techPassport: data.techPassport || undefined,
        ttn: data.ttn || undefined,
        cargoType: data.cargoType || undefined,
      });

      // Звуковое уведомление
      const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBCh+zPLTgjMGHm7A7+OZRQ0PVKzn77BdGA==");
      audio.play().catch(() => {});

      toast.success("✅ Въезд зарегистрирован", {
        description: `${created.fullName} • ${created.company}`,
      });

      reset();
      setDraft({ guest: {}, transport: {} });
      setIsTransport(false);
    } catch (error) {
      console.error("Ошибка регистрации въезда:", error);
      const message = error instanceof Error ? error.message : "Ошибка при регистрации въезда";
      toast.error(message);
      throw error;
    }
  };

  const handleTypeSwitch = (checked: boolean) => {
    // Сохраняем текущие данные формы в черновик
    const currentValues = getValues();
    if (isTransport) {
      // Переключаемся с транспорта на гостя
      setDraft((prev) => ({
        ...prev,
        transport: currentValues,
      }));
      // Восстанавливаем черновик гостя
      if (Object.keys(draft.guest).length > 0) {
        Object.entries(draft.guest).forEach(([key, value]) => {
          const formattedValue =
            key === "phone" ? formatPhoneNumber(String(value ?? "")) : value;
          setValue(key as keyof GuestFormData, formattedValue as any, {
            shouldValidate: key === "phone",
          });
        });
      } else {
        // Очищаем только поля транспорта
        setValue("vehicleNumber", "");
        setValue("techPassport", "");
        setValue("ttn", "");
        setValue("cargoType", "");
      }
    } else {
      // Переключаемся с гостя на транспорт
      setDraft((prev) => ({
        ...prev,
        guest: currentValues,
      }));
      // Восстанавливаем черновик транспорта
      if (Object.keys(draft.transport).length > 0) {
        Object.entries(draft.transport).forEach(([key, value]) => {
          const formattedValue =
            key === "phone" ? formatPhoneNumber(String(value ?? "")) : value;
          setValue(key as keyof GuestFormData, formattedValue as any, {
            shouldValidate: key === "phone",
          });
        });
      }
    }
    
    setIsTransport(checked);
  };

  return (
    <div className="space-y-6">
      {/* Переключатель типа */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <User className={`h-5 w-5 ${!isTransport ? "text-primary" : "text-muted-foreground"}`} />
          <span className={!isTransport ? "text-foreground" : "text-muted-foreground"}>
            Гость
          </span>
        </div>
        <Switch checked={isTransport} onCheckedChange={handleTypeSwitch} />
        <div className="flex items-center gap-2">
          <Truck className={`h-5 w-5 ${isTransport ? "text-primary" : "text-muted-foreground"}`} />
          <span className={isTransport ? "text-foreground" : "text-muted-foreground"}>
            Транспорт
          </span>
        </div>
      </div>

      <Separator />

      {/* Форма регистрации */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Основная информация */}
        <div className="space-y-4">
          <h3 className="text-foreground">
            {isTransport ? "Информация о водителе" : "Информация о госте"}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Label htmlFor="fullName">
                ФИО {isTransport ? "водителя" : ""} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                {...register("fullName", {
                  required: "ФИО обязательно",
                  minLength: { value: 3, message: "Минимум 3 символа" },
                })}
                placeholder="Иванов Иван Иванович"
                onChange={(e) => {
                  searchSuggestions("fullName", e.target.value);
                  setActiveField("fullName");
                }}
                onFocus={() => setActiveField("fullName")}
              />
              {errors.fullName && (
                <p className="text-destructive mt-1 text-sm">{errors.fullName.message}</p>
              )}
              
              {/* Подсказки для ФИО */}
              {showSuggestions && activeField === "fullName" && suggestions.length > 0 && (
                <div
                  ref={suggestionRef}
                  className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md"
                >
                  {suggestions.map((visit) => (
                    <div
                      key={visit.iin}
                      className="cursor-pointer px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0"
                      onClick={() => selectSuggestion(visit)}
                    >
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground truncate">{visit.fullName}</p>
                          <p className="text-muted-foreground truncate text-sm">{visit.company}</p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span>ИИН: {visit.iin}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(visit.entryTime).toLocaleDateString("ru-RU")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <Label htmlFor="iin">
                ИИН <span className="text-destructive">*</span>
              </Label>
              <Input
                id="iin"
                {...register("iin", {
                  required: "ИИН обязателен",
                  pattern: {
                    value: /^\d{12}$/,
                    message: "ИИН должен содержать 12 цифр",
                  },
                })}
                placeholder="920515301234"
                maxLength={12}
                onChange={(e) => {
                  searchSuggestions("iin", e.target.value);
                  setActiveField("iin");
                }}
                onFocus={() => setActiveField("iin")}
              />
              {errors.iin && <p className="text-destructive mt-1 text-sm">{errors.iin.message}</p>}
              
              {/* Подсказки для ИИН */}
              {showSuggestions && activeField === "iin" && suggestions.length > 0 && (
                <div
                  ref={suggestionRef}
                  className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md"
                >
                  {suggestions.map((visit) => (
                    <div
                      key={visit.iin}
                      className="cursor-pointer px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0"
                      onClick={() => selectSuggestion(visit)}
                    >
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground truncate">{visit.fullName}</p>
                          <p className="text-muted-foreground truncate text-sm">{visit.company}</p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span>ИИН: {visit.iin}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(visit.entryTime).toLocaleDateString("ru-RU")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Label htmlFor="phone">
                Телефон <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                name={phoneName}
                ref={phoneRef}
                value={phoneValue ?? ""}
                onBlur={phoneOnBlur}
                placeholder="+7 (707) 123 45 67"
                onChange={(event) => {
                  const formatted = formatPhoneNumber(event.target.value);
                  setValue("phone", formatted, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                  searchSuggestions("phone", formatted);
                  setActiveField("phone");
                }}
                onFocus={() => setActiveField("phone")}
              />
              {errors.phone && <p className="text-destructive mt-1 text-sm">{errors.phone.message}</p>}
              
              {/* Подсказки для Телефона */}
              {showSuggestions && activeField === "phone" && suggestions.length > 0 && (
                <div
                  ref={suggestionRef}
                  className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md"
                >
                  {suggestions.map((visit) => (
                    <div
                      key={visit.iin}
                      className="cursor-pointer px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0"
                      onClick={() => selectSuggestion(visit)}
                    >
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground truncate">{visit.fullName}</p>
                          <p className="text-muted-foreground truncate text-sm">{visit.company}</p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span>ИИН: {visit.iin}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(visit.entryTime).toLocaleDateString("ru-RU")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <Label htmlFor="company">
                Компания <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company"
                {...register("company", { required: "Компания обязательна" })}
                placeholder='ТОО "Агроснаб"'
                onChange={(e) => {
                  searchSuggestions("company", e.target.value);
                  setActiveField("company");
                }}
                onFocus={() => setActiveField("company")}
              />
              {errors.company && (
                <p className="text-destructive mt-1 text-sm">{errors.company.message}</p>
              )}
              
              {/* Подсказки для Компании */}
              {showSuggestions && activeField === "company" && suggestions.length > 0 && (
                <div
                  ref={suggestionRef}
                  className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 overflow-y-auto"
                >
                  {suggestions.map((visit) => (
                    <div
                      key={visit.iin}
                      className="cursor-pointer px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0"
                      onClick={() => selectSuggestion(visit)}
                    >
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground truncate">{visit.fullName}</p>
                          <p className="text-muted-foreground truncate text-sm">{visit.company}</p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span>ИИН: {visit.iin}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(visit.entryTime).toLocaleDateString("ru-RU")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purpose">
                Цель визита <span className="text-destructive">*</span>
              </Label>
              <Input
                id="purpose"
                {...register("purpose", { required: "Цель визита обязательна" })}
                placeholder="Деловая встреча"
              />
              {errors.purpose && (
                <p className="text-destructive mt-1">{errors.purpose.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="places">
                Места посещения <span className="text-destructive">*</span>
              </Label>
              <Input
                id="places"
                {...register("places", { required: "Укажите места посещения" })}
                placeholder="Офис, Склад №3"
              />
              {errors.places && (
                <p className="text-destructive mt-1">{errors.places.message}</p>
              )}
              <p className="text-muted-foreground mt-1">
                Укажите места через запятую
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Примечание</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Дополнительная информация (необязательно)"
              rows={2}
            />
          </div>
        </div>

        {/* Информация о транспорте */}
        {isTransport && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-foreground">Информация о транспорте</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vehicleNumber">
                    Гос. номер <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="vehicleNumber"
                    {...register("vehicleNumber", {
                      required: "Гос. номер обязателен",
                    })}
                    placeholder="А123BC01"
                  />
                  {errors.vehicleNumber && (
                    <p className="text-destructive mt-1">{errors.vehicleNumber.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="techPassport">№ Тех. паспорта</Label>
                  <Input
                    id="techPassport"
                    {...register("techPassport")}
                    placeholder="KZ1234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ttn">№ ТТН</Label>
                  <Input
                    id="ttn"
                    {...register("ttn")}
                    placeholder="TTN-2024-0012345"
                  />
                </div>

                <div>
                  <Label htmlFor="cargoType">Тип груза</Label>
                  <Input
                    id="cargoType"
                    {...register("cargoType")}
                    placeholder="Сельхозтехника, Удобрения"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Кнопки */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
            }}
            disabled={isSubmitting}
          >
            Очистить
          </Button>
          <Button type="submit" className="gap-2" disabled={isSubmitting}>
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? "Регистрация..." : "Зарегистрировать въезд"}
          </Button>
        </div>
      </form>
    </div>
  );
}