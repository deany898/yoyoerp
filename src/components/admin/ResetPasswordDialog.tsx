import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminResetPassword } from "@/server/admin-users.functions";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName: string | null;
}

export function ResetPasswordDialog({ open, onOpenChange, userId, userName }: Props) {
  const { t } = useLanguage();
  const resetFn = useServerFn(adminResetPassword);
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPw("");
      setShow(false);
    }
  }, [open]);

  async function handleSave() {
    if (!userId) return;
    if (pw.length < 8) {
      toast.error(t("uf_min_8"));
      return;
    }
    setSaving(true);
    try {
      await resetFn({ data: { user_id: userId, password: pw } });
      toast.success(t("settings_password_updated"));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("rpw_title"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("rpw_title")}</DialogTitle>
          <DialogDescription>
            {`${t("rpw_desc")}${userName ? ` · ${userName}` : ""}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("rpw_new_password")}</Label>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder={t("uf_min_8")}
              className="pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? t("uf_hide_pw") : t("uf_show_pw")}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("btn_cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || pw.length < 8}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("uf_update_pw")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}