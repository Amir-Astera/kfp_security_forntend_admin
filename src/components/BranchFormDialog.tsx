import { useEffect } from "react";
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
import { Branch } from "../types";

interface BranchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch | null;
  onSave: (data: Partial<Branch>) => void;
}

interface FormData {
  name: string;
  city: string;
  region: string;
  street: string;
  building: string;
  latitude?: string;
  longitude?: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
}

const regions = [
  "Алматинская область",
  "Акмолинская область",
  "Актюбинская область",
  "Атырауская область",
  "Восточно-Казахстанская область",
  "Жамбылская область",
  "Западно-Казахстанская область",
  "Карагандинская область",
  "Костанайская область",
  "Кызылординская область",
  "Мангистауская область",
  "Павлодарская область",
  "Северо-Казахстанская область",
  "Туркестанская область",
];

export function BranchFormDialog({
  open,
  onOpenChange,
  branch,
  onSave,
}: BranchFormDialogProps) {
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
    },
  });

  const status = watch("status");

  useEffect(() => {
    if (branch) {
      reset({
        name: branch.name,
        city: branch.city,
        region: branch.region,
        street: branch.street,
        building: branch.building,
        latitude: branch.latitude || "",
        longitude: branch.longitude || "",
        phone: branch.phone,
        email: branch.email,
        status: branch.status,
      });
    } else {
      reset({
        name: "",
        city: "",
        region: "",
        street: "",
        building: "",
        latitude: "",
        longitude: "",
        phone: "",
        email: "",
        status: "active",
      });
    }
  }, [branch, reset]);

  const onSubmit = (data: FormData) => {
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {branch ? "Редактирование филиала" : "Новый филиал"}
          </DialogTitle>
          <DialogDescription>
            {branch
              ? "Измените данные филиала и нажмите «Сохранить»"
              : "Заполните данные нового филиала"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">
                Название филиала <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("name", {
                  required: "Название обязательно",
                  minLength: { value: 3, message: "Минимум 3 символа" },
                })}
                placeholder="Алматы - Центральный офис"
              />
              {errors.name && (
                <p className="text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">
                  Город <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  {...register("city", { required: "Город обязателен" })}
                  placeholder="Алматы"
                />
                {errors.city && (
                  <p className="text-destructive mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="region">
                  Область <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch("region")}
                  onValueChange={(value) => setValue("region", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите область" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.region && (
                  <p className="text-destructive mt-1">{errors.region.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="street">
                  Улица <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="street"
                  {...register("street", { required: "Улица обязательна" })}
                  placeholder="пр. Абая"
                />
                {errors.street && (
                  <p className="text-destructive mt-1">{errors.street.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="building">
                  Дом <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="building"
                  {...register("building", { required: "Номер дома обязателен" })}
                  placeholder="150А"
                />
                {errors.building && (
                  <p className="text-destructive mt-1">{errors.building.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Широта (опционально)</Label>
                <Input
                  id="latitude"
                  {...register("latitude", {
                    pattern: {
                      value: /^-?\d+\.?\d*$/,
                      message: "Неверный формат широты",
                    },
                  })}
                  placeholder="43.238293"
                />
                {errors.latitude && (
                  <p className="text-destructive mt-1">
                    {errors.latitude.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="longitude">Долгота (опционально)</Label>
                <Input
                  id="longitude"
                  {...register("longitude", {
                    pattern: {
                      value: /^-?\d+\.?\d*$/,
                      message: "Неверный формат долготы",
                    },
                  })}
                  placeholder="76.889709"
                />
                {errors.longitude && (
                  <p className="text-destructive mt-1">
                    {errors.longitude.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-foreground">Контактная информация</h3>

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
                placeholder="+7 727 250 5000"
              />
              {errors.phone && (
                <p className="text-destructive mt-1">{errors.phone.message}</p>
              )}
              <p className="text-muted-foreground mt-1">
                Формат: +7 XXX XXX XXXX
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
                placeholder="almaty.central@kfp.kz"
              />
              {errors.email && (
                <p className="text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Статус</Label>
            <Select value={status} onValueChange={(value) => setValue("status", value as "active" | "inactive")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Активен</SelectItem>
                <SelectItem value="inactive">Неактивен</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit">Сохранить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
