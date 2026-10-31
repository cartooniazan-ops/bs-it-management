"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; full_name: string; email: string; role: string; is_active: boolean };
type Subject = { id: string; name: string; code: string | null };
type Student = { id: string; full_name: string; email: string };
type Timetable = { id: string; weekday: number; start_time: string; end_time: string; room: string | null; subject_id: string | null };
type Assignment = { id: string; title: string; description: string | null; due_at: string; subject_id: string | null; created_at: string };
type Notice = { id: string; title: string; body: string; created_at: string };
type Attendance = { student_id: string; status: string; attendance_date: string; subject_id: string | null };
const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function TeacherPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [tab, setTab] = useState("Overview");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [timetable, setTimetable] = useState<Timetable[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [subjectId, setSubjectId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [historySubject, setHistorySubject] = useState("");
  const [historyRows, setHistoryRows] = useState<Array<Attendance & { student_name: string; subject_name: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (teacherId: string) => {
    setBusy(true);
    const [s, p, t, a, n] = await Promise.all([
      supabase.from("subjects").select("id,name,code").eq("teacher_id", teacherId).order("name"),
      supabase.from("profiles").select("id,full_name,email").eq("role", "student").eq("is_active", true).order("full_name"),
      supabase.from("timetable").select("id,weekday,start_time,end_time,room,subject_id").eq("teacher_id", teacherId).order("weekday").order("start_time"),
      supabase.from("assignments").select("id,title,description,due_at,subject_id,created_at").eq("teacher_id", teacherId).order("due_at"),
      supabase.from("notices").select("id,title,body,created_at").eq("created_by", teacherId).order("created_at", { ascending: false }).limit(20)
    ]);
    const firstError = [s.error, p.error, t.error, a.error, n.error].find(Boolean);
    if (firstError) setMessage(firstError.message);
    setSubjects((s.data || []) as Subject[]);
    setStudents((p.data || []) as Student[]);
    setTimetable((t.data || []) as Timetable[]);
    setAssignments((a.data || []) as Assignment[]);
    setNotices((n.data || []) as Notice[]);
    setBusy(false);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { router.replace("/login"); return; }
      const { data } = await supabase.from("profiles").select("id,full_name,email,role,is_active").eq("id", user.id).single();
      if (!data || !data.is_active || !["teacher", "cr", "gr"].includes(data.role)) { router.replace("/login"); return; }
      if (data.role !== "teacher") { router.replace("/dashboard"); return; }
      setTeacher(data as Profile);
      await load(user.id);
      setLoading(false);
    })();
  }, [router, load, supabase]);

  async function logout() { await supabase.auth.signOut(); router.replace("/login"); router.refresh(); }

  async function loadAttendanceHistory() {
    setHistoryLoading(true); setMessage("");
    try {
      let all: Attendance[] = []; let offset = 0; const pageSize = 1000;
      while (true) {
        let query = supabase.from("attendance").select("student_id,status,attendance_date,subject_id").order("attendance_date", { ascending: false }).range(offset, offset + pageSize - 1);
        if (historyFrom) query = query.gte("attendance_date", historyFrom);
        if (historyTo) query = query.lte("attendance_date", historyTo);
        if (historySubject) query = query.eq("subject_id", historySubject);
        const { data, error } = await query; if (error) throw error;
        const page = (data || []) as Attendance[]; all = all.concat(page);
        if (page.length < pageSize) break; offset += pageSize;
      }
      setHistoryRows(all.map(row => ({ ...row, student_name: students.find(s => s.id === row.student_id)?.full_name || "Unknown Student", subject_name: subjects.find(s => s.id === row.subject_id)?.name || "General" })));
      setMessage(all.length + " attendance records loaded.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load attendance history."); }
    finally { setHistoryLoading(false); }
  }

  function downloadAttendanceCsv() {
    if (!historyRows.length) { setMessage("Load attendance records before downloading."); return; }
    const quote = (value: string) => '"' + String(value).replace(/"/g, '""') + '"';
    const csv = [["Date", "Student", "Subject", "Status"].map(quote).join(","), ...historyRows.map(row => [row.attendance_date, row.student_name, row.subject_name, row.status].map(value => quote(String(value))).join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "attendance-history.csv"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  async function saveAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId) { setMessage("Please select a subject first."); return; }
    setBusy(true); setMessage("");
    const rows = students.map(student => ({
      student_id: student.id, subject_id: subjectId, attendance_date: attendanceDate,
      status: attendance[student.id] || "present", marked_by: teacher?.id
    }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,subject_id,attendance_date" });
    setMessage(error ? error.message : "Attendance saved successfully.");
    setBusy(false);
  }

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId) { setMessage("Please select a subject first."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.from("assignments").insert({
      title: title.trim(), description: description.trim() || null, due_at: dueAt,
      subject_id: subjectId, teacher_id: teacher?.id
    });
    setMessage(error ? error.message : "Assignment published successfully.");
    if (!error) { setTitle(""); setDescription(""); setDueAt(""); if (teacher) await load(teacher.id); }
    setBusy(false);
  }

  async function publishNotice(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const { error } = await supabase.from("notices").insert({
      title: noticeTitle.trim(), body: noticeBody.trim(), audience: "all", created_by: teacher?.id
    });
    setMessage(error ? error.message : "Notice published successfully.");
    if (!error) { setNoticeTitle(""); setNoticeBody(""); if (teacher) await load(teacher.id); }
    setBusy(false);
  }

  if (loading) return <main className="loading-screen"><div className="crest">BS <span>IT</span></div><p>Loading teacher panel...</p></main>;
  if (!teacher) return null;
  const nav = ["Overview", "My Subjects", "Attendance", "Assignments", "Timetable", "Announcements"];

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><div className="crest">BS <span>IT</span></div><div><b>BS IT</b><small>Teacher Workspace</small></div></div>
      <div className="admin-nav-label">TEACHING</div>
      <nav>{nav.map((item, i) => <button key={item} className={tab === item ? "admin-nav active" : "admin-nav"} onClick={() => setTab(item)}><span>{["⌂", "◇", "✓", "▤", "▦", "◉"][i]}</span>{item}</button>)}</nav>
      <div className="admin-sidebar-bottom"><div className="admin-user"><b>{teacher.full_name}</b><small>Teacher</small></div><button onClick={logout} className="admin-logout">Sign Out</button></div>
    </aside>
    <section className="admin-main">
      <header className="admin-topbar"><div><p>BS IT / TEACHER WORKSPACE</p><h1>{tab}</h1></div><div className="admin-top-actions"><span className="admin-status">● Teacher Account</span><button onClick={() => load(teacher.id)} disabled={busy}>↻ Refresh</button></div></header>
      {message && <div className={/successfully|published/i.test(message) ? "admin-alert success" : "admin-alert"}>{message}</div>}
      {tab === "Overview" && <div className="admin-content">
        <div className="admin-welcome"><div><span>TEACHER WORKSPACE</span><h2>Welcome, {teacher.full_name.split(" ")[0]}.</h2><p>Manage your assigned subjects and class activities.</p></div><div className="admin-welcome-mark">BS<span>IT</span></div></div>
        <div className="admin-stat-grid">{[["My Subjects", subjects.length, "◇"], ["Students", students.length, "♙"], ["Assignments", assignments.length, "▤"], ["Classes This Week", timetable.length, "▦"]].map(([label, value, icon]) => <div className="admin-stat" key={String(label)}><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>)}</div>
        <div className="admin-panel-card"><div className="admin-card-heading"><div><h3>Upcoming Assignments</h3><p>Your recently created assignments</p></div></div>{assignments.slice(0, 5).map(a => <div className="admin-recent" key={a.id}><b>{a.title}</b><small>Subject: {subjects.find(s => s.id === a.subject_id)?.name || "Subject"}</small><small>Sent on: {a.created_at ? new Date(a.created_at).toLocaleString() : "Not available"}</small><small>Deadline: {a.due_at ? new Date(a.due_at).toLocaleString() : "Not set"}</small></div>)}{!assignments.length && <p className="admin-empty">No assignments yet.</p>}</div>
      </div>}
      {tab === "My Subjects" && <div className="admin-content"><div className="admin-section-intro"><div><h2>My Subjects</h2><p>Subjects assigned to your teacher account.</p></div></div><div className="admin-stat-grid">{subjects.map(s => <div className="admin-stat" key={s.id}><span>◇</span><small>{s.code || "Subject"}</small><strong>{s.name}</strong></div>)}</div>{!subjects.length && <p className="admin-empty">No subjects assigned yet. Contact the administrator.</p>}</div>}
      {tab === "Attendance" && <div className="admin-content"><div className="admin-section-intro"><div><h2>Mark Attendance</h2><p>Record attendance for students in your class.</p></div></div><form className="admin-form-card" onSubmit={saveAttendance}><div className="admin-form-grid"><label>Subject<select required value={subjectId} onChange={e => setSubjectId(e.target.value)}><option value="">Select subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Date<input required type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} /></label></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Student</th><th>Email</th><th>Attendance Status</th></tr></thead><tbody>{students.map(s => <tr key={s.id}><td><b>{s.full_name}</b></td><td>{s.email}</td><td><select value={attendance[s.id] || "present"} onChange={e => setAttendance(old => ({ ...old, [s.id]: e.target.value }))}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="leave">Leave</option></select></td></tr>)}</tbody></table></div><div className="admin-form-actions"><button className="admin-primary" disabled={busy || !students.length}>{busy ? "Saving..." : "Save Attendance"}</button></div></form><div className="admin-panel-card"><h3>Attendance History & Export</h3><p>View past attendance by date range or subject, then download it as a CSV file.</p><div className="admin-form-grid"><label>From Date<input type="date" value={historyFrom} onChange={e => setHistoryFrom(e.target.value)} /></label><label>To Date<input type="date" value={historyTo} onChange={e => setHistoryTo(e.target.value)} /></label><label>Subject<select value={historySubject} onChange={e => setHistorySubject(e.target.value)}><option value="">All Subjects</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div><div className="admin-form-actions"><button type="button" className="admin-primary" disabled={historyLoading} onClick={loadAttendanceHistory}>{historyLoading ? "Loading..." : "Show Attendance History"}</button><button type="button" className="admin-secondary" disabled={!historyRows.length} onClick={downloadAttendanceCsv}>Download CSV</button></div><p className="admin-form-hint">{historyRows.length} records loaded. Choose a date range for monthly or custom reports.</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Date</th><th>Student</th><th>Subject</th><th>Status</th></tr></thead><tbody>{historyRows.map((row, index) => <tr key={row.student_id + row.attendance_date + row.subject_id + index}><td>{row.attendance_date}</td><td>{row.student_name}</td><td>{row.subject_name}</td><td><span className={"attendance-pill " + row.status}>{row.status}</span></td></tr>)}</tbody></table>{!historyRows.length && <p className="admin-empty">Choose filters and click Show Attendance History.</p>}</div></div></div>}
      {tab === "Assignments" && <div className="admin-content"><div className="admin-section-intro"><div><h2>Assignments</h2><p>Create assignments for your assigned subjects.</p></div></div><form className="admin-form-card" onSubmit={createAssignment}><div className="admin-form-grid"><label>Subject<select required value={subjectId} onChange={e => setSubjectId(e.target.value)}><option value="">Select subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Assignment Title<input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter assignment title" /></label><label>Due Date and Time<input required type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} /></label><p className="admin-empty" style={{gridColumn:"1 / -1",margin:0}}>Sent date and time will be saved automatically when you publish this assignment.</p></div><label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Assignment instructions" rows={4} /></label><div className="admin-form-actions"><button className="admin-primary" disabled={busy || !subjects.length}>{busy ? "Publishing..." : "Publish Assignment"}</button></div></form><div className="admin-panel-card"><h3>Published Assignments</h3>{assignments.map(a => <div className="admin-recent" key={a.id}><b>{a.title}</b><small>Subject: {subjects.find(s => s.id === a.subject_id)?.name || "Subject"}</small><small>Sent on: {a.created_at ? new Date(a.created_at).toLocaleString() : "Not available"}</small><small>Deadline: {a.due_at ? new Date(a.due_at).toLocaleString() : "Not set"}</small><p>{a.description}</p></div>)}{!assignments.length && <p className="admin-empty">No assignments published.</p>}</div></div>}
      {tab === "Timetable" && <div className="admin-content"><div className="admin-section-intro"><div><h2>My Timetable</h2><p>Your assigned teaching schedule, Monday to Friday.</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Room</th></tr></thead><tbody>{timetable.map(t => <tr key={t.id}><td><b>{days[t.weekday] || "—"}</b></td><td>{t.start_time} – {t.end_time}</td><td>{subjects.find(s => s.id === t.subject_id)?.name || "—"}</td><td>{t.room || "—"}</td></tr>)}</tbody></table>{!timetable.length && <p className="admin-empty">No timetable entries assigned.</p>}</div></div>}
      {tab === "Announcements" && <div className="admin-content"><div className="admin-section-intro"><div><h2>Class Announcements</h2><p>Publish important notices for the class.</p></div></div><form className="admin-form-card" onSubmit={publishNotice}><div className="admin-form-grid"><label>Notice Title<input required value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} placeholder="Enter notice title" /></label></div><label>Message<textarea required rows={4} value={noticeBody} onChange={e => setNoticeBody(e.target.value)} placeholder="Write your announcement" /></label><div className="admin-form-actions"><button className="admin-primary" disabled={busy}>{busy ? "Publishing..." : "Publish Notice"}</button></div></form><div className="admin-panel-card"><h3>My Notices</h3>{notices.map(n => <div className="admin-recent" key={n.id}><b>{n.title}</b><small>{new Date(n.created_at).toLocaleString()}</small><p>{n.body}</p></div>)}{!notices.length && <p className="admin-empty">No notices published.</p>}</div></div>}
    </section>
  </main>;
}
