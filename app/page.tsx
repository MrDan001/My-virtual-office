"use client";

import { useEffect, useMemo, useState } from "react";
import Office3D from "../components/Office3D";

type Page = "dashboard" | "office" | "tasks" | "schedule" | "reports" | "settings";

type Task = {
  id: number;
  title: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed";
  dueLabel: string;
};

function Icon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    grid: "▦", office: "⌂", tasks: "✓", calendar: "◫", reports: "▤", settings: "⚙",
    search: "⌕", bell: "♧", moon: "◐", sun: "☼", plus: "+", arrow: "→", spark: "✦",
  };
  return <span aria-hidden="true">{icons[name] ?? "•"}</span>;
}

function StatCard({ label, value, note, icon, tone }: { label: string; value: string; note: string; icon: string; tone: string }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-top"><span className="stat-icon"><Icon name={icon} /></span><span className="stat-note">{note}</span></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function OfficeScene() {
  return <Office3D />;
}

function Sidebar({ page, setPage, theme, setTheme }: { page: Page; setPage: (p: Page) => void; theme: "light" | "dark"; setTheme: (t: "light" | "dark") => void }) {
  const items: [Page, string, string][] = [
    ["dashboard", "Dashboard", "grid"],
    ["office", "Office View", "office"],
    ["tasks", "Tasks", "tasks"],
    ["schedule", "Schedule", "calendar"],
    ["reports", "Reports", "reports"],
    ["settings", "Settings", "settings"],
  ];

  return (
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">⌂</div><div><strong>OfficeHub</strong><span>Your business in motion.</span></div></div>
      <nav>{items.map(([key, label, icon]) => <button key={key} onClick={() => setPage(key)} className={page === key ? "active" : ""}><Icon name={icon} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom">
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="theme-button"><Icon name={theme === "light" ? "moon" : "sun"} /><span>{theme === "light" ? "Dark mode" : "Light mode"}</span></button>
        <div className="user-card"><div className="user-avatar">AD</div><div><strong>Admin</strong><span>admin@company.com</span></div><span className="online-dot" /></div>
      </div>
    </aside>
  );
}

function Topbar({ page }: { page: Page }) {
  const title = page === "dashboard" ? "Good morning, Admin 👋" : page.charAt(0).toUpperCase() + page.slice(1);
  return (
    <header className="topbar">
      <div><h1>{title}</h1><p>{page === "dashboard" ? "Here’s what’s happening in your office today." : `Manage your ${page} from one place.`}</p></div>
      <div className="top-actions">
        <label className="search"><Icon name="search" /><input placeholder="Search anything..." /></label>
        <button className="icon-button"><Icon name="bell" /></button>
        <div className="date-chip">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
        <div className="user-avatar small">AD</div>
      </div>
    </header>
  );
}

function Dashboard({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <div className="content">
      <div className="stats-grid">
        <StatCard label="Office rooms" value="8" note="Shell ready" icon="office" tone="blue" />
        <StatCard label="Active tasks" value="0" note="No tasks yet" icon="tasks" tone="green" />
        <StatCard label="Meetings today" value="0" note="Not configured" icon="calendar" tone="purple" />
        <StatCard label="Office occupancy" value="0%" note="No staff installed" icon="grid" tone="orange" />
      </div>

      <div className="dashboard-grid">
        <section className="panel office-panel">
          <div className="panel-head">
            <div><h2>Office View</h2><p>Open architectural shell — no internal demarcations, staff, desks or furniture.</p></div>
            <div className="scene-controls"><span className="live-tag"><i />Live</span><button onClick={() => setPage("office")} className="view-link">Open full view <Icon name="arrow" /></button></div>
          </div>
          <OfficeScene />
        </section>

        <aside className="side-stack">
          <section className="panel schedule-panel">
            <div className="panel-head compact"><div><h2>Today’s schedule</h2><p>No meetings configured</p></div><button className="text-button" onClick={() => setPage("schedule")}>View all</button></div>
            <div className="timeline-row"><div className="timeline-time">—</div><div className="timeline-line"><span /></div><div><strong>Schedule is ready</strong><small>Add meetings when the new staff layer is built.</small></div></div>
          </section>
          <section className="panel activity-panel">
            <div className="panel-head compact"><div><h2>System status</h2><p>Clean-slate workspace</p></div></div>
            <div className="activity-row"><div className="quick-icon"><Icon name="spark" /></div><div><strong>Office shell active</strong><span>Rooms and circulation are available.</span><small>Now</small></div></div>
            <div className="activity-row"><div className="quick-icon green"><Icon name="tasks" /></div><div><strong>Task system ready</strong><span>Tasks are standalone and unassigned.</span><small>Now</small></div></div>
            <div className="activity-row"><div className="quick-icon purple"><Icon name="settings" /></div><div><strong>Staff layer cleared</strong><span>Ready to rebuild from scratch.</span><small>Now</small></div></div>
          </section>
        </aside>
      </div>

      <div className="quick-row">
        <button onClick={() => setPage("office")}><span className="quick-icon"><Icon name="office" /></span><div><strong>Open the office shell</strong><span>Inspect rooms and circulation spaces.</span></div><Icon name="arrow" /></button>
        <button onClick={() => setPage("tasks")}><span className="quick-icon green"><Icon name="tasks" /></span><div><strong>Review tasks</strong><span>Create standalone work items.</span></div><Icon name="arrow" /></button>
        <button onClick={() => setPage("settings")}><span className="quick-icon purple"><Icon name="settings" /></span><div><strong>Workspace settings</strong><span>Configure the next layer safely.</span></div><Icon name="arrow" /></button>
      </div>
    </div>
  );
}

function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");

  useEffect(() => {
    void fetch("/api/tasks").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.tasks)) {
        setTasks(data.tasks.map((task: Record<string, unknown>) => ({
          id: Number(task.id),
          title: String(task.title),
          priority: String(task.priority) as Task["priority"],
          status: String(task.status) as Task["status"],
          dueLabel: String(task.due_label ?? "Today"),
        })));
      }
    }).catch(() => {});
  }, []);

  const createTask = async () => {
    const clean = title.trim();
    if (!clean) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: clean, priority }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((current) => [{ id: Number(data.id ?? Date.now()), title: clean, priority, status: "Pending", dueLabel: "Today" }, ...current]);
        setTitle("");
        setCreating(false);
        return;
      }
    } catch {}
    setTasks((current) => [{ id: Date.now(), title: clean, priority, status: "Pending", dueLabel: "Today" }, ...current]);
    setTitle("");
    setCreating(false);
  };

  const toggleTask = async (id: number) => {
    const currentTask = tasks.find((task) => task.id === id);
    if (!currentTask) return;
    const status: Task["status"] = currentTask.status === "Completed" ? "Pending" : "Completed";
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
    try {
      const res = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      if (!res.ok && id > 0) throw new Error("Could not save task status");
    } catch {
      setTasks((current) => current.map((task) => task.id === id ? { ...task, status: currentTask.status } : task));
    }
  };

  return (
    <div className="content">
      <section className="panel">
        <div className="section-toolbar"><div><h2>Tasks</h2><p>Standalone work items — no employee assignment or staff dependency.</p></div><button className="primary" onClick={() => setCreating(true)}><Icon name="plus" /> New task</button></div>
        <div className="task-grid">{tasks.map((item) => <div className={`task-card ${item.status === "Completed" ? "task-done" : ""}`} key={item.id}>
          <button className="task-title" onClick={() => toggleTask(item.id)}><span className={`checkbox ${item.status === "Completed" ? "checked" : ""}`}>{item.status === "Completed" ? "✓" : ""}</span><strong>{item.title}</strong><span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span></button>
          <div className="task-footer"><span>{item.status === "Completed" ? "Completed" : `Due ${item.dueLabel.toLowerCase()}`}</span><span>{item.status === "Completed" ? "✓" : "•"}</span></div>
        </div>)}</div>
        {tasks.length === 0 && <div style={{ padding: "18px", color: "var(--muted)", fontSize: 12 }}>No tasks yet.</div>}
      </section>

      {creating && <div className="modal-backdrop" onMouseDown={() => setCreating(false)}>
        <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal-head"><div><h2>New task</h2><p>Create a standalone piece of work.</p></div><button className="close-button" onClick={() => setCreating(false)}>×</button></div>
          <label>Task title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Review customer requests" /></label>
          <label>Priority<select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])}>{["High", "Medium", "Low"].map((x) => <option key={x}>{x}</option>)}</select></label>
          <div className="modal-actions"><button onClick={() => setCreating(false)} className="secondary">Cancel</button><button onClick={createTask} disabled={!title.trim()} className="primary">Create task</button></div>
        </div>
      </div>}
    </div>
  );
}

