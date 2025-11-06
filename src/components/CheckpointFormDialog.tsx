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
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkpoint } from "./CheckpointsList";

interface CheckpointFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkpoint: Checkpoint | null;
  onSave: (data: Partial<Checkpoint>) => void;
}

interface FormData {
  name: string;
  branchId: string;
  branchName: string;
  type: "entry" | "exit" | "universal";
  description?: string;
  status: "active" | "inactive";
}

// Mock branches data - in real app, fetch from API
const mockBranches = [
  { id: "1", name: "Алматы - Центральный офис" },
  { id: "2", name: "Астана - Северный" },
  { id: "3", name: "Шымкент - Южный филиал" },
  { id: "4", name: "Караганда - Промышленный" },
  { id: "5", name: "Актобе - Западный" },
];

export function CheckpointFormDialog({
  open,
  onOpenChange,
  checkpoint,
  onSave,
}: CheckpointFormDialogProps) {
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
      type: "universal",
    },
  });

  const status = watch("status");
  const type = watch("type");
  const branchId = watch("branchId");

  useEffect(() => {
    if (checkpoint) {
      reset({
        name: checkpoint.name,
        branchId: checkpoint.branchId,
        branchName: checkpoint.branchName,
        type: checkpoint.type,
        description: checkpoint.description || "",
        status: checkpoint.status,
      });
    } else {
      reset({
        name: "",
        branchId: "",
        branchName: "",
        type: "universal",
        description: "",
        status: "active",
      });
    }
  }, [checkpoint, reset]);

  const onSubmit = (data: FormData) => {
    const branch = mockBranches.find((b) => b.id === data.branchId);
    onSave({
      ...data,
      branchName: branch?.name || "",
    });
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
                  setValue("branchId", value);
                  const branch = mockBranches.find((b) => b.id === value);
                  if (branch) {
                    setValue("branchName", branch.name);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите филиал" />
                </SelectTrigger>
                <SelectContent>
                  {mockBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.branchId && (
                <p className="text-destructive mt-1">
                  {errors.branchId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="type">
                Тип КПП <span className="text-destructive">*</span>
              </Label>
              <Select
                value={type}
                onValueChange={(value) =>
                  setValue("type", value as "entry" | "exit" | "universal")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Въезд</SelectItem>
                  <SelectItem value="exit">Выезд</SelectItem>
                  <SelectItem value="universal">Универсальный</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground mt-1">
                Въезд - только для въезда на территорию, Выезд - только для
                выезда, Универсальный - для обоих направлений
              </p>
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
            <Button type="submit">Сохранить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
