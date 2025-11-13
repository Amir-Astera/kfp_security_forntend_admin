import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
import { Visit } from "../types";
import {
  User,
  Building2,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Calendar,
  Clock,
  Truck,
  FileText,
  Shield,
  LogOut,
  CheckCircle,
} from "lucide-react";

interface VisitDetailDialogProps {
  visit: Visit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout?: (visit: Visit) => void;
}

export function VisitDetailDialog({
  visit,
  open,
  onOpenChange,
  onCheckout,
}: VisitDetailDialogProps) {
  if (!visit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Детали визита</DialogTitle>
          <DialogDescription>
            Полная информация о визите #{visit.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Time */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {visit.status === "on-site" ? (
                  <>
                    <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
                    <span className="text-success">На территории</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Визит завершен
                    </span>
                  </>
                )}
              </div>
              {visit.timeOnSite && (
                <Badge variant="outline" className="text-foreground">
                  <Clock className="w-4 h-4 mr-2" />
                  {visit.timeOnSite}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground mb-1">Время въезда</p>
                <p className="text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-info" />
                  {visit.entryTime}
                </p>
              </div>
              {visit.exitTime && (
                <div>
                  <p className="text-muted-foreground mb-1">Время выезда</p>
                  <p className="text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-warning" />
                    {visit.exitTime}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Visitor Info */}
          <div className="space-y-4">
            <h3 className="text-foreground flex items-center gap-2">
              <User className="w-5 h-5" />
              Информация о посетителе
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground mb-1">ФИО</p>
                <p className="text-foreground">{visit.fullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">ИИН</p>
                <p className="text-foreground">{visit.iin}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Компания</p>
                <p className="text-foreground">{visit.company}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Телефон</p>
                <p className="text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {visit.phone}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Visit Purpose */}
          <div className="space-y-4">
            <h3 className="text-foreground flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Цель визита
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground mb-1">Цель</p>
                <Badge variant="outline">{visit.purpose}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground mb-2">Места посещения</p>
                <div className="flex flex-wrap gap-2">
                  {visit.places.map((place, index) => (
                    <Badge key={index} variant="secondary">
                      <MapPin className="w-3 h-3 mr-1" />
                      {place}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          {visit.hasVehicle && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-foreground flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Информация о транспорте
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground mb-1">Гос. номер</p>
                    <p className="text-foreground">
                      {visit.vehicleNumber || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Тех. паспорт</p>
                    <p className="text-foreground">
                      {visit.techPassport || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Номер ТТН</p>
                    <p className="text-foreground">{visit.ttn || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Тип груза</p>
                    <p className="text-foreground">{visit.cargoType || "—"}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Location Info */}
          <div className="space-y-4">
            <h3 className="text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Локация
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground mb-1">Филиал</p>
                <p className="text-foreground">{visit.branchName || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">КПП</p>
                <p className="text-foreground">{visit.checkpointName || "—"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Security Info */}
          <div className="space-y-4">
            <h3 className="text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Охрана
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground mb-1">Охранник</p>
                <p className="text-foreground">{visit.guardName || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Агентство</p>
                <p className="text-foreground">{visit.agencyName || "—"}</p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <Card className="p-4 bg-muted/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground mb-1">Создан</p>
                <p className="text-foreground">{visit.createdAt}</p>
              </div>
              {visit.updatedAt && (
                <div>
                  <p className="text-muted-foreground mb-1">Обновлен</p>
                  <p className="text-foreground">{visit.updatedAt}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          {visit.status === "on-site" && onCheckout && (
            <Button
              onClick={() => {
                onCheckout(visit);
                onOpenChange(false);
              }}
              className="bg-warning hover:bg-warning/90"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Зарегистрировать выход
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
