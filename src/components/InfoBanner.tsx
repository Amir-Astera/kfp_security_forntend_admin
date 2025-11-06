import { Info } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface InfoBannerProps {
  children: React.ReactNode;
}

export function InfoBanner({ children }: InfoBannerProps) {
  return (
    <Alert className="bg-info/10 border-info/20 text-info-foreground">
      <Info className="h-4 w-4 text-info" />
      <AlertDescription className="text-foreground ml-2">
        {children}
      </AlertDescription>
    </Alert>
  );
}
