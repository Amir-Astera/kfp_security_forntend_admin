import { useEffect, useState } from "react";
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
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { db } from "../services";
import { toast } from "sonner@2.0.3";
import type { Visit } from "../types";
import { X, Upload, Camera, Image as ImageIcon } from "lucide-react";

interface VisitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: Visit | null;
  onCreateOrUpdate: (data: any) => void;
}

const purposes = [
  "Деловая встреча",
  "Поставка товаров",
  "Обслуживание",
  "Совещание",
  "Инспекция",
  "Ремонтные работы",
  "Прочее",
];

export function VisitFormDialog({
  open,
  onOpenChange,
  visit,
  onCreateOrUpdate,
}: VisitFormDialogProps) {
  const [branches, setBranches] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string>("");
  const [selectedGuard, setSelectedGuard] = useState<string>("");
  const [hasVehicle, setHasVehicle] = useState(false);
  const [places, setPlaces] = useState<string[]>([]);
  const [newPlace, setNewPlace] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm();

  // Загрузка данных
  useEffect(() => {
    try {
      const branchesData = db.getBranches();
      setBranches(branchesData);

      const checkpointsData = db.getCheckpoints();
      setCheckpoints(checkpointsData);

      const guardsData = db.getGuards();
      setGuards(guardsData);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    }
  }, []);

  // Заполнение формы при редактировании
  useEffect(() => {
    if (visit) {
      setValue("fullName", visit.fullName);
      setValue("iin", visit.iin);
      setValue("phone", visit.phone);
      setValue("company", visit.company);
      setValue("purpose", visit.purpose);
      setValue("vehicleNumber", visit.vehicleNumber || "");
      setValue("cargoType", visit.cargoType || "");
      setValue("techPassport", visit.techPassport || "");
      setValue("ttn", visit.ttn || "");
      setValue("notes", visit.notes || "");
      setSelectedBranch(visit.branchId);
      setSelectedCheckpoint(visit.checkpointId);
      setSelectedGuard(visit.guardId);
      setHasVehicle(visit.hasVehicle);
      setPlaces(visit.places || []);
      setPhotos(visit.photos || []);
    } else {
      reset();
      setSelectedBranch("");
      setSelectedCheckpoint("");
      setSelectedGuard("");
      setHasVehicle(false);
      setPlaces([]);
      setNewPlace("");
      setPhotos([]);
    }
  }, [visit, setValue, reset]);

  const onSubmit = (data: any) => {
    if (!selectedBranch) {
      toast.error("Выберите филиал");
      return;
    }
    if (!selectedCheckpoint) {
      toast.error("Выберите КПП");
      return;
    }
    if (!selectedGuard) {
      toast.error("Выберите охранника");
      return;
    }

    const visitData = {
      ...data,
      branchId: selectedBranch,
      checkpointId: selectedCheckpoint,
      guardId: selectedGuard,
      hasVehicle,
      places,
      photos,
      vehicleNumber: hasVehicle ? data.vehicleNumber : undefined,
      cargoType: hasVehicle ? data.cargoType : undefined,
      techPassport: hasVehicle ? data.techPassport : undefined,
      ttn: hasVehicle ? data.ttn : undefined,
    };

    onCreateOrUpdate(visitData);
  };

  const availableCheckpoints = checkpoints.filter(
    (cp) => cp.branchId === selectedBranch
  );

  const availableGuards = guards.filter(
    (g) => g.branchId === selectedBranch && g.checkpointId === selectedCheckpoint
  );

  const addPlace = () => {
    if (newPlace.trim() && !places.includes(newPlace.trim())) {
      setPlaces([...places, newPlace.trim()]);
      setNewPlace("");
    }
  };

  const removePlace = (place: string) => {
    setPlaces(places.filter((p) => p !== place));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onloadend = () => {
          newPhotos.push(reader.result as string);
          if (newPhotos.length === files.length) {
            setPhotos([...photos, ...newPhotos]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removePhoto = (photo: string) => {
    setPhotos(photos.filter((p) => p !== photo));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {visit ? "Редактировать визит" : "Зарегистрировать визит"}
          </DialogTitle>
          <DialogDescription>
            {visit
              ? "Обновите информацию о визите"
              : "Заполните данные посетителя"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Персональная информация */}
          <div className="space-y-4">
            <h3 className="text-foreground">Персональная информация</h3>

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

              <div className="col-span-2">
                <Label htmlFor="company">Компания *</Label>
                <Input
                  id="company"
                  {...register("company", {
                    required: "Обязательное поле",
                  })}
                  placeholder="ТОО «Компания»"
                />
                {errors.company && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.company.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Локация */}
          <div className="space-y-4">
            <h3 className="text-foreground">Локация и охранник</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Филиал *</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите филиал" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
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

              <div>
                <Label>Охранник *</Label>
                <Select
                  value={selectedGuard}
                  onValueChange={setSelectedGuard}
                  disabled={!selectedCheckpoint}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите охранника" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGuards.map((guard) => (
                      <SelectItem key={guard.id} value={guard.id}>
                        {guard.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Цель визита */}
          <div className="space-y-4">
            <h3 className="text-foreground">Цель визита</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Цель визита *</Label>
                <Select {...register("purpose", { required: true })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите цель" />
                  </SelectTrigger>
                  <SelectContent>
                    {purposes.map((purpose) => (
                      <SelectItem key={purpose} value={purpose}>
                        {purpose}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Места посещения на территории</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newPlace}
                  onChange={(e) => setNewPlace(e.target.value)}
                  placeholder="Например: Склад №3, Офис 201"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPlace();
                    }
                  }}
                />
                <Button type="button" onClick={addPlace} variant="outline">
                  Добавить
                </Button>
              </div>
              {places.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {places.map((place) => (
                    <Badge key={place} variant="secondary" className="gap-1">
                      {place}
                      <button
                        type="button"
                        onClick={() => removePlace(place)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Транспорт */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hasVehicle"
                checked={hasVehicle}
                onCheckedChange={(checked) => setHasVehicle(checked as boolean)}
              />
              <Label htmlFor="hasVehicle" className="cursor-pointer">
                Визит на транспорте
              </Label>
            </div>

            {hasVehicle && (
              <Card className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vehicleNumber">Гос. номер *</Label>
                    <Input
                      id="vehicleNumber"
                      {...register("vehicleNumber", {
                        required: hasVehicle ? "Обязательное поле" : false,
                      })}
                      placeholder="A123BC01"
                    />
                    {errors.vehicleNumber && (
                      <p className="text-destructive text-sm mt-1">
                        {errors.vehicleNumber.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="cargoType">Тип груза</Label>
                    <Input
                      id="cargoType"
                      {...register("cargoType")}
                      placeholder="Например: Офисная техника"
                    />
                  </div>

                  <div>
                    <Label htmlFor="techPassport">Тех. паспорт</Label>
                    <Input
                      id="techPassport"
                      {...register("techPassport")}
                      placeholder="Номер тех. паспорта"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ttn">ТТН</Label>
                    <Input
                      id="ttn"
                      {...register("ttn")}
                      placeholder="Номер товарно-транспортной накладной"
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Фотографии */}
          <div>
            <Label>Фотографии</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("photoUpload")?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Загрузить
              </Button>
              <input
                type="file"
                id="photoUpload"
                className="hidden"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
              />
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {photos.map((photo) => (
                  <div key={photo} className="relative">
                    <ImageIcon className="w-24 h-24" />
                    <img
                      src={photo}
                      alt="Фото"
                      className="absolute top-0 left-0 w-24 h-24 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo)}
                      className="absolute top-1 right-1 bg-white rounded-full p-1 hover:bg-gray-100"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Примечания */}
          <div>
            <Label htmlFor="notes">Примечания</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Дополнительная информация о визите"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit">
              {visit ? "Сохранить изменения" : "Зарегистрировать визит"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}