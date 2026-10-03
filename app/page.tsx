"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { advanceActor, officeNodes, homeRoomForDepartment, targetRoomForStaff, type OfficeRoom } from "@/lib/office-sim";

type Page = "dashboard" | "office" | "staff" | "tasks" | "schedule" | "reports" | "settings";
type StaffStatus = "Working" | "Meeting" | "Break" | "Away";

type Staff = {
  id: number;
  name: string;
  role: string;
  department: string;
  status: StaffStatus;
  task: string;
  x: number;
  y: number;
  color: string;
  location?: OfficeRoom;
};

type Task = {
  id: number;
  title: string;
  assigneeId?: number;
  assignee: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed";
  dueLabel: string;
};

const seedStaff: Staff[] = [
  { id: 1, name: "Sarah Johnson", role: "Team Lead", department: "Management", status: "Meeting", task: "Weekly standup", x: 69, y: 33, color: "#f59e0b", location: "Meeting Room" },
  { id: 2, name: "Mike Williams", role: "Product Designer", department: "Design", status: "Working", task: "Landing page", x: 33, y: 37, color: "#22c55e", location: "Design Studio" },
  { id: 3, name: "Emma Davis", role: "Marketing", department: "Marketing", status: "Working", task: "Campaign review", x: 52, y: 70, color: "#a855f7", location: "Open Office" },
  { id: 4, name: "James Brown", role: "Accountant", department: "Finance", status: "Away", task: "Payroll", x: 82, y: 70, color: "#ef4444", location: "Finance" },
  { id: 5, name: "Lina Wilson", role: "Support Agent", department: "Support", status: "Working", task: "Customer inbox", x: 20, y: 76, color: "#06b6d4", location: "Support" },
  { id: 6, name: "David Miller", role: "Operations", department: "Operations", status: "Break", task: "Inventory check", x: 60, y: 17, color: "#3b82f6", location: "Break Room" },
];

const waypoints = [
  { x: 19, y: 74, room: "Support" }, { x: 32, y: 37, room: "Design" },
  { x: 53, y: 70, room: "Open Office" }, { x: 79, y: 69, room: "Finance" },
  { x: 68, y: 34, room: "Meeting Room" }, { x: 60, y: 17, room: "Break Room" },
  { x: 43, y: 17, room: "Corridor" }, { x: 83, y: 33, room: "Manager" },
];

const avatar = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2);

function Icon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    grid: "▦", office: "⌂", people: "♙", tasks: "✓", calendar: "◫", reports: "▤", settings: "⚙",
    search: "⌕", bell: "♧", sun: "☼", moon: "◐", plus: "+", arrow: "→", play: "▶", pause: "Ⅱ",
    pin: "⌖", chat: "◌", briefcase: "▣", spark: "✦",
  };
  return <span aria-hidden="true">{icons[name] ?? "•"}</span>;
}

function StatusPill({ status }: { status: StaffStatus }) {
  return <span className={`status-pill status-${status.toLowerCase()}`}><i />{status}</span>;
}

function StatCard({ label, value, note, icon, tone }: { label: string; value: string; note: string; icon: string; tone: string }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-top"><span className="stat-icon"><Icon name={icon} /></span><span className="stat-note">{note}</span></div>
      <div className="stat-value">{value}</div><div className="stat-label">{label}</div>
    </div>
  );
}

