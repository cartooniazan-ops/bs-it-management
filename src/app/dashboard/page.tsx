"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = { full_name: string; email: string; role: "admin"|"teacher"|"student"|"cr" };
type Assignment = { id:string; title:string; description:string|null; due_at:string; created_at:string; subject_id:string|null; teacher_id:string };
type Subject = { id:string; name:string };
type Teacher = { id:string; full_name:string };
const sections = [
  ["Overview","A summary of your class","⌂"],
  ["Attendance","Daily attendance and records","✓"],
  ["Assignments","Tasks, deadlines and submissions","▤"],
  ["Timetable","Monday to Friday class schedule","▦"],
  ["Subjects","Subject and teacher information","◇"],
  ["Announcements","Important class updates","◉"],
  ["Study Materials","Books and lecture notes","▧"],
];
export default function DashboardPage() {
  const router = useRouter();
  const [profile,setProfile] = useState<Profile|null>(null);
  const [section,setSection] = useState("Overview");
  const [loading,setLoading] = useState(true);
  const [notice,setNotice] = useState("Loading your account...");
  const [assignments,setAssignments] = useState<Assignment[]>([]);
  const [subjects,setSubjects] = useState<Subject[]>([]);
  const [teachers,setTeachers] = useState<Teacher[]>([]);
  const [assignmentLoading,setAssignmentLoading] = useState(false);
  useEffect(()=>{
    const supabase=createClient();
    (async()=>{
      const {data:{user},error}=await supabase.auth.getUser();
      if(error||!user){router.replace("/login");return;}
      const {data}=await supabase.from("profiles").select("full_name,email,role").eq("id",user.id).single();
      if(!data){setNotice("Your profile is not ready yet. Please contact the administrator.");setLoading(false);return;}
      setProfile(data as Profile);
      if(data.role==="student"){
        setAssignmentLoading(true);
        const [a,s,p]=await Promise.all([
          supabase.from("assignments").select("id,title,description,due_at,created_at,subject_id,teacher_id").order("created_at",{ascending:false}),
          supabase.from("subjects").select("id,name"),
          supabase.from("profiles").select("id,full_name").eq("role","teacher")
        ]);
        if(a.error)setNotice(a.error.message);
        setAssignments((a.data||[]) as Assignment[]);setSubjects((s.data||[]) as Subject[]);setTeachers((p.data||[]) as Teacher[]);
        setAssignmentLoading(false);
      }
      setNotice("");setLoading(false);
    })();
  },[router]);
  async function logout(){const supabase=createClient();await supabase.auth.signOut();router.replace("/login");router.refresh();}
  if(loading)return <main className="loading-screen"><div className="crest small">BS <span>IT</span></div><p>{notice}</p></main>;
  if(!profile)return <main className="loading-screen"><p>{notice}</p><button className="secondary" onClick={logout}>Sign Out</button></main>;
  const roleLabel=profile.role==="cr"?"Class Representative":profile.role==="admin"?"Administrator":profile.role==="teacher"?"Teacher":"Student";
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="crest mini">BS <span>IT</span></div><div><b>BS IT</b><small>Class Management System</small></div></div>
      <p className="side-label">WORKSPACE</p>
      <nav>{sections.map(([name,desc,icon])=><button key={name} onClick={()=>setSection(name)} className={section===name?"nav-item active":"nav-item"}><span className="nav-icon">{icon}</span><span><b>{name}</b><small>{desc}</small></span></button>)}</nav>
      {profile.role==="admin"&&<a className="admin-note admin-link" href="/admin">Open Admin Panel →<br/><small>Manage users, subjects and class</small></a>}
      <button className="logout" onClick={logout}>↪ &nbsp; Sign Out</button>
    </aside>
    <section className="main-panel">
      <header className="topbar"><div><p className="eyebrow">BS IT / WORKSPACE</p><h1>{section}</h1></div><div className="user-chip"><div className="avatar">{(profile.full_name||profile.email).slice(0,1).toUpperCase()}</div><div><b>{profile.full_name||profile.email}</b><small>{roleLabel}</small></div></div></header>
      <div className="welcome"><div><p className="eyebrow">YOUR LEARNING SPACE</p><h2>Welcome, {profile.full_name.split(" ")[0]||"there"}!</h2><p>Welcome to your BS IT class workspace.</p></div><div className="welcome-mark">BS<span>IT</span></div></div>
      <div className="section-heading"><div><h3>{section==="Overview"?"Your Workspace":section}</h3><p>Quick access to your class tools and information.</p></div></div>
      {section==="Assignments"&&profile.role==="student"?<div className="admin-content"><div className="admin-panel-card"><h3>Class Assignments</h3><p>Check when each assignment was sent and its submission deadline.</p>{assignmentLoading?<p className="admin-empty">Loading assignments...</p>:assignments.map(a=><article className="admin-notice-row" key={a.id}><div><b>{a.title}</b><p>{a.description||"No additional instructions."}</p><small>Subject: {subjects.find(s=>s.id===a.subject_id)?.name||"Subject"} · Teacher: {teachers.find(t=>t.id===a.teacher_id)?.full_name||"Teacher"}</small><p><b>Sent on:</b> {new Date(a.created_at).toLocaleString()}</p><p><b>Deadline:</b> {new Date(a.due_at).toLocaleString()}</p></div></article>)}{!assignmentLoading&&!assignments.length&&<p className="admin-empty">No assignments have been posted yet.</p>}</div></div>:<div className="feature-grid">{sections.slice(1).map(([name,desc,icon])=><button key={name} className="feature-card" onClick={()=>setSection(name)}><span className="feature-icon">{icon}</span><b>{name}</b><p>{desc}</p><span className="card-arrow">Open →</span></button>)}</div>}
      <p className="bottom-note">Monday – Friday · One class workspace · Secure role-based access</p>
    </section>
  </main>;
}
