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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setError("Email ya password ghalat hai. Dobara check karein."); return; }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="crest">BS <span>IT</span></div>
        <p className="eyebrow">CLASS MANAGEMENT SYSTEM</p>
        <h1>Khush Aamdeed</h1>
        <p className="muted">Apne account mein login karein.</p>
        <form onSubmit={submit} className="login-form">
          <label>Email address<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Apna password likhein"/></label>
          {error && <p className="error" role="alert">{error}</p>}
          <button disabled={busy}>{busy ? "Login ho raha hai..." : "Login karein"} <span>→</span></button>
        </form>
        <p className="footnote">Login ki sahulat BS IT administrator deta hai.</p>
      </section>
    </main>
  );
}