function OfficeScene({ staff, running, onSelect, onRoomSelect, selectedRoom }: { staff: Staff[]; running: boolean; onSelect: (s: Staff) => void; onRoomSelect?: (room: OfficeRoom) => void; selectedRoom?: OfficeRoom | null }) {
  const hotspots: { room: OfficeRoom; cls: string }[] = [
    { room: "Manager Office", cls: "manager-hotspot" }, { room: "Meeting Room", cls: "meeting-hotspot" },
    { room: "Design Studio", cls: "design-hotspot" }, { room: "Finance", cls: "finance-hotspot" },
    { room: "Support", cls: "support-hotspot" }, { room: "Break Room", cls: "break-hotspot" },
  ];
  return (
    <div className={`office-scene ${running ? "is-running" : "is-paused"}`}>
      <div className="scene-grid" />
      <div className="wall top-wall" />
      <div className="wall left-wall" />
      <div className="room manager-room"><div className="room-label">Manager Office</div><div className="desk"><span className="monitor" /><span className="chair" /></div></div>
      <div className="room meeting-room"><div className="room-label">Meeting Room</div><div className="meeting-table"><span/><span/><span/><span/></div></div>
      <div className="room design-room"><div className="room-label">Design Studio</div><div className="cluster desks"><span/><span/><span/><span/></div></div>
      <div className="room finance-room"><div className="room-label">Finance</div><div className="finance-desks"><span/><span/></div></div>
      <div className="room support-room"><div className="room-label">Support</div><div className="support-counters"><span/><span/><span/></div></div>
      <div className="room break-room"><div className="room-label">Break Room</div><div className="break-table"><span/><span/><span/></div></div>
      {hotspots.map(({ room, cls }) => <button key={room} className={`room-hotspot ${cls} ${selectedRoom === room ? "selected" : ""}`} onClick={() => onRoomSelect?.(room)} aria-label={`Inspect ${room}`}>⌖</button>)}
      <div className="plant plant-1">🌿</div><div className="plant plant-2">🌿</div><div className="plant plant-3">🌿</div>
      <div className="reception"><span className="front-desk" /><small>Reception</small></div>
      {staff.map((person) => (
        <button
          key={person.id}
          className={`staff-token status-${person.status.toLowerCase()}`}
          style={{ left: `${person.x}%`, top: `${person.y}%`, "--staff-color": person.color } as CSSProperties}
          onClick={() => onSelect(person)}
          aria-label={`Open ${person.name}`}
        >
          <span className="staff-shadow" /><span className="staff-head">{avatar(person.name)}</span><span className="staff-body" />
          <span className="staff-name">{person.name.split(" ")[0]}</span>
        </button>
      ))}
      <div className="scene-hint"><Icon name="pin" /> Click a staff member or room</div>
    </div>
  );
}

function Sidebar({ page, setPage, theme, setTheme, onAdd }: { page: Page; setPage: (p: Page) => void; theme: "light" | "dark"; setTheme: (t: "light" | "dark") => void; onAdd: () => void }) {
  const items: [Page, string, string][] = [
    ["dashboard", "Dashboard", "grid"], ["office", "Office View", "office"], ["staff", "Staff", "people"],
    ["tasks", "Tasks", "tasks"], ["schedule", "Schedule", "calendar"], ["reports", "Reports", "reports"], ["settings", "Settings", "settings"],
  ];
  return (
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">⌂</div><div><strong>OfficeHub</strong><span>Your business in motion.</span></div></div>
      <nav>{items.map(([key, label, icon]) => <button key={key} onClick={() => setPage(key)} className={page === key ? "active" : ""}><Icon name={icon} /><span>{label}</span></button>)}</nav>
      <button className="sidebar-add" onClick={onAdd}><span className="add-mini">+</span><span>Add employee</span></button>
      <div className="sidebar-bottom">
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="theme-button"><Icon name={theme === "light" ? "moon" : "sun"} /><span>{theme === "light" ? "Dark mode" : "Light mode"}</span></button>
        <div className="user-card"><div className="user-avatar">AD</div><div><strong>Admin</strong><span>admin@company.com</span></div><span className="online-dot" /></div>
      </div>
    </aside>
  );
}

function Topbar({ page, onAdd }: { page: Page; onAdd: () => void }) {
  const title = page === "dashboard" ? "Good morning, Admin 👋" : page.charAt(0).toUpperCase() + page.slice(1);
  return <header className="topbar"><div><h1>{title}</h1><p>{page === "dashboard" ? "Here’s what’s happening in your office today." : `Manage your ${page} from one place.`}</p></div><div className="top-actions"><label className="search"><Icon name="search" /><input placeholder="Search anything..." /></label><button className="icon-button"><Icon name="bell" /><b>3</b></button><button className="top-add" onClick={onAdd}><Icon name="plus" /> Add employee</button><div className="date-chip">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div><div className="user-avatar small">AD</div></div></header>;
}

