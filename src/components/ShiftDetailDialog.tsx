import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Monitor,
  MapPin,
  Clock,
  Image as ImageIcon,
  Wifi,
  Smartphone,
  Sun,
  Moon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface ShiftSession {
  id: string;
  loginTime: string;
  logoutTime: string | null;
  device: string;
  ipAddress: string;
  screenTime: number; // минуты
  hasPhoto: boolean;
}

interface ShiftEvent {
  id: string;
  guardName: string;
  guardId: string;
  date: string;
  shiftType: "day" | "night";
  timeRange: string;
  checkpoint: string;
  status: "scheduled" | "completed" | "missed";
}

interface ShiftDetailDialogProps {
  shift: ShiftEvent;
  onClose: () => void;
}

export function ShiftDetailDialog({ shift, onClose }: ShiftDetailDialogProps) {
  // Мок-данные сессий
  const sessions: ShiftSession[] = [
    {
      id: "1",
      loginTime: "08:05",
      logoutTime: "12:10",
      device: "iPhone 13 Pro",
      ipAddress: "192.168.1.45",
      screenTime: 245,
      hasPhoto: true,
    },
    {
      id: "2",
      loginTime: "12:15",
      logoutTime: "16:25",
      device: "iPhone 13 Pro",
      ipAddress: "192.168.1.45",
      screenTime: 250,
      hasPhoto: true,
    },
    {
      id: "3",
      loginTime: "16:30",
      logoutTime: "20:35",
      device: "iPhone 13 Pro",
      ipAddress: "192.168.1.45",
      screenTime: 245,
      hasPhoto: true,
    },
  ];

  const totalScreenTime = sessions.reduce((sum, s) => sum + s.screenTime, 0);
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  const handleViewPhoto = (sessionId: string) => {
    alert(`Просмотр фото для сессии ${sessionId}`);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {shift.guardName.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span>{shift.guardName}</span>
                {shift.shiftType === "day" ? (
                  <Sun className="w-4 h-4 text-warning" />
                ) : (
                  <Moon className="w-4 h-4 text-info" />
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                {shift.date} • {shift.timeRange}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Детали смены для {shift.guardName} на {shift.date}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">КПП</span>
              </div>
              <p className="text-foreground">{shift.checkpoint}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Экранное время</span>
              </div>
              <p className="text-foreground">{formatTime(totalScreenTime)}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Сессий</span>
              </div>
              <p className="text-foreground">{sessions.length}</p>
            </div>
          </div>

          {/* Sessions Table */}
          <div>
            <h4 className="text-foreground mb-3">История входов</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Время входа</TableHead>
                    <TableHead>Время выхода</TableHead>
                    <TableHead>Устройство</TableHead>
                    <TableHead>IP адрес</TableHead>
                    <TableHead className="text-center">Экранное время</TableHead>
                    <TableHead className="text-center">Фото</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <span className="text-foreground">{session.loginTime}</span>
                      </TableCell>
                      <TableCell>
                        {session.logoutTime ? (
                          <span className="text-foreground">{session.logoutTime}</span>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            В сети
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{session.device}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{session.ipAddress}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-foreground">{formatTime(session.screenTime)}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {session.hasPhoto ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPhoto(session.id)}
                          >
                            <ImageIcon className="w-4 h-4 mr-1" />
                            Просмотр
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}