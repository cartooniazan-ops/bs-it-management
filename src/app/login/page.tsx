"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const supabase = createClient();
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !authData.user) {
      setBusy(false);
      setError("The email address or password is incorrect. Please try again.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role,is_active")
      .eq("id", authData.user.id)
      .maybeSingle();

    setBusy(false);
    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      setError("Your account is inactive or its profile is not ready. Please contact the administrator.");
      return;
    }

    const destinations: Record<string, string> = {
      admin: "/admin",
      teacher: "/teacher",
    };
    router.replace(destinations[profile.role] || "/dashboard");
    router.refresh();
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="crest">BS <span>IT</span></div>
        <p className="eyebrow">CLASS MANAGEMENT SYSTEM</p>
        <h1>Welcome Back</h1>
        <p className="muted">Sign in to your account to continue.</p>
        <form onSubmit={submit} className="login-form">
          <label>Email Address<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/></label>
          {error && <p className="error" role="alert">{error}</p>}
          <button disabled={busy}>{busy ? "Signing in..." : "Sign In"} <span>→</span></button>
        </form>
        <p className="footnote">Access is provided by your BS IT administrator.</p>
      </section>
    </main>
  );
}
