import { useEffect, useMemo } from "react";
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
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Agency, Branch } from "../types";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { usePersistentCollection } from "../hooks/usePersistentCollection";
import { STORAGE_KEYS } from "../utils/storage";
import { initialBranches } from "../data/initialData";

interface AgencyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agency: Agency | null;
  onSave: (data: Partial<Agency>) => void;
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
  status: "active" | "inactive";
}

export function AgencyFormDialog({
  open,
  onOpenChange,
  agency,
  onSave,
}: AgencyFormDialogProps) {
  const [storedBranches] = usePersistentCollection<Branch>(
    STORAGE_KEYS.branches,
    initialBranches
  );
  const branchOptions = useMemo(
    () => storedBranches.map((branch) => ({ id: branch.id, name: branch.name })),
    [storedBranches]
  );

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
        contractStart: agency.contractStart.split(".").reverse().join("-"), // Convert DD.MM.YYYY to YYYY-MM-DD
        contractEnd: agency.contractEnd.split(".").reverse().join("-"),
        loginEmail: agency.loginEmail,
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
        status: "active",
      });
    }
  }, [agency, reset]);

  const onSubmit = (data: FormData) => {
    // Convert dates back to DD.MM.YYYY
    const formattedData = {
      ...data,
      contractStart: data.contractStart.split("-").reverse().join("."),
      contractEnd: data.contractEnd.split("-").reverse().join("."),
      branchNames: branchOptions
        .filter((branch) => data.branches.includes(branch.id))
        .map((branch) => branch.name),
    };
    onSave(formattedData);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {agency ? "Редактирование агентства" : "Новое агентство"}
          </DialogTitle>
          <DialogDescription>
            {agency
              ? "Измените данные охранного агентства и нажмите «Сохранить»"
              : "Заполните данные нового охранного агентства"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                      pattern: {
                        value: /^\+7 \d{3} \d{3} \d{4}$/,
                        message: "Формат: +7 XXX XXX XXXX",
                      },
                    })}
                    placeholder="+7 727 250 1000"
                  />
                  {errors.phone && (
                    <p className="text-destructive mt-1">{errors.phone.message}</p>
                  )}
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
                  {branchOptions.map((branch) => (
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
                  <Input
                    id="contractStart"
                    type="date"
                    {...register("contractStart", {
                      required: "Дата начала обязательна",
                    })}
                  />
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
                  <Input
                    id="contractEnd"
                    type="date"
                    {...register("contractEnd", {
                      required: "Дата окончания обязательна",
                    })}
                  />
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
        </ScrollArea>

        <DialogFooter className="mt-4">
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
      </DialogContent>
    </Dialog>
  );
}
