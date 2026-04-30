import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCloudNotifications, type NotificationRow } from "@/hooks/useErpData";
import type { Notification, NotificationType } from "@/types/inventory";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

function toLegacy(n: NotificationRow): Notification {
  return {
    id: n.id,
    type: (n.type as NotificationType) ?? "system",
    title: n.title,
    message: n.message ?? "",
    isRead: n.is_read,
    link: null,
    referenceId: n.reference_id ?? null,
    createdAt: n.created_at,
  };
}

export function useNotifications(): QueryResult<Notification[]> {
  const { notifications, loading } = useCloudNotifications();
  return { data: notifications.map(toLegacy), isLoading: loading, error: null };
}

export function useUnreadCount(): number {
  const { notifications } = useCloudNotifications();
  return notifications.filter((n) => !n.is_read).length;
}

export function useMarkAsRead() {
  return useCallback(async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }, []);
}

export function useMarkAllAsRead() {
  return useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  }, []);
}

export function useDismissNotification() {
  return useCallback(async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
  }, []);
}