function Dashboard({ staff, running, setRunning, onSelect, onAdd, setPage }: { staff: Staff[]; running: boolean; setRunning: (v: boolean) => void; onSelect: (s: Staff) => void; onAdd: () => void; setPage: (p: Page) => void }) {
  const working = staff.filter((s) => s.status === "Working").length;
  return <div className="content">
    <div className="stats-grid">
      <StatCard label="Total staff" value={String(staff.length)} note="+2 from last week" icon="people" tone="blue" />
      <StatCard label="Active today" value={String(working)} note="+5 pending" icon="briefcase" tone="green" />
      <StatCard label="Meetings today" value="3" note="1 upcoming" icon="calendar" tone="purple" />
      <StatCard label="Office occupancy" value="85%" note="10 of 12 desks" icon="office" tone="orange" />
    </div>
    <div className="dashboard-grid">
      <section className="panel office-panel">
        <div className="panel-head"><div><h2>Office View</h2><p>See your people and workplace activity live.</p></div><div className="scene-controls"><span className="live-tag"><i />Live</span><button onClick={() => setRunning(!running)}>{<Icon name={running ? "pause" : "play"} />} {running ? "Pause" : "Run"} </button><button onClick={() => setPage("office")} className="view-link">Open full view <Icon name="arrow" /></button></div></div>
        <OfficeScene staff={staff} running={running} onSelect={onSelect} />
      </section>
      <aside className="side-stack">
        <section className="panel schedule-panel"><div className="panel-head compact"><div><h2>Today’s schedule</h2><p>Monday, Apr 28</p></div><button className="text-button" onClick={() => setPage("schedule")}>View all</button></div>
          {[["09:00", "Team Standup", "Meeting Room", "6 attendees"], ["11:00", "Client Call", "Conference Room", "4 attendees"], ["14:00", "Project Review", "Meeting Room", "5 attendees"]].map(([time, title, room, people]) => <div className="timeline-row" key={title}><div className="timeline-time">{time}</div><div className="timeline-line"><span/></div><div><strong>{title}</strong><small>{room} · {people}</small></div></div>)}
        </section>
        <section className="panel activity-panel"><div className="panel-head compact"><div><h2>Recent activity</h2><p>Live updates</p></div></div>
          {staff.slice(0, 4).map((person, i) => <div className="activity-row" key={person.id}><div className="person-avatar" style={{ background: person.color }}>{avatar(person.name)}</div><div><strong>{person.name}</strong><span>{["completed a task", "joined the meeting", "updated a project", "started a work block"][i]}</span><small>{i + 2}m ago</small></div></div>)}
        </section>
      </aside>
    </div>
    <div className="quick-row"><button onClick={onAdd}><span className="quick-icon"><Icon name="plus" /></span><div><strong>Add a new employee</strong><span>Bring another teammate into the office.</span></div><Icon name="arrow" /></button><button onClick={() => setPage("tasks")}><span className="quick-icon green"><Icon name="tasks" /></span><div><strong>Review today’s tasks</strong><span>4 tasks need attention.</span></div><Icon name="arrow" /></button><button onClick={() => setPage("reports")}><span className="quick-icon purple"><Icon name="reports" /></span><div><strong>See performance</strong><span>Weekly productivity is up 12%.</span></div><Icon name="arrow" /></button></div>
  </div>;
}

function StaffPage({ staff, onSelect, onAdd }: { staff: Staff[]; onSelect: (s: Staff) => void; onAdd: () => void }) {
  const departments = Array.from(new Set(staff.map((s) => s.department)));
  return <div className="content"><section className="panel"><div className="section-toolbar"><div><h2>Staff directory</h2><p>Manage team members, roles and current activity.</p></div><button className="primary" onClick={onAdd}><Icon name="plus" /> Add staff</button></div><div className="filter-row"><button className="filter active">All {staff.length}</button>{departments.map((d) => <button className="filter" key={d}>{d} {staff.filter((s) => s.department === d).length}</button>)}<label className="table-search"><Icon name="search"/><input placeholder="Search staff..." /></label></div><div className="staff-table"><div className="table-row head"><span>Name</span><span>Role</span><span>Department</span><span>Status</span><span>Task</span></div>{staff.map((person) => <button className="table-row" key={person.id} onClick={() => onSelect(person)}><span className="name-cell"><span className="person-avatar" style={{ background: person.color }}>{avatar(person.name)}</span><strong>{person.name}</strong></span><span>{person.role}</span><span>{person.department}</span><span><StatusPill status={person.status}/></span><span>{person.task}</span></button>)}</div></section></div>;
}

