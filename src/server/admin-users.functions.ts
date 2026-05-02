import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const ROLES = [
  "admin",
  "manager",
  "supervisor",
  "accountant",
  "sales",
  "dispatch",
  "worker",
  "customer",
] as const;

const createUserSchema = z.object({
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  password: z.string().min(8).max(72),
  display_name: z.string().trim().min(2).max(80),
  username: z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9_.-]+$/).optional().or(z.literal("")),
  mobile: z.string().trim().min(4).max(20).regex(/^[+0-9 ()-]+$/),
  role: z.enum(ROLES),
  active: z.boolean().optional().default(true),
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

    // Normalize mobile (digits/+ only) for synthetic email
    const mobileNormalized = data.mobile.replace(/[^+0-9]/g, "");
    const email = data.email && data.email.length > 0
      ? data.email
      : `${mobileNormalized.replace(/^\+/, "")}@staff.yoyo.internal`;

    // Pre-check mobile uniqueness for friendly error
    const { data: dup } = await admin
      .from("profiles")
      .select("id")
      .eq("mobile", data.mobile)
      .maybeSingle();
    if (dup) throw new Error("Mobile already registered");

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
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
        mobile: data.mobile,
        admin_locked: !data.active,
        created_by_admin: true,
      })
      .eq("user_id", newId);
    if (pErr) throw new Error(pErr.message);

    return { user_id: newId };
  });

const updateUserSchema = z.object({
  user_id: z.string().uuid(),
  display_name: z.string().trim().min(2).max(80).optional(),
  mobile: z.string().trim().min(4).max(20).regex(/^[+0-9 ()-]+$/).optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
});

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admins only");

    const admin = adminClient();

    // Mobile uniqueness check
    if (data.mobile) {
      const { data: dup } = await admin
        .from("profiles")
        .select("user_id")
        .eq("mobile", data.mobile)
        .maybeSingle();
      if (dup && dup.user_id !== data.user_id) {
        throw new Error("Mobile already registered");
      }
    }

    const profileUpdate: Record<string, unknown> = {};
    if (data.display_name !== undefined) profileUpdate.display_name = data.display_name;
    if (data.mobile !== undefined) profileUpdate.mobile = data.mobile;
    if (data.active !== undefined) profileUpdate.admin_locked = !data.active;
    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await admin.from("profiles").update(profileUpdate).eq("user_id", data.user_id);
      if (error) throw new Error(error.message);
    }

    if (data.role) {
      // Block self-demotion from admin
      if (data.user_id === userId) {
        const { data: currentRoles } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        const isCurrentlyAdmin = (currentRoles ?? []).some((r) => r.role === "admin");
        if (isCurrentlyAdmin && data.role !== "admin") {
          throw new Error("You cannot change your own role");
        }
      }
      await admin.from("user_roles").delete().eq("user_id", data.user_id);
      const { error } = await admin
        .from("user_roles")
        .insert({ user_id: data.user_id, role: data.role });
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admins only");

    const admin = adminClient();
    const [{ data: profiles }, { data: roles }, { data: authData }] = await Promise.all([
      admin.from("profiles").select("user_id, display_name, mobile, admin_locked, created_at"),
      admin.from("user_roles").select("user_id, role"),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r) => roleMap.set(r.user_id, r.role));
    const lastSignInMap = new Map<string, string | null>();
    (authData?.users ?? []).forEach((u) => lastSignInMap.set(u.id, u.last_sign_in_at ?? null));

    const list = (profiles ?? []).map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      mobile: p.mobile,
      role: (roleMap.get(p.user_id) ?? "customer") as (typeof ROLES)[number],
      active: !p.admin_locked,
      last_sign_in_at: lastSignInMap.get(p.user_id) ?? null,
      created_at: p.created_at,
    }));
    list.sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""));
    return { users: list };
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