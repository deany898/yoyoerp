import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Public (no-auth) server function used during login.
 * Given a raw mobile string, find the profile and return the user's real
 * auth.users email. Used to bridge the staff portal mobile-only UI with
 * Supabase Auth's email/password sign-in.
 *
 * Never reveals which step failed — returns { email: null } on any miss.
 */
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ mobile: z.string().trim().min(1).max(40) }).parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const digits = data.mobile.replace(/\D/g, "");
      if (digits.length < 6) return { email: null as string | null };

      // Normalize to last 10 digits (drop leading +91 / 0).
      const last10 = digits.slice(-10);

      // Try several stored mobile formats (raw, +digits, etc.).
      const candidates = Array.from(
        new Set([
          data.mobile.trim(),
          digits,
          `+${digits}`,
          last10,
          `+91${last10}`,
          `91${last10}`,
          `0${last10}`,
        ]),
      );

      const { data: rows } = await supabaseAdmin
        .from("profiles")
        .select("user_id, mobile")
        .in("mobile", candidates);

      let userId: string | null = rows?.[0]?.user_id ?? null;

      // Fallback: scan for last-10-digit match if not found by exact value.
      if (!userId) {
        const { data: all } = await supabaseAdmin
          .from("profiles")
          .select("user_id, mobile")
          .not("mobile", "is", null)
          .limit(2000);
        const match = (all ?? []).find(
          (r) => (r.mobile ?? "").replace(/\D/g, "").slice(-10) === last10,
        );
        userId = match?.user_id ?? null;
      }

      if (!userId) return { email: null };

      const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error || !u?.user?.email) return { email: null };
      return { email: u.user.email };
    } catch (e) {
      console.error("[resolveLoginEmail] failed:", e);
      return { email: null as string | null };
    }
  });