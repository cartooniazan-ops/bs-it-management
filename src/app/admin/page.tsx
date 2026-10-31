"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = { id:string; full_name:string; email:string; role:"admin"|"teacher"|"student"|"cr"|"gr"; is_active:boolean };
type Subject = { id:string; name:string; code:string|null; teacher_id:string|null };
type TimetableRow = { id:string; weekday:number; start_time:string; end_time:string; subject_id:string|null; teacher_id:string|null; room:string|null };
type Notice = { id:string; title:string; body:string; audience:string; created_at:string };
type AttendanceRow = { id:string; student_id:string; subject_id:string|null; attendance_date:string; status:string };
const days=["","Monday","Tuesday","Wednesday","Thursday","Friday"];
const emptyTimetable={weekday:"1",start_time:"09:00",end_time:"10:00",subject_id:"",teacher_id:"",room:""};
export default function AdminPage(){
 const router=useRouter();
 const [admin,setAdmin]=useState<Profile|null>(null);
 const [tab,setTab]=useState("Overview");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [profiles,setProfiles]=useState<Profile[]>([]);
 const [subjects,setSubjects]=useState<Subject[]>([]);
 const [timetable,setTimetable]=useState<TimetableRow[]>([]);
 const [notices,setNotices]=useState<Notice[]>([]);
 const [attendance,setAttendance]=useState<AttendanceRow[]>([]);
 const [subjectName,setSubjectName]=useState("");
 const [subjectCode,setSubjectCode]=useState("");
 const [subjectTeacher,setSubjectTeacher]=useState("");
 const [editingSubject,setEditingSubject]=useState<string|null>(null);
 const [tt,setTt]=useState(emptyTimetable);
 const [editingTt,setEditingTt]=useState<string|null>(null);
 const [noticeTitle,setNoticeTitle]=useState("");
 const [noticeBody,setNoticeBody]=useState("");
 const [audience,setAudience]=useState("all");
 const [attendanceDate,setAttendanceDate]=useState(new Date().toISOString().slice(0,10));
 const [attendanceSubject,setAttendanceSubject]=useState("");
 const [attendanceMarks,setAttendanceMarks]=useState<Record<string,string>>({});
 const [search,setSearch]=useState("");
 const [newName,setNewName]=useState("");
 const [newEmail,setNewEmail]=useState("");
 const [newPassword,setNewPassword]=useState("");
 const [newRole,setNewRole]=useState<"student"|"teacher"|"cr"|"gr">("student");
 const [passwordUser,setPasswordUser]=useState<Profile|null>(null);
 const [replacementPassword,setReplacementPassword]=useState("");
 const supabase=createClient();
 const load=useCallback(async()=>{
   setBusy(true);setMessage("");
   const [p,s,t,n,a]=await Promise.all([
    supabase.from("profiles").select("id,full_name,email,role,is_active").order("full_name"),
    supabase.from("subjects").select("id,name,code,teacher_id").order("name"),
    supabase.from("timetable").select("id,weekday,start_time,end_time,subject_id,teacher_id,room").order("weekday").order("start_time"),
    supabase.from("notices").select("id,title,body,audience,created_at").order("created_at",{ascending:false}).limit(50),
    supabase.from("attendance").select("id,student_id,subject_id,attendance_date,status").order("attendance_date",{ascending:false}).limit(200)
   ]);
   const err=[p.error,s.error,t.error,n.error,a.error].find(Boolean);
   if(err)setMessage(err.message);
   setProfiles((p.data||[]) as Profile[]);setSubjects((s.data||[]) as Subject[]);setTimetable((t.data||[]) as TimetableRow[]);setNotices((n.data||[]) as Notice[]);setAttendance((a.data||[]) as AttendanceRow[]);
   setBusy(false);
 },[]);
 useEffect(()=>{
   (async()=>{
    const {data:{user},error}=await supabase.auth.getUser();
    if(error||!user){router.replace("/login");return;}
    const {data}=await supabase.from("profiles").select("id,full_name,email,role,is_active").eq("id",user.id).single();
    if(!data||data.role!=="admin"||!data.is_active){router.replace("/dashboard");return;}
    setAdmin(data as Profile);
    await load();setLoading(false);
   })();
 },[router,load]);
 const teachers=useMemo(()=>profiles.filter(p=>p.role==="teacher"||p.role==="cr"),[profiles]);
 const students=useMemo(()=>profiles.filter(p=>p.role==="student"),[profiles]);
 const filteredProfiles=useMemo(()=>profiles.filter(p=>(p.full_name+" "+p.email+" "+p.role).toLowerCase().includes(search.toLowerCase())),[profiles,search]);
 async function logout(){await supabase.auth.signOut();router.replace("/login");router.refresh();}
 async function adminUserAction(payload:Record<string,string>){\n  const response=await fetch("/api/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});\n  const result=await response.json();if(!response.ok)throw new Error(result.error||"Request failed.");return result;\n }\n async function createManagedUser(e:React.FormEvent){\n  e.preventDefault();setBusy(true);setMessage("");try{await adminUserAction({action:"create",full_name:newName,email:newEmail,password:newPassword,role:newRole});setMessage("User account created successfully.");setNewName("");setNewEmail("");setNewPassword("");setNewRole("student");await load();}catch(err){setMessage(err instanceof Error?err.message:"Could not create user.");}finally{setBusy(false);}\n }\n async function changeManagedPassword(e:React.FormEvent){\n  e.preventDefault();if(!passwordUser)return;setBusy(true);setMessage("");try{await adminUserAction({action:"password",user_id:passwordUser.id,password:replacementPassword});setMessage("Password changed successfully.");setPasswordUser(null);setReplacementPassword("");}catch(err){setMessage(err instanceof Error?err.message:"Could not change password.");}finally{setBusy(false);}\n }\n async function deleteManagedUser(p:Profile){\n  if(!confirm("Permanently delete "+p.full_name+" and their login account? This cannot be undone."))return;setBusy(true);setMessage("");try{await adminUserAction({action:"delete",user_id:p.id});setMessage("User account deleted.");await load();}catch(err){setMessage(err instanceof Error?err.message:"Could not delete account.");}finally{setBusy(false);}\n }\n async function saveProfile(p:Profile,patch:Partial<Profile>){
  setMessage("");const {error}=await supabase.from("profiles").update(patch).eq("id",p.id);
  if(error){setMessage(error.message);return;}
  setProfiles(old=>old.map(x=>x.id===p.id?{...x,...patch}:x));setMessage("User updated successfully.");
 }
 async function saveSubject(e:React.FormEvent){
  e.preventDefault();if(!subjectName.trim())return;setBusy(true);setMessage("");
  const payload={name:subjectName.trim(),code:subjectCode.trim()||null,teacher_id:subjectTeacher||null};
  const result=editingSubject?await supabase.from("subjects").update(payload).eq("id",editingSubject):await supabase.from("subjects").insert(payload);
  if(result.error)setMessage(result.error.message);else{setMessage("Subject saved successfully.");setSubjectName("");setSubjectCode("");setSubjectTeacher("");setEditingSubject(null);await load();}
  setBusy(false);
 }
 async function deleteSubject(id:string){if(!confirm("Delete this subject? Related timetable and attendance subject links will be cleared."))return;const {error}=await supabase.from("subjects").delete().eq("id",id);setMessage(error?error.message:"Subject deleted.");if(!error)await load();}
 async function saveTimetable(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  const payload={weekday:Number(tt.weekday),start_time:tt.start_time,end_time:tt.end_time,subject_id:tt.subject_id||null,teacher_id:tt.teacher_id||null,room:tt.room.trim()||null};
  const result=editingTt?await supabase.from("timetable").update(payload).eq("id",editingTt):await supabase.from("timetable").insert(payload);
  if(result.error)setMessage(result.error.message);else{setMessage("Timetable entry saved.");setTt(emptyTimetable);setEditingTt(null);await load();}
  setBusy(false);
 }
 async function deleteTimetable(id:string){if(!confirm("Delete this timetable entry?"))return;const {error}=await supabase.from("timetable").delete().eq("id",id);setMessage(error?error.message:"Timetable entry deleted.");if(!error)await load();}
 async function publishNotice(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  const {error}=await supabase.from("notices").insert({title:noticeTitle.trim(),body:noticeBody.trim(),audience,created_by:admin?.id});
  if(error)setMessage(error.message);else{setMessage("Announcement published.");setNoticeTitle("");setNoticeBody("");await load();}
  setBusy(false);
 }
 async function deleteNotice(id:string){if(!confirm("Delete this announcement?"))return;const {error}=await supabase.from("notices").delete().eq("id",id);setMessage(error?error.message:"Announcement deleted.");if(!error)await load();}
 async function saveAttendance(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  const rows=students.map(s=>({student_id:s.id,subject_id:attendanceSubject||null,attendance_date:attendanceDate,status:attendanceMarks[s.id]||"present",marked_by:admin?.id}));
  if(!rows.length){setMessage("No student accounts found.");setBusy(false);return;}
  const {error}=await supabase.from("attendance").upsert(rows,{onConflict:"student_id,subject_id,attendance_date"});
  setMessage(error?error.message:"Attendance saved successfully.");if(!error)await load();setBusy(false);
 }
 if(loading)return <main className="loading-screen"><div className="crest">BS <span>IT</span></div><p>Loading administrator panel...</p></main>;
 if(!admin)return null;
 const nav=["Overview","Users","Subjects","Timetable","Attendance","Announcements"];
 return <main className="admin-shell">
  <aside className="admin-sidebar">
   <div className="admin-brand"><div className="crest">BS <span>IT</span></div><div><b>BS IT</b><small>Administration</small></div></div>
   <div className="admin-nav-label">MANAGEMENT</div>
   <nav>{nav.map((n,i)=><button key={n} className={tab===n?"admin-nav active":"admin-nav"} onClick={()=>{setTab(n);setMessage("");}}><span>{["⌂","♙","◇","▦","✓","◉"][i]}</span>{n}</button>)}</nav>
   <div className="admin-sidebar-bottom"><div className="admin-user"><b>{admin.full_name}</b><small>Administrator</small></div><button onClick={()=>router.push("/dashboard")} className="admin-back">← Main Dashboard</button><button onClick={logout} className="admin-logout">Sign Out</button></div>
  </aside>
  <section className="admin-main">
   <header className="admin-topbar"><div><p>BS IT / ADMINISTRATION</p><h1>{tab}</h1></div><div className="admin-top-actions"><span className="admin-status">● System Online</span><button onClick={load} disabled={busy}>↻ Refresh</button></div></header>
   {message&&<div className={message.toLowerCase().includes("success")||message.toLowerCase().includes("saved")||message.toLowerCase().includes("published")||message.toLowerCase().includes("deleted")?"admin-alert success":"admin-alert"}>{message}</div>}
   {tab==="Overview"&&<div className="admin-content">
    <div className="admin-welcome"><div><span>ADMIN CONTROL CENTER</span><h2>Welcome back, {admin.full_name.split(" ")[0]}.</h2><p>Manage your class, accounts and academic activities from one place.</p></div><div className="admin-welcome-mark">BS<span>IT</span></div></div>
    <div className="admin-stat-grid">
     {[["Total Users",profiles.length,"♙"],["Teachers",teachers.length,"▣"],["Students",students.length,"♧"],["Subjects",subjects.length,"◇"],["Timetable Entries",timetable.length,"▦"],["Announcements",notices.length,"◉"]].map(([label,value,icon])=><div className="admin-stat" key={String(label)}><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>)}
    </div>
    <div className="admin-two-col"><div className="admin-panel-card"><div className="admin-card-heading"><div><h3>Quick Actions</h3><p>Common administration tasks</p></div></div><div className="admin-quick-grid">{[["Users","Manage accounts"],["Subjects","Add or assign subjects"],["Timetable","Build weekly schedule"],["Announcements","Publish class updates"],["Attendance","Record student attendance"]].map(([n,d])=><button key={n} onClick={()=>setTab(n)}><b>{n}</b><small>{d} →</small></button>)}</div></div><div className="admin-panel-card"><div className="admin-card-heading"><div><h3>Recent Announcements</h3><p>Latest class updates</p></div></div>{notices.slice(0,5).map(n=><div className="admin-recent" key={n.id}><b>{n.title}</b><small>{new Date(n.created_at).toLocaleDateString()} · {n.audience}</small></div>)}{!notices.length&&<p className="admin-empty">No announcements yet.</p>}</div></div>
   </div>}
   {tab==="Users"&&<div className="admin-content"><div className="admin-section-intro"><div><h2>User Management</h2><p>Create accounts, assign class roles, reset passwords and remove users.</p></div><input className="admin-search" placeholder="Search name, email or role..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <form className="admin-form-card" onSubmit={createManagedUser}><h3>Create New User Account</h3><div className="admin-form-grid"><label>Full Name<input required minLength={2} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Enter full name"/></label><label>Email Address<input required type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="name@example.com"/></label><label>Temporary Password<input required type="password" minLength={8} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="At least 8 characters"/></label><label>Assign Role<select value={newRole} onChange={e=>setNewRole(e.target.value as typeof newRole)}><option value="student">Student</option><option value="teacher">Teacher</option><option value="cr">CR (Class Representative)</option><option value="gr">GR (Group Representative)</option></select></label></div><div className="admin-form-actions"><button className="admin-primary" disabled={busy}>{busy?"Creating...":"Create User Account"}</button></div><p className="admin-form-hint">Share the temporary password with the account owner securely. Never reuse passwords.</p></form>
    {passwordUser&&<form className="admin-form-card" onSubmit={changeManagedPassword}><h3>Change Password — {passwordUser.full_name}</h3><div className="admin-form-grid"><label>New Password<input required type="password" minLength={8} value={replacementPassword} onChange={e=>setReplacementPassword(e.target.value)} placeholder="At least 8 characters"/></label></div><div className="admin-form-actions"><button className="admin-primary" disabled={busy}>{busy?"Updating...":"Update Password"}</button><button type="button" className="admin-secondary" onClick={()=>{setPasswordUser(null);setReplacementPassword("");}}>Cancel</button></div></form>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Account Actions</th></tr></thead><tbody>{filteredProfiles.map(p=><tr key={p.id}><td><b>{p.full_name}</b></td><td>{p.email}</td><td><select value={p.role} disabled={p.id===admin.id||p.role==="admin"} onChange={e=>saveProfile(p,{role:e.target.value as Profile["role"]})}><option value="admin">Admin</option><option value="teacher">Teacher</option><option value="student">Student</option><option value="cr">CR</option><option value="gr">GR</option></select></td><td><button className={p.is_active?"admin-toggle on":"admin-toggle"} disabled={p.id===admin.id} onClick={()=>saveProfile(p,{is_active:!p.is_active})}>{p.is_active?"Active":"Inactive"}</button></td><td><button className="admin-text-btn" disabled={p.id===admin.id||p.role==="admin"} onClick={()=>{setPasswordUser(p);setReplacementPassword("");}}>Change Password</button><button className="admin-danger-btn" disabled={p.id===admin.id||p.role==="admin"} onClick={()=>deleteManagedUser(p)}>Delete</button></td></tr>)}</tbody></table>{!filteredProfiles.length&&<p className="admin-empty">No users found.</p>}</div>
   </div>}
   {tab==="Subjects"&&<div className="admin-content"><div className="admin-section-intro"><div><h2>Subject Management</h2><p>Create subjects and assign teachers to each subject.</p></div></div>
    <form className="admin-form-card" onSubmit={saveSubject}><h3>{editingSubject?"Edit Subject":"Add New Subject"}</h3><div className="admin-form-grid"><label>Subject Name<input required value={subjectName} onChange={e=>setSubjectName(e.target.value)} placeholder="e.g. Programming Fundamentals"/></label><label>Subject Code<input value={subjectCode} onChange={e=>setSubjectCode(e.target.value)} placeholder="e.g. IT-101"/></label><label>Assigned Teacher<select value={subjectTeacher} onChange={e=>setSubjectTeacher(e.target.value)}><option value="">Not assigned</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label></div><div className="admin-form-actions"><button className="admin-primary" disabled={busy}>{busy?"Saving...":"Save Subject"}</button>{editingSubject&&<button type="button" className="admin-secondary" onClick={()=>{setEditingSubject(null);setSubjectName("");setSubjectCode("");setSubjectTeacher("");}}>Cancel</button>}</div></form>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Subject</th><th>Code</th><th>Assigned Teacher</th><th>Actions</th></tr></thead><tbody>{subjects.map(s=><tr key={s.id}><td><b>{s.name}</b></td><td>{s.code||"—"}</td><td>{profiles.find(p=>p.id===s.teacher_id)?.full_name||"Not assigned"}</td><td><button className="admin-text-btn" onClick={()=>{setEditingSubject(s.id);setSubjectName(s.name);setSubjectCode(s.code||"");setSubjectTeacher(s.teacher_id||"");}}>Edit</button><button className="admin-danger-btn" onClick={()=>deleteSubject(s.id)}>Delete</button></td></tr>)}</tbody></table>{!subjects.length&&<p className="admin-empty">No subjects have been added.</p>}</div>
   </div>}
   {tab==="Timetable"&&<div className="admin-content"><div className="admin-section-intro"><div><h2>Weekly Timetable</h2><p>Schedule classes from Monday to Friday. Saturday and Sunday are excluded.</p></div></div>
    <form className="admin-form-card" onSubmit={saveTimetable}><h3>{editingTt?"Edit Timetable Entry":"Add Class Schedule"}</h3><div className="admin-form-grid"><label>Day<select value={tt.weekday} onChange={e=>setTt({...tt,weekday:e.target.value})}>{days.slice(1).map((d,i)=><option key={d} value={i+1}>{d}</option>)}</select></label><label>Subject<select value={tt.subject_id} onChange={e=>setTt({...tt,subject_id:e.target.value})}><option value="">Select subject</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Teacher<select value={tt.teacher_id} onChange={e=>setTt({...tt,teacher_id:e.target.value})}><option value="">Select teacher</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label><label>Start Time<input type="time" required value={tt.start_time} onChange={e=>setTt({...tt,start_time:e.target.value})}/></label><label>End Time<input type="time" required value={tt.end_time} onChange={e=>setTt({...tt,end_time:e.target.value})}/></label><label>Room / Location<input value={tt.room} onChange={e=>setTt({...tt,room:e.target.value})} placeholder="Optional"/></label></div><div className="admin-form-actions"><button className="admin-primary" disabled={busy}>{busy?"Saving...":"Save Schedule"}</button>{editingTt&&<button type="button" className="admin-secondary" onClick={()=>{setEditingTt(null);setTt(emptyTimetable);}}>Cancel</button>}</div></form>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Room</th><th>Actions</th></tr></thead><tbody>{timetable.map(t=><tr key={t.id}><td><b>{days[t.weekday]}</b></td><td>{t.start_time.slice(0,5)} – {t.end_time.slice(0,5)}</td><td>{subjects.find(s=>s.id===t.subject_id)?.name||"—"}</td><td>{profiles.find(p=>p.id===t.teacher_id)?.full_name||"—"}</td><td>{t.room||"—"}</td><td><button className="admin-text-btn" onClick={()=>{setEditingTt(t.id);setTt({weekday:String(t.weekday),start_time:t.start_time.slice(0,5),end_time:t.end_time.slice(0,5),subject_id:t.subject_id||"",teacher_id:t.teacher_id||"",room:t.room||""});}}>Edit</button><button className="admin-danger-btn" onClick={()=>deleteTimetable(t.id)}>Delete</button></td></tr>)}</tbody></table>{!timetable.length&&<p className="admin-empty">No timetable entries yet.</p>}</div>
   </div>}
   {tab==="Attendance"&&<div className="admin-content"><div className="admin-section-intro"><div><h2>Attendance Management</h2><p>Mark attendance for students and review recent records.</p></div></div>
    <form className="admin-form-card" onSubmit={saveAttendance}><div className="admin-form-grid"><label>Attendance Date<input type="date" required value={attendanceDate} onChange={e=>setAttendanceDate(e.target.value)}/></label><label>Subject<select value={attendanceSubject} onChange={e=>setAttendanceSubject(e.target.value)}><option value="">General / Full Day</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Student</th><th>Attendance Status</th></tr></thead><tbody>{students.map(s=><tr key={s.id}><td><b>{s.full_name}</b><small className="admin-cell-sub">{s.email}</small></td><td><select value={attendanceMarks[s.id]||"present"} onChange={e=>setAttendanceMarks(old=>({...old,[s.id]:e.target.value}))}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="leave">Leave</option></select></td></tr>)}</tbody></table>{!students.length&&<p className="admin-empty">No student accounts found.</p>}</div><div className="admin-form-actions"><button className="admin-primary" disabled={busy||!students.length}>{busy?"Saving...":"Save Attendance"}</button></div></form>
    <div className="admin-panel-card"><h3>Recent Attendance Records</h3><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Date</th><th>Student</th><th>Subject</th><th>Status</th></tr></thead><tbody>{attendance.slice(0,50).map(a=><tr key={a.id}><td>{a.attendance_date}</td><td>{profiles.find(p=>p.id===a.student_id)?.full_name||"Student"}</td><td>{subjects.find(s=>s.id===a.subject_id)?.name||"General"}</td><td><span className={"attendance-pill "+a.status}>{a.status}</span></td></tr>)}</tbody></table></div></div>
   </div>}
   {tab==="Announcements"&&<div className="admin-content"><div className="admin-section-intro"><div><h2>Announcements</h2><p>Publish important information to students, teachers or everyone.</p></div></div>
    <form className="admin-form-card" onSubmit={publishNotice}><h3>Publish New Announcement</h3><div className="admin-form-grid"><label>Announcement Title<input required value={noticeTitle} onChange={e=>setNoticeTitle(e.target.value)} placeholder="Enter announcement title"/></label><label>Audience<select value={audience} onChange={e=>setAudience(e.target.value)}><option value="all">Everyone</option><option value="students">Students</option><option value="teachers">Teachers</option></select></label><label className="admin-full">Message<textarea required rows={4} value={noticeBody} onChange={e=>setNoticeBody(e.target.value)} placeholder="Write your announcement..."/></label></div><div className="admin-form-actions"><button className="admin-primary" disabled={busy}>{busy?"Publishing...":"Publish Announcement"}</button></div></form>
    <div className="admin-panel-card"><h3>Published Announcements</h3>{notices.map(n=><article className="admin-notice-row" key={n.id}><div><b>{n.title}</b><p>{n.body}</p><small>{new Date(n.created_at).toLocaleString()} · {n.audience}</small></div><button className="admin-danger-btn" onClick={()=>deleteNotice(n.id)}>Delete</button></article>)}{!notices.length&&<p className="admin-empty">No announcements published.</p>}</div>
   </div>}
  </section>
 </main>;
}
