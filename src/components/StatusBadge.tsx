import { Badge } from "./ui/badge";

type StatusType = 
  | "active" 
  | "inactive" 
  | "on-site" 
  | "left" 
  | "day" 
  | "night"
  | "success"
  | "warning"
  | "danger";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function StatusBadge({ status, label, activeLabel, inactiveLabel }: StatusBadgeProps) {
  const configs = {
    active: { 
      label: label || activeLabel || "Активен", 
      className: "bg-success/10 text-success border-success/20" 
    },
    inactive: { 
      label: label || inactiveLabel || "Неактивен", 
      className: "bg-muted text-muted-foreground border-border" 
    },
    "on-site": { 
      label: label || "На территории", 
      className: "bg-info/10 text-info border-info/20" 
    },
    left: { 
      label: label || "Покинул", 
      className: "bg-muted text-muted-foreground border-border" 
    },
    day: { 
      label: label || "День", 
      className: "bg-warning/10 text-warning border-warning/20" 
    },
    night: { 
      label: label || "Ночь", 
      className: "bg-primary/10 text-primary border-primary/20" 
    },
    success: { 
      label: label || "Успешно", 
      className: "bg-success/10 text-success border-success/20" 
    },
    warning: { 
      label: label || "Внимание", 
      className: "bg-warning/10 text-warning border-warning/20" 
    },
    danger: { 
      label: label || "Ошибка", 
      className: "bg-destructive/10 text-destructive border-destructive/20" 
    },
  };

  const config = configs[status];

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
