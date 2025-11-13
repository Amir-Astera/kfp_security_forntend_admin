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
import { Textarea } from "./ui/textarea";
import type { Checkpoint } from "../types";

export interface CheckpointFormValues {
  name: string;
  branchId: string;
  description?: string;
  status: "active" | "inactive";
}

interface CheckpointFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkpoint: Checkpoint | null;
  onSave: (data: CheckpointFormValues) => void;
  branches: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
}

export function CheckpointFormDialog({
  open,
  onOpenChange,
  checkpoint,
  onSave,
  branches,
  isSubmitting,
}: CheckpointFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckpointFormValues>({
    defaultValues: {
      status: "active",
    },
  });

  const branchIdRegister = register("branchId", {
    required: "Выберите филиал",
  });
  const statusRegister = register("status", {
    required: "Укажите статус",
  });

  const status = watch("status");
  const branchId = watch("branchId");

  useEffect(() => {
    if (checkpoint) {
      reset({
        name: checkpoint.name,
        branchId: checkpoint.branchId,
        description: checkpoint.description || "",
        status: checkpoint.status,
      });
    } else {
      reset({
        name: "",
        branchId: "",
        description: "",
        status: "active",
      });
    }
  }, [checkpoint, reset]);

  const onSubmit = (data: CheckpointFormValues) => {
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {checkpoint ? "Редактирование КПП" : "Новый КПП"}
          </DialogTitle>
          <DialogDescription>
            {checkpoint
              ? "Измените данные КПП и нажмите «Сохранить»"
              : "Заполните данные нового контрольно-пропускного пункта"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">
                Название КПП <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("name", {
                  required: "Название обязательно",
                  minLength: { value: 3, message: "Минимум 3 символа" },
                })}
                placeholder="КПП-1 (Главный въезд)"
              />
              {errors.name && (
                <p className="text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="branchId">
                Филиал <span className="text-destructive">*</span>
              </Label>
              <Select
                value={branchId}
                onValueChange={(value) => {
                  setValue("branchId", value, { shouldValidate: true });
                }}
              >
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
              <input type="hidden" {...branchIdRegister} />
              {errors.branchId && (
                <p className="text-destructive mt-1">
                  {errors.branchId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Описание (опционально)</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Для грузового транспорта и поставок"
                rows={3}
              />
              <p className="text-muted-foreground mt-1">
                Дополнительная информация о назначении КПП
              </p>
            </div>

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
              <input type="hidden" {...statusRegister} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}