function TasksPage({ staff }: { staff: Staff[] }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [assigneeId, setAssigneeId] = useState<number | "">(staff[0]?.id ?? "");

  useEffect(() => {
    void fetch("/api/tasks").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.tasks) && data.tasks.length) {
        setTasks(data.tasks.map((task: Record<string, unknown>) => ({
          id: Number(task.id),
          title: String(task.title),
          assigneeId: task.assignee_id ? Number(task.assignee_id) : undefined,
          assignee: String(task.assignee_name ?? "Unassigned"),
          priority: String(task.priority) as Task["priority"],
          status: String(task.status) as Task["status"],
          dueLabel: String(task.due_label ?? "Today"),
        })));
      }
    }).catch(() => {});
  }, []);

  const defaults: Task[] = staff.slice(0, 5).map((person, i) => ({
    id: -i - 1,
    title: ["Update product catalog", "Design new landing page", "Process payroll", "Reply to client emails", "Inventory check"][i],
    assigneeId: person.id,
    assignee: person.name,
    priority: ["High", "Medium", "High", "Medium", "Low"][i] as Task["priority"],
    status: "Pending",
    dueLabel: "Today",
  }));

  const visibleTasks = tasks.length ? tasks : defaults;

  const createTask = async () => {
    const clean = title.trim();
    if (!clean) return;
    const assignee = staff.find((person) => person.id === assigneeId);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: clean, priority, assigneeId: assignee?.id ?? null }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((current) => [{
          id: Number(data.id ?? Date.now()),
          title: clean,
          assigneeId: assignee?.id,
          assignee: assignee?.name ?? "Unassigned",
          priority,
          status: "Pending",
          dueLabel: "Today",
        }, ...current.filter((task) => task.id > 0)]);
        setTitle(""); setCreating(false); return;
      }
    } catch {}
    setTasks((current) => [{
      id: Date.now(), title: clean, assigneeId: assignee?.id,
      assignee: assignee?.name ?? "Unassigned", priority, status: "Pending", dueLabel: "Today",
    }, ...(current.length ? current : defaults)]);
    setTitle(""); setCreating(false);
  };

  const toggleTask = (id: number) => setTasks((current) => current.map((task) =>
    task.id === id ? { ...task, status: task.status === "Completed" ? "Pending" : "Completed" } : task
  ));

  return <div className="content"><section className="panel"><div className="section-toolbar"><div><h2>Tasks</h2><p>Keep work moving across the office.</p></div><button className="primary" onClick={() => setCreating(true)}><Icon name="plus"/> New task</button></div><div className="task-grid">{visibleTasks.map((item) => <div className={`task-card ${item.status === "Completed" ? "task-done" : ""}`} key={item.id}><button className="task-title" onClick={() => toggleTask(item.id)}><span className={`checkbox ${item.status === "Completed" ? "checked" : ""}`}>{item.status === "Completed" ? "✓" : ""}</span><strong>{item.title}</strong><span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span></button><p>Assigned to {item.assignee}</p><div className="task-footer"><span>{item.status === "Completed" ? "Completed" : `Due ${item.dueLabel.toLowerCase()}`}</span><span>{item.status === "Completed" ? "✓" : "•"}</span></div></div>)}</div></section>{creating && <div className="modal-backdrop" onMouseDown={() => setCreating(false)}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><h2>New task</h2><p>Create work and assign it directly to a teammate.</p></div><button className="close-button" onClick={() => setCreating(false)}>×</button></div><label>Task title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Review customer requests" /></label><label>Assignee<select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : "")}><option value="">Unassigned</option>{staff.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label><label>Priority<select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])}>{["High","Medium","Low"].map((x) => <option key={x}>{x}</option>)}</select></label><div className="modal-actions"><button onClick={() => setCreating(false)} className="secondary">Cancel</button><button onClick={createTask} disabled={!title.trim()} className="primary">Create task</button></div></div></div>}</div>;
}
function SimplePage({ page, staff }: { page: Exclude<Page, "dashboard" | "office" | "staff" | "tasks">; staff: Staff[] }) {
  const copy: Record<typeof page, { title: string; desc: string; cards: [string, string][] }> = {
    schedule: { title: "Schedule", desc: "Plan meetings, shifts and focused work blocks.", cards: [["Today", "3 meetings · 6 staff blocks"], ["Tomorrow", "2 meetings · 4 staff blocks"], ["This week", "14 scheduled activities · 82% coverage"]] },
    reports: { title: "Reports", desc: "See where the team spends time and where work gets done.", cards: [["Productivity", "+12% vs last week"], ["Attendance", "96% average"], ["Meetings", "18h total this week"]] },
    settings: { title: "Settings", desc: "Configure your office, notifications and workspace.", cards: [["Workspace", "Main office · 12 desks"], ["Notifications", "Email + in-app enabled"], ["Appearance", "System-aware theme"]] },
  };
  const data = copy[page];
  return <div className="content"><section className="panel simple-page"><h2>{data.title}</h2><p>{data.desc}</p><div className="simple-cards">{data.cards.map(([a,b]) => <div key={a} className="simple-card"><span>{a}</span><strong>{b}</strong></div>)}</div><div className="placeholder-banner"><Icon name="spark"/><div><strong>{staff.length} teammates are currently connected.</strong><span>This area is ready for the next layer of real business data.</span></div></div></section></div>;
}

