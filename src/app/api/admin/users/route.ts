import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const allowedRoles = ["student", "teacher", "cr", "gr"] as const;
type ManagedRole = (typeof allowedRoles)[number];

export async function POST(request: Request) {
  try {
    const sessionClient = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

    const { data: actor, error: actorError } = await sessionClient
      .from("profiles").select("role,is_active").eq("id", user.id).single();
    if (actorError || actor?.role !== "admin" || !actor.is_active) {
      return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "Server setup incomplete: add SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables." }, { status: 503 });
    }
    const adminClient = createSupabaseAdminClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const body = await request.json();
    const action = body?.action as string;

    if (action === "create") {
      const full_name = String(body.full_name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const role = body.role as ManagedRole;
      if (full_name.length < 2 || full_name.length > 100) return NextResponse.json({ error: "Enter a valid full name." }, { status: 400 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
      if (password.length < 8 || password.length > 72) return NextResponse.json({ error: "Password must be 8–72 characters." }, { status: 400 });
      if (!allowedRoles.includes(role)) return NextResponse.json({ error: "Select a valid account role." }, { status: 400 });
      const { data, error } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name }
      });
      if (error || !data.user) return NextResponse.json({ error: error?.message || "Could not create account." }, { status: 400 });
      const { error: profileError } = await adminClient.from("profiles")
        .update({ full_name, email, role, is_active: true }).eq("id", data.user.id);
      if (profileError) {
        await adminClient.auth.admin.deleteUser(data.user.id);
        return NextResponse.json({ error: "Account setup failed: " + profileError.message }, { status: 500 });
      }
      return NextResponse.json({ user: { id: data.user.id, full_name, email, role, is_active: true } });
    }

    const targetId = String(body.user_id || "");
    if (!targetId || targetId === user.id) return NextResponse.json({ error: "Select another valid user account." }, { status: 400 });
    const { data: target, error: targetError } = await adminClient.from("profiles")
      .select("id,role").eq("id", targetId).single();
    if (targetError || !target) return NextResponse.json({ error: "User account not found." }, { status: 404 });
    if (target.role === "admin") return NextResponse.json({ error: "Admin accounts are protected from these actions." }, { status: 403 });

    if (action === "password") {
      const password = String(body.password || "");
      if (password.length < 8 || password.length > 72) return NextResponse.json({ error: "Password must be 8–72 characters." }, { status: 400 });
      const { error } = await adminClient.auth.admin.updateUserById(targetId, { password });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }
    if (action === "delete") {
      const { error } = await adminClient.auth.admin.deleteUser(targetId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Unexpected server error. Please try again." }, { status: 500 });
  }
}
