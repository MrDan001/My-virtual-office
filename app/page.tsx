"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { activitySpotForStaff, advanceActor, homeRoomForDepartment, isAtTarget, officeNodes, targetRoomForStaff, routineForStaff, type OfficeRoom } from "../lib/office-sim";

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
  walking?: boolean;
  // Keep every character camera-facing while walking so nobody side-shuffles.
  facing?: "front" | "back";
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
  { id: 1, name: "Sarah Johnson", role: "Team Lead", department: "Management", status: "Meeting", task: "Weekly standup", x: 44, y: 25, color: "#f59e0b", location: "Meeting Room" },
  { id: 2, name: "Mike Williams", role: "Product Designer", department: "Design", status: "Working", task: "Landing page", x: 18, y: 50, color: "#22c55e", location: "Design Studio" },
  { id: 3, name: "Emma Davis", role: "Marketing", department: "Marketing", status: "Working", task: "Campaign review", x: 42, y: 45, color: "#a855f7", location: "Open Office" },
  { id: 4, name: "James Brown", role: "Accountant", department: "Finance", status: "Away", task: "Payroll", x: 51, y: 55, color: "#ef4444", location: "Finance" },
  { id: 5, name: "Lina Wilson", role: "Support Agent", department: "Support", status: "Working", task: "Customer inbox", x: 80, y: 20, color: "#06b6d4", location: "Support" },
  { id: 6, name: "David Miller", role: "Operations", department: "Operations", status: "Break", task: "Inventory check", x: 86.5, y: 82, color: "#3b82f6", location: "Break Room" },
];

const waypoints = [
  { x: 19, y: 74, room: "Support" }, { x: 32, y: 37, room: "Design" },
  { x: 53, y: 70, room: "Open Office" }, { x: 79, y: 69, room: "Finance" },
  { x: 68, y: 34, room: "Meeting Room" }, { x: 60, y: 17, room: "Break Room" },
  { x: 43, y: 17, room: "Corridor" }, { x: 83, y: 33, room: "Manager" },
];

const avatar = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2);

type RoomLayout = { x: number; y: number; w: number; h: number };

const DEFAULT_LAYOUT: Record<OfficeRoom, RoomLayout> = {
  Reception: { x: 35, y: 84, w: 8, h: 10 },
  "Manager Office": { x: 3, y: 5, w: 27, h: 28 },
  "Meeting Room": { x: 34, y: 5, w: 34, h: 28 },
  "Design Studio": { x: 3, y: 38, w: 38, h: 59 },
  Finance: { x: 45, y: 38, w: 23, h: 59 },
  Support: { x: 72, y: 5, w: 25, h: 44 },
  "Break Room": { x: 72, y: 53, w: 25, h: 44 },
  "Open Office": { x: 35, y: 34, w: 34, h: 61 },
};

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

