import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NotificationPreferencesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPreferences({ open, onOpenChange }: NotificationPreferencesProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            Notification preferences
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Per-user notification preferences will return once the live alerting service is wired up.
          For now, all alerts are delivered automatically.
        </p>
        <Button onClick={() => onOpenChange(false)} className="w-full mt-2">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