function StaffModal({ onClose, onSave }: { onClose: () => void; onSave: (s: Omit<Staff, "id" | "x" | "y">) => void | Promise<void> }) {
  const [name, setName] = useState(""); const [role, setRole] = useState(""); const [department, setDepartment] = useState("Operations");
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><h2>Add new employee</h2><p>Give a teammate a place in the virtual office.</p></div><button className="close-button" onClick={onClose}>×</button></div><div className="avatar-upload"><div className="upload-avatar">+</div><div><strong>Profile photo</strong><span>Optional for now</span></div></div><label>Full name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Morgan" /></label><label>Role<input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Sales Manager" /></label><label>Department<select value={department} onChange={(e) => setDepartment(e.target.value)}>{["Management","Design","Marketing","Finance","Support","Operations"].map((x) => <option key={x}>{x}</option>)}</select></label><div className="modal-actions"><button onClick={onClose} className="secondary">Cancel</button><button disabled={!name.trim() || !role.trim()} className="primary" onClick={() => { void onSave({ name: name.trim(), role: role.trim(), department, status: "Working", task: "Getting started", color: "#3b82f6" }); onClose(); }}>Add employee</button></div></div></div>;
}

function StaffDrawer({ staff, onClose }: { staff: Staff | null; onClose: () => void }) {
  if (!staff) return null;
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="drawer" onMouseDown={(e) => e.stopPropagation()}><button className="drawer-close" onClick={onClose}>×</button><div className="drawer-profile"><div className="big-avatar" style={{ background: staff.color }}>{avatar(staff.name)}</div><h2>{staff.name}</h2><p>{staff.role} · {staff.department}</p><StatusPill status={staff.status}/></div><div className="drawer-actions"><button><Icon name="chat"/> Message</button><button><Icon name="calendar"/> Schedule</button></div><div className="drawer-section"><span>Current task</span><strong>{staff.task}</strong><small>Updated just now</small></div><div className="drawer-section"><span>Today's schedule</span><div className="mini-timeline"><b>09:00</b><span>Team standup</span><b>11:00</b><span>Focus block</span><b>14:00</b><span>Project review</span></div></div><div className="drawer-section"><span>Location</span><strong><Icon name="pin"/> {staff.status === "Meeting" ? "Meeting Room" : staff.status === "Break" ? "Break Room" : "Assigned desk"}</strong></div></aside></div>;
}

