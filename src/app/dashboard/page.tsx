"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = { full_name: string; email: string; role: "admin"|"teacher"|"student"|"cr" };
const sections = [
  ["Jaiza","Apni class ki mukhtasar maloomat","⌂"],
  ["Hazri","Rozana hazri aur record","✓"],
  ["Assignments","Kaam, aakhri tareekh aur jama karwana","▤"],
  ["Timetable","Peer se Jumma tak class ka schedule","▦"],
  ["Subjects","Mazameen aur teachers ki maloomat","◇"],
  ["Aham Ittilaat","Class ke zaroori paighamaat","◉"],
  ["Taleemi Mawaad","Kitabein aur lecture notes","▧"],
];
export default function DashboardPage() {
  const router = useRouter();
  const [profile,setProfile] = useState<Profile|null>(null);
  const [section,setSection] = useState("Jaiza");
  const [loading,setLoading] = useState(true);
  const [notice,setNotice] = useState("Aapka account load ho raha hai...");
  useEffect(()=>{
    const supabase=createClient();
    (async()=>{
      const {data:{user},error}=await supabase.auth.getUser();
      if(error||!user){router.replace("/login");return;}
      const {data}=await supabase.from("profiles").select("full_name,email,role").eq("id",user.id).single();
      if(!data){setNotice("Aapki profile abhi tayyar nahi. Administrator se rabta karein.");setLoading(false);return;}
      setProfile(data as Profile);setNotice("");setLoading(false);
    })();
  },[router]);
  async function logout(){const supabase=createClient();await supabase.auth.signOut();router.replace("/login");router.refresh();}
  if(loading)return <main className="loading-screen"><div className="crest small">BS <span>IT</span></div><p>{notice}</p></main>;
  if(!profile)return <main className="loading-screen"><p>{notice}</p><button className="secondary" onClick={logout}>Logout karein</button></main>;
  const roleLabel=profile.role==="cr"?"Class Representative":profile.role==="admin"?"Administrator":profile.role==="teacher"?"Teacher":"Student";
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="crest mini">BS <span>IT</span></div><div><b>BS IT</b><small>Class Management System</small></div></div>
      <p className="side-label">Aapka Workspace</p>
      <nav>{sections.map(([name,desc,icon])=><button key={name} onClick={()=>setSection(name)} className={section===name?"nav-item active":"nav-item"}><span className="nav-icon">{icon}</span><span><b>{name}</b><small>{desc}</small></span></button>)}</nav>
      {profile.role==="admin"&&<div className="admin-note">Administrator access<br/><small>Users aur class ke controls</small></div>}
      <button className="logout" onClick={logout}>↪ &nbsp; Logout karein</button>
    </aside>
    <section className="main-panel">
      <header className="topbar"><div><p className="eyebrow">BS IT / WORKSPACE</p><h1>{section}</h1></div><div className="user-chip"><div className="avatar">{(profile.full_name||profile.email).slice(0,1).toUpperCase()}</div><div><b>{profile.full_name||profile.email}</b><small>{roleLabel}</small></div></div></header>
      <div className="welcome"><div><p className="eyebrow">Aapki Taleemi Duniya</p><h2>Assalam-o-Alaikum, {profile.full_name.split(" ")[0]||"Khush Aamdeed"}!</h2><p>BS IT class ke workspace mein khush aamdeed.</p></div><div className="welcome-mark">BS<span>IT</span></div></div>
      <div className="section-heading"><div><h3>{section==="Jaiza"?"Aapka Workspace":section}</h3><p>Class ke tools aur maloomat tak asaan rasai.</p></div></div>
      <div className="feature-grid">{sections.slice(1).map(([name,desc,icon])=><button key={name} className="feature-card" onClick={()=>setSection(name)}><span className="feature-icon">{icon}</span><b>{name}</b><p>{desc}</p><span className="card-arrow">Kholein →</span></button>)}</div>
      <p className="bottom-note">Peer – Jumma · Sirf aik class · Mehfooz role-based access</p>
    </section>
  </main>;
}
