import { Lock, LockOpen, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  locked: boolean;
  isSelf: boolean;
  saving: boolean;
  onToggleLock: () => void;
  onResetPassword: () => void;
}

export function UserRowActions({ locked, isSelf, saving, onToggleLock, onResetPassword }: Props) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="icon"
        variant="ghost"
        disabled={saving || isSelf}
        onClick={onToggleLock}
        title={locked ? "Unlock identity fields" : "Lock identity fields"}
      >
        {locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        disabled={saving}
        onClick={onResetPassword}
        title="Reset password"
      >
        <KeyRound className="h-4 w-4" />
      </Button>
    </div>
  );
}