function OfficeScene({ staff, running, onSelect, onRoomSelect, selectedRoom, layout = DEFAULT_LAYOUT, editing = false }: {
  staff: Staff[];
  running: boolean;
  onSelect: (s: Staff) => void;
  onRoomSelect?: (room: OfficeRoom) => void;
  selectedRoom?: OfficeRoom | null;
  layout?: Record<OfficeRoom, RoomLayout>;
  editing?: boolean;
}) {
  const rooms: { room: OfficeRoom; cls: string; furniture: string }[] = [
    { room: "Manager Office", cls: "manager-room", furniture: "manager-furniture" },
    { room: "Meeting Room", cls: "meeting-room", furniture: "meeting-furniture" },
    { room: "Design Studio", cls: "design-room", furniture: "design-furniture" },
    { room: "Finance", cls: "finance-room", furniture: "finance-furniture" },
    { room: "Support", cls: "support-room", furniture: "support-furniture" },
    { room: "Break Room", cls: "break-room", furniture: "break-furniture" },
  ];

  return (
    <div className={`office-scene ${running ? "is-running" : "is-paused"} ${editing ? "is-editing" : ""}`}>
      <div className="scene-sunlight" />
      <div className="scene-floor" />
      <div className="scene-window window-left"><span/><span/><span/></div>
      <div className="scene-window window-right"><span/><span/><span/></div>
      <div className="wall top-wall" /><div className="wall left-wall" />

      <div className="scene-corridor"><span>MAIN CORRIDOR</span></div>
      <div className="scene-lounge">
        <span className="lounge-sofa sofa-left" /><span className="lounge-sofa sofa-right" />
        <span className="lounge-table" /><span className="lounge-rug" />
        <span className="lounge-lamp" /><span className="lounge-plant">🌿</span>
      </div>

      {rooms.map(({ room, cls, furniture }) => {
        const box = layout[room];
        return <button
          key={room}
          className={`room ${cls} room-object ${selectedRoom === room ? "room-selected-object" : ""}`}
          style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
          onClick={() => onRoomSelect?.(room)}
          aria-label={`Inspect ${room}`}
        >
          <span className="room-ceiling" />
          <span className="room-label"><b>{room}</b><i /></span>
          {room === "Manager Office" && <span className="room-furniture manager-furniture"><span className="director-desk"><i/><i/></span><span className="guest-chair" /></span>}
          {room === "Meeting Room" && <span className="room-furniture meeting-furniture"><span className="meeting-table"><i/><i/><i/><i/></span><span className="whiteboard"><b>Q2</b><small>TEAM PLAN</small></span></span>}
          {room === "Design Studio" && <span className="room-furniture design-furniture"><span className="designer-desk d1" /><span className="designer-desk d2" /><span className="designer-desk d3" /><span className="designer-desk d4" /><span className="design-board">IDEAS</span></span>}
          {room === "Finance" && <span className="room-furniture finance-furniture"><span className="finance-desk f1" /><span className="finance-desk f2" /><span className="finance-desk f3" /><span className="finance-desk f4" /></span>}
          {room === "Support" && <span className="room-furniture support-furniture"><span className="support-bar s1" /><span className="support-bar s2" /><span className="support-bar s3" /><span className="support-screen">HELP DESK</span></span>}
          {room === "Break Room" && <span className="room-furniture break-furniture"><span className="kitchen-line" /><span className="break-counter" /><span className="round-table"><i/><i/><i/><i/></span><span className="coffee-bar">COFFEE</span></span>}
          <span className={`room-footer-chip ${furniture}`}>{room === "Manager Office" ? "Leadership" : room === "Meeting Room" ? "Collaboration" : room === "Break Room" ? "Wellness" : "Workspace"}</span>
        </button>;
      })}

      <div className="plant plant-1">🌿</div>
      <div className="plant plant-2">🌿</div>
      <div className="plant plant-3">🌿</div>
      <div className="floor-art art-1">✦</div>
      <div className="floor-art art-2">◌</div>
      <div className="reception"><span className="front-desk" /><strong>RECEPTION</strong><small>Welcome</small></div>

      {staff.map((person) => {
        const seated = !person.walking && person.status !== "Away";
        return <button
          key={person.id}
          className={`staff-token status-${person.status.toLowerCase()} ${seated ? "is-sitting" : "is-walking"} walk-facing-${person.facing ?? "front"}`}
          style={{ left: `${person.x}%`, top: `${person.y}%`, "--staff-color": person.color } as CSSProperties}
          onClick={(event) => { event.stopPropagation(); onSelect(person); }}
          aria-label={`Open ${person.name}`}
        >
          <span className="staff-shadow" />
          <span className="staff-chair" />
          <span className="staff-legs"><i/><i/></span>
          <span className="staff-body"><i className="staff-arm arm-left"/><i className="staff-arm arm-right"/><i className="staff-collar collar-left"/><i className="staff-collar collar-right"/><i className="staff-badge"/></span>
          <span className="staff-head"><i className="staff-hair"/><i className="staff-ear ear-left"/><i className="staff-ear ear-right"/><i className="staff-brow brow-left"/><i className="staff-brow brow-right"/><i className="staff-eye eye-left"/><i className="staff-eye eye-right"/><i className="staff-nose"/><i className="staff-mouth"/><i className="staff-cheek cheek-left"/><i className="staff-cheek cheek-right"/></span>
          <span className="staff-name">{person.name.split(" ")[0]}</span>
          <span className="staff-role">{person.role}</span>
          <span className="staff-state">{person.walking ? `Walking to ${person.location ?? "desk"}` : person.status === "Working" ? "At workstation" : person.status}</span>
        </button>;
      })}

      <div className="scene-hint"><Icon name="pin" /> {editing ? "Select a room, then move it from the inspector" : "Click a staff member or room"} </div>
      <div className="scene-legend"><span><i className="legend-sit" /> Working</span><span><i className="legend-meet" /> Meeting</span><span><i className="legend-break" /> Break</span></div>
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

  const toggleTask = async (id: number) => {
    const currentTask = visibleTasks.find((task) => task.id === id);
    if (!currentTask) return;
    const status: Task["status"] = currentTask.status === "Completed" ? "Pending" : "Completed";
    setTasks((current) => {
      const source = current.length ? current : defaults;
      return source.map((task) => task.id === id ? { ...task, status } : task);
    });
    if (id > 0) {
      try {
        const res = await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        });
        if (!res.ok) throw new Error("Could not save task status");
      } catch {
        setTasks((current) => current.map((task) => task.id === id ? { ...task, status: currentTask.status } : task));
      }
    }
  };

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
  const [layout, setLayout] = useState<Record<OfficeRoom, RoomLayout>>(DEFAULT_LAYOUT);
  const [editingLayout, setEditingLayout] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<OfficeRoom | null>(null);

  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem("officehub:layout");
      if (savedLayout) setLayout({ ...DEFAULT_LAYOUT, ...(JSON.parse(savedLayout) as Record<OfficeRoom, RoomLayout>) });
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
  useEffect(() => { if (hydrated) localStorage.setItem("officehub:layout", JSON.stringify(layout)); }, [layout, hydrated]);
  useEffect(() => { const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); tick(); const t = setInterval(tick, 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setStaff((current) => current.map((person) => {
        if (person.status === "Away") return { ...person, walking: false };

        const routine = routineForStaff(person.department, person.id, now);
        const targetRoom = targetRoomForStaff(person.department, routine.status);
        const targetPoint = activitySpotForStaff(person.department, routine.status, person.id);
        // Faster than the original prototype, but still eased by the CSS transition.
        const next = advanceActor(person, targetRoom, 1.25, targetPoint);
        const arrived = next.location === targetRoom && isAtTarget(next, targetPoint, 0.9);
        const dx = next.x - person.x;
        const dy = next.y - person.y;
        const facing: Staff["facing"] = Math.abs(dy) > Math.abs(dx) * 0.85
          ? (dy < 0 ? "back" : "front")
          : (person.facing ?? "front");

        return {
          ...person,
          status: routine.status as StaffStatus,
          ...next,
          walking: !arrived,
          facing,
          task: arrived ? routine.task : `Walking to ${targetRoom}`,
        };
      }));
    }, 650);
    return () => clearInterval(t);
  }, [running]);

  const addEmployee = async (newStaff: Omit<Staff, "id" | "x" | "y">) => {
    try {
      const res = await fetch("/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newStaff) });
      if (res.ok) {
        const data = await res.json();
        setDbConfigured(Boolean(data.configured));
        if (data.staff) {
          const saved = data.staff as Staff;
          const position = activitySpotForStaff(saved.department, "Working", saved.id);
          setStaff((current) => [{ ...saved, x: position.x, y: position.y, location: homeRoomForDepartment(saved.department), walking: false }, ...current]);
          return;
        }
      }
    } catch {}
    setStaff((current) => {
      const id = Date.now();
      const position = activitySpotForStaff(newStaff.department, "Working", id);
      return [...current, { ...newStaff, id, x: position.x, y: position.y, location: homeRoomForDepartment(newStaff.department), walking: false }];
    });
  };

  const content = useMemo(() => {
    if (page === "dashboard") {
      return <Dashboard staff={staff} running={running} setRunning={setRunning} onSelect={setSelected} onAdd={() => setAdding(true)} setPage={setPage} />;
    }
    if (page === "office") {
      const activeRoom = selectedRoom;
      return <div className="content"><section className="panel office-page">
        <div className="section-toolbar">
          <div>
            <h2>Live office</h2>
            <p>{editingLayout ? "Layout editor: select a room and reposition it with the controls." : running ? "Simulation running — staff follow role-based routines and connected room routes." : "Simulation paused."}</p>
          </div>
          <div className="office-actions">
            {activeRoom && <span className="room-selected"><Icon name="pin"/> {activeRoom}</span>}
            <button className={editingLayout ? "primary" : "secondary"} onClick={() => setEditingLayout((value) => !value)}>
              {editingLayout ? "Finish layout" : "Edit layout"}
            </button>
            <button className={running ? "secondary" : "primary"} onClick={() => setRunning(!running)}>
              <Icon name={running ? "pause" : "play"} /> {running ? "Pause simulation" : "Resume simulation"}
            </button>
          </div>
        </div>
        <OfficeScene staff={staff} running={running} onSelect={setSelected} onRoomSelect={setSelectedRoom} selectedRoom={activeRoom} layout={layout} editing={editingLayout}/>
        {activeRoom && <div className="room-inspector">
          <div>
            <strong>{activeRoom}</strong>
            <span>{staff.filter((s) => (s.location ?? homeRoomForDepartment(s.department)) === activeRoom).length} staff linked · {editingLayout ? "move the room with the controls" : "inspect room activity"}</span>
          </div>
          {editingLayout ? <div className="move-controls">
            <button className="secondary" onClick={() => setLayout((current) => ({ ...current, [activeRoom]: { ...current[activeRoom], y: Math.max(0, current[activeRoom].y - 2) } }))}>↑</button>
            <button className="secondary" onClick={() => setLayout((current) => ({ ...current, [activeRoom]: { ...current[activeRoom], x: Math.max(0, current[activeRoom].x - 2) } }))}>←</button>
            <button className="secondary" onClick={() => setLayout((current) => ({ ...current, [activeRoom]: { ...current[activeRoom], x: Math.min(100 - current[activeRoom].w, current[activeRoom].x + 2) } }))}>→</button>
            <button className="secondary" onClick={() => setLayout((current) => ({ ...current, [activeRoom]: { ...current[activeRoom], y: Math.min(100 - current[activeRoom].h, current[activeRoom].y + 2) } }))}>↓</button>
            <button className="secondary" onClick={() => setLayout(DEFAULT_LAYOUT)}>Reset</button>
          </div> : <button className="secondary" onClick={() => setSelectedRoom(null)}>Close</button>}
        </div>}
      </section></div>;
    }
    if (page === "staff") return <StaffPage staff={staff} onSelect={setSelected} onAdd={() => setAdding(true)} />;
    if (page === "tasks") return <TasksPage staff={staff} />;
    return <SimplePage page={page} staff={staff} />;
  }, [page, staff, running, selectedRoom, layout, editingLayout]);
  return <div className={`app-shell theme-${theme}`}>
    <Sidebar page={page} setPage={setPage} theme={theme} setTheme={setTheme} onAdd={() => setAdding(true)} />
    <main className="main"><Topbar page={page} onAdd={() => setAdding(true)} /><div className="clock-strip"><span><i className="live-dot" /> Live office simulation</span><strong>{clock}</strong><span>{dbConfigured ? "SQLite connected" : "Local prototype mode"}</span></div>{content}</main>
    <StaffDrawer staff={selected} onClose={() => setSelected(null)} />
    {adding && <StaffModal onClose={() => setAdding(false)} onSave={addEmployee} />}
  </div>;
}