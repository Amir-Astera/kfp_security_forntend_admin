import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { db } from "../services";
import type { Agency } from "../types";

// Форматирование телефона
const formatPhoneNumber = (value: string): string => {
  // Удаляем все, кроме цифр
  const digits = value.replace(/\D/g, "");
  
  // Берем только первые 11 цифр
  const limited = digits.slice(0, 11);
  
  // Если начинается с 8, заменяем на 7
  const normalized = limited.startsWith("8") ? "7" + limited.slice(1) : limited;
  
  // Форматируем: +7 (XXX) XXX XX XX
  if (normalized.length === 0) return "";
  if (normalized.length <= 1) return "+7";
  if (normalized.length <= 4) return `+7 (${normalized.slice(1)})`;
  if (normalized.length <= 7) return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4)}`;
  if (normalized.length <= 9) return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)} ${normalized.slice(7)}`;
  return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)} ${normalized.slice(7, 9)} ${normalized.slice(9, 11)}`;
};

interface AgencyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agency: Agency | null;
  onSave: (data: any) => void;
}

interface FormData {
  name: string;
  bin: string;
  director: string;
  phone: string;
  email: string;
  legalAddress: string;
  branches: string[];
  contractStart: string;
  contractEnd: string;
  loginEmail: string;
  password: string;
  status: "active" | "inactive";
}

export function AgencyFormDialog({
  open,
  onOpenChange,
  agency,
  onSave,
}: AgencyFormDialogProps) {
  const [branches, setBranches] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      status: "active",
      branches: [],
    },
  });

  const status = watch("status");
  const selectedBranches = watch("branches") || [];

  // Загрузка филиалов
  useEffect(() => {
    try {
      const data = db.getBranches();
      setBranches(data);
    } catch (error) {
      console.error("Ошибка загрузки филиалов:", error);
    }
  }, []);

  useEffect(() => {
    if (agency) {
      reset({
        name: agency.name,
        bin: agency.bin,
        director: agency.director,
        phone: agency.phone,
        email: agency.email,
        legalAddress: agency.legalAddress,
        branches: agency.branches,
        contractStart: agency.contractStart,
        contractEnd: agency.contractEnd,
        loginEmail: agency.loginEmail,
        password: agency.password,
        status: agency.status,
      });
    } else {
      reset({
        name: "",
        bin: "",
        director: "",
        phone: "",
        email: "",
        legalAddress: "",
        branches: [],
        contractStart: "",
        contractEnd: "",
        loginEmail: "",
        password: "",
        status: "active",
      });
    }
  }, [agency, reset]);

  const onSubmit = (data: FormData) => {
    // Get branch names
    const branchNames = branches
      .filter((b) => data.branches.includes(b.id))
      .map((b) => b.name);

    onSave({
      ...data,
      branchNames,
    });
  };

  const toggleBranch = (branchId: string) => {
    const current = selectedBranches || [];
    if (current.includes(branchId)) {
      setValue(
        "branches",
        current.filter((id) => id !== branchId)
      );
    } else {
      setValue("branches", [...current, branchId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0">
        <div className="flex flex-col h-full max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle>
              {agency ? "Редактирование агентства" : "Новое агентство"}
            </DialogTitle>
            <DialogDescription>
              {agency
                ? "Измените данные охранного агентства и нажмите «Сохранить»"
                : "Заполните данные нового охранного агентства"}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-6">
              {/* Company Info */}
              <div className="space-y-4">
                <h3 className="text-foreground">Информация о компании</h3>

                <div>
                  <Label htmlFor="name">
                    Название <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register("name", {
                      required: "Название обязательно",
                      minLength: { value: 3, message: "Минимум 3 символа" },
                    })}
                    placeholder='ТОО «Казахстан Секьюрити»'
                  />
                  {errors.name && (
                    <p className="text-destructive mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bin">
                      БИН <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="bin"
                      {...register("bin", {
                        required: "БИН обязателен",
                        pattern: {
                          value: /^\d{12}$/,
                          message: "БИН должен содержать 12 цифр",
                        },
                      })}
                      placeholder="123456789012"
                      maxLength={12}
                    />
                    {errors.bin && (
                      <p className="text-destructive mt-1">{errors.bin.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="director">
                      Директор (ФИО) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="director"
                      {...register("director", {
                        required: "ФИО директора обязательно",
                      })}
                      placeholder="Иванов Петр Сергеевич"
                    />
                    {errors.director && (
                      <p className="text-destructive mt-1">
                        {errors.director.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="legalAddress">
                    Юридический адрес <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="legalAddress"
                    {...register("legalAddress", {
                      required: "Юридический адрес обязателен",
                    })}
                    placeholder="г. Алматы, ул. Абая, 120"
                    rows={2}
                  />
                  {errors.legalAddress && (
                    <p className="text-destructive mt-1">
                      {errors.legalAddress.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-foreground">Контактная информация</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">
                      Телефон <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      {...register("phone", {
                        required: "Телефон обязателен",
                        validate: (value) => {
                          const digits = value.replace(/\D/g, "");
                          return digits.length === 11 || "Телефон должен содержать 11 цифр";
                        },
                      })}
                      placeholder="+7 (707) 587 58 50"
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        setValue("phone", formatted, { shouldValidate: true });
                      }}
                    />
                    {errors.phone && (
                      <p className="text-destructive mt-1">{errors.phone.message}</p>
                    )}
                    <p className="text-muted-foreground mt-1">
                      Формат: +7 (XXX) XXX XX XX
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email", {
                        required: "Email обязателен",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Неверный формат email",
                        },
                      })}
                      placeholder="info@kzsecurity.kz"
                    />
                    {errors.email && (
                      <p className="text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Branches */}
              <div className="space-y-4">
                <div>
                  <Label>
                    Прикрепленные филиалы{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-muted-foreground mt-1 mb-3">
                    Выберите филиалы, на которых будет работать это агентство
                  </p>
                </div>
                <Card className="p-4">
                  <div className="space-y-3">
                    {branches.map((branch) => (
                      <div key={branch.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`branch-${branch.id}`}
                          checked={selectedBranches.includes(branch.id)}
                          onCheckedChange={() => toggleBranch(branch.id)}
                        />
                        <Label
                          htmlFor={`branch-${branch.id}`}
                          className="cursor-pointer flex-1"
                        >
                          {branch.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </Card>
                {selectedBranches.length === 0 && (
                  <p className="text-destructive">
                    Выберите хотя бы один филиал
                  </p>
                )}
              </div>

              {/* Contract */}
              <div className="space-y-4">
                <h3 className="text-foreground">Контракт</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contractStart">
                      Дата начала <span className="text-destructive">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {watch("contractStart")
                            ? format(new Date(watch("contractStart")), "dd.MM.yyyy", { locale: ru })
                            : "Выберите дату"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={watch("contractStart") ? new Date(watch("contractStart")) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setValue("contractStart", format(date, "yyyy-MM-dd"), { shouldValidate: true });
                            }
                          }}
                          locale={ru}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.contractStart && (
                      <p className="text-destructive mt-1">
                        {errors.contractStart.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="contractEnd">
                      Дата окончания <span className="text-destructive">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {watch("contractEnd")
                            ? format(new Date(watch("contractEnd")), "dd.MM.yyyy", { locale: ru })
                            : "Выберите дату"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={watch("contractEnd") ? new Date(watch("contractEnd")) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setValue("contractEnd", format(date, "yyyy-MM-dd"), { shouldValidate: true });
                            }
                          }}
                          locale={ru}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.contractEnd && (
                      <p className="text-destructive mt-1">
                        {errors.contractEnd.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Login Credentials */}
              <div className="space-y-4">
                <h3 className="text-foreground">Учетные данные</h3>

                <div>
                  <Label htmlFor="loginEmail">
                    Email для входа <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    {...register("loginEmail", {
                      required: "Email для входа обязателен",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Неверный формат email",
                      },
                    })}
                    placeholder="kzsecurity@kfp.kz"
                  />
                  {errors.loginEmail && (
                    <p className="text-destructive mt-1">
                      {errors.loginEmail.message}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1">
                    {agency
                      ? "Email для входа в систему"
                      : "Пароль будет сгенерирован автоматически и отправлен на этот email"}
                  </p>
                </div>

                <div>
                  <Label htmlFor="password">
                    Пароль <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password", {
                      required: "Пароль обязателен",
                      minLength: { value: 6, message: "Минимум 6 символов" },
                    })}
                    placeholder="Введите пароль"
                  />
                  {errors.password && (
                    <p className="text-destructive mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status">Статус</Label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setValue("status", value as "active" | "inactive")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активен</SelectItem>
                    <SelectItem value="inactive">Неактивен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>
          </div>

          <DialogFooter className="mt-4 px-6 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={selectedBranches.length === 0}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}