export default function Home() {
  const [page, setPage] = useState<Page>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [staff, setStaff] = useState<Staff[]>(seedStaff);
  const [running, setRunning] = useState(true);
  const [selected, setSelected] = useState<Staff | null>(null);
  const [adding, setAdding] = useState(false);
  const [clock, setClock] = useState("09:42 AM");
  const [dbConfigured, setDbConfigured] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<OfficeRoom | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("officehub:staff");
      if (saved) setStaff(JSON.parse(saved) as Staff[]);
    } catch {}
    void fetch("/api/staff").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      setDbConfigured(Boolean(data.configured));
      if (Array.isArray(data.staff) && data.staff.length > 0) setStaff(data.staff as unknown as Staff[]);
    }).catch(() => {}).finally(() => setHydrated(true));
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem("officehub:staff", JSON.stringify(staff)); }, [staff, hydrated]);
  useEffect(() => { const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); tick(); const t = setInterval(tick, 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setStaff((current) => current.map((person) => {
        if (person.status === "Away") return person;
        const target = targetRoomForStaff(person.department, person.status, now);
        const next = advanceActor(person, target, 2.4);
        const arrived = next.location === target && Math.hypot(next.x - officeNodes[target].x, next.y - officeNodes[target].y) < 0.1;
        return {
          ...person,
          ...next,
          task: arrived ? (
            person.status === "Meeting" ? "Team sync" :
            person.status === "Break" ? "Taking a break" :
            person.task
          ) : person.task,
        };
      }));
    }, 450);
    return () => clearInterval(t);
  }, [running]);

  const addEmployee = async (newStaff: Omit<Staff, "id" | "x" | "y">) => {
    try {
      const res = await fetch("/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newStaff) });
      if (res.ok) {
        const data = await res.json();
        setDbConfigured(Boolean(data.configured));
        if (data.staff) { setStaff((current) => [{ ...(data.staff as Staff) }, ...current]); return; }
      }
    } catch {}
    setStaff((current) => [...current, { ...newStaff, id: Date.now(), x: 46, y: 58 }]);
  };

  const content = useMemo(() => {
    if (page === "dashboard") return <Dashboard staff={staff} running={running} setRunning={setRunning} onSelect={setSelected} onAdd={() => setAdding(true)} setPage={setPage} />;
    if (page === "office") return <div className="content"><section className="panel office-page"><div className="section-toolbar"><div><h2>Live office</h2><p>{running ? "Simulation running — staff follow role-based routines and room routes." : "Simulation paused."}</p></div><div className="office-actions">{selectedRoom && <span className="room-selected"><Icon name="pin"/> {selectedRoom}</span>}<button className={running ? "secondary" : "primary"} onClick={() => setRunning(!running)}><Icon name={running ? "pause" : "play"} /> {running ? "Pause simulation" : "Resume simulation"}</button></div></div><OfficeScene staff={staff} running={running} onSelect={setSelected} onRoomSelect={setSelectedRoom} selectedRoom={selectedRoom}/>{selectedRoom && <div className="room-inspector"><div><strong>{selectedRoom}</strong><span>{selectedRoom === "Meeting Room" ? "3 meetings scheduled today" : selectedRoom === "Break Room" ? "Staff wellness area" : `${staff.filter((s) => (s.location ?? homeRoomForDepartment(s.department)) === selectedRoom).length} staff linked to this room`}</span></div><button className="secondary" onClick={() => setSelectedRoom(null)}>Close</button></div>}</section></div>;
    if (page === "staff") return <StaffPage staff={staff} onSelect={setSelected} onAdd={() => setAdding(true)} />;
    if (page === "tasks") return <TasksPage staff={staff} />;
    return <SimplePage page={page} staff={staff} />;
  }, [page, staff, running]);
  return <div className={`app-shell theme-${theme}`}>
    <Sidebar page={page} setPage={setPage} theme={theme} setTheme={setTheme} onAdd={() => setAdding(true)} />
    <main className="main"><Topbar page={page} onAdd={() => setAdding(true)} /><div className="clock-strip"><span><i className="live-dot" /> Live office simulation</span><strong>{clock}</strong><span>{dbConfigured ? "SQLite connected" : "Local prototype mode"}</span></div>{content}</main>
    <StaffDrawer staff={selected} onClose={() => setSelected(null)} />
    {adding && <StaffModal onClose={() => setAdding(false)} onSave={addEmployee} />}
  </div>;
}