function OfficePage() {
  return <div className="content"><section className="panel office-page">
    <div className="section-toolbar"><div><h2>Live office shell</h2><p>One open space. Internal room demarcations, furniture and staff will be rebuilt separately.</p></div></div>
    <OfficeScene />
  </section></div>;
}

function SimplePage({ page }: { page: Exclude<Page, "dashboard" | "office" | "tasks"> }) {
  const copy: Record<typeof page, { title: string; desc: string; cards: [string, string][] }> = {
    schedule: { title: "Schedule", desc: "Meeting and work scheduling is ready for the next business layer.", cards: [["Meetings", "0 configured"], ["Work blocks", "0 configured"], ["Coverage", "Not configured"]] },
    reports: { title: "Reports", desc: "Reporting will connect to real business data after the clean foundation is complete.", cards: [["Productivity", "Waiting for data"], ["Attendance", "Waiting for staff layer"], ["Meetings", "0 recorded"]] },
    settings: { title: "Settings", desc: "Workspace configuration for the clean-slate office.", cards: [["Office", "Architectural shell active"], ["Tasks", "Standalone"], ["Staff", "Not installed"]] },
  };
  const data = copy[page];
  return <div className="content"><section className="panel simple-page"><h2>{data.title}</h2><p>{data.desc}</p><div className="simple-cards">{data.cards.map(([a, b]) => <div key={a} className="simple-card"><span>{a}</span><strong>{b}</strong></div>)}</div><div className="placeholder-banner"><span><Icon name="spark" /></span><div><strong>Clean foundation in place.</strong><span>This area is ready for the next real business feature.</span></div></div></section></div>;
}

export default function Home() {
  const [page, setPage] = useState<Page>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [clock, setClock] = useState("09:42 AM");

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, []);

  const content = useMemo(() => {
    if (page === "dashboard") return <Dashboard setPage={setPage} />;
    if (page === "office") return <OfficePage />;
    if (page === "tasks") return <TasksPage />;
    return <SimplePage page={page} />;
  }, [page]);

  return <div className={`app-shell theme-${theme}`}>
    <Sidebar page={page} setPage={setPage} theme={theme} setTheme={setTheme} />
    <main className="main">
      <Topbar page={page} />
      <div className="clock-strip"><span><i className="live-dot" /> Live office</span><strong>{clock}</strong><span>Clean-slate prototype mode</span></div>
      {content}
    </main>
  </div>;
}
