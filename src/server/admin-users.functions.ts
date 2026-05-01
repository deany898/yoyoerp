import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const ROLES = [
  "admin",
  "manager",
  "supervisor",
  "sales",
  "dispatch",
  "worker",
  "customer",
] as const;

const createUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  display_name: z.string().trim().min(2).max(80),
  username: z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9_.-]+$/).optional().or(z.literal("")),
  mobile: z.string().trim().min(4).max(20).regex(/^[+0-9 ()-]+$/).optional().or(z.literal("")),
  role: z.enum(ROLES),
});

function adminClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Only admins may create users
    const { data: isAdmin, error: rErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (rErr) throw new Error(rErr.message);
    if (!isAdmin) throw new Error("Admins only");

    const admin = adminClient();

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.display_name },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Could not create user");
    const newId = created.user.id;

    // The handle_new_user trigger creates a profile + default role.
    // Replace the role with the requested one and lock identity fields.
    await admin.from("user_roles").delete().eq("user_id", newId);
    const { error: rolErr } = await admin
      .from("user_roles")
      .insert({ user_id: newId, role: data.role });
    if (rolErr) throw new Error(rolErr.message);

    const { error: pErr } = await admin
      .from("profiles")
      .update({
        display_name: data.display_name,
        username: data.username ? data.username : null,
        mobile: data.mobile ? data.mobile : null,
        admin_locked: true,
        created_by_admin: true,
      })
      .eq("user_id", newId);
    if (pErr) throw new Error(pErr.message);

    return { user_id: newId };
  });

const setLockSchema = z.object({
  user_id: z.string().uuid(),
  locked: z.boolean(),
});

export const adminSetLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => setLockSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admins only");

    const admin = adminClient();
    const { error } = await admin
      .from("profiles")
      .update({ admin_locked: data.locked })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const resetPwSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(8).max(72),
});

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetPwSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admins only");

    const admin = adminClient();
    const { error } = await admin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });