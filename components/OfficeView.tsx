"use client";

import type { OfficeRoom } from "../lib/office-sim";

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
};

type Props = {
  staff: Staff[];
  running: boolean;
  onSelect: (staff: Staff) => void;
  onRoomSelect?: (room: OfficeRoom) => void;
  selectedRoom?: OfficeRoom | null;
};

type RoomConfig = {
  room: OfficeRoom;
  label: string;
  icon: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tone: string;
};

const rooms: RoomConfig[] = [
  { room: "Manager Office", label: "Manager Office", icon: "M", x: 3.5, y: 4, w: 23, h: 25, tone: "rose" },
  { room: "Meeting Room", label: "Meeting Room", icon: "◆", x: 27.5, y: 4, w: 41, h: 25, tone: "blue" },
  { room: "Support", label: "Support", icon: "◎", x: 69.5, y: 4, w: 27, h: 34, tone: "violet" },
  { room: "Design Studio", label: "Design Studio", icon: "✦", x: 3.5, y: 32, w: 23, h: 34, tone: "green" },
  { room: "Open Office", label: "Open Office", icon: "▦", x: 27.5, y: 32, w: 41, h: 58, tone: "sky" },
  { room: "Finance", label: "Finance", icon: "▤", x: 69.5, y: 40.5, w: 27, h: 25, tone: "amber" },
  { room: "Reception", label: "Reception", icon: "⌂", x: 3.5, y: 69, w: 23, h: 21, tone: "orange" },
  { room: "Break Room", label: "Break Room", icon: "☕", x: 69.5, y: 68, w: 27, h: 22, tone: "teal" },
];

const roomForStaff = (person: Staff) => person.location ?? (
  person.status === "Meeting"
    ? "Meeting Room"
    : person.status === "Break"
      ? "Break Room"
      : person.department === "Management"
        ? "Manager Office"
        : person.department === "Design"
          ? "Design Studio"
          : person.department === "Finance"
            ? "Finance"
            : person.department === "Support"
              ? "Support"
              : person.department === "Operations" || person.department === "Marketing"
                ? "Open Office"
                : "Open Office"
);

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function RoomFurniture({ room }: { room: OfficeRoom }) {
  if (room === "Meeting Room") {
    return (
      <div className="floor-furniture meeting-furniture">
        <div className="meeting-screen">Weekly sync</div>
        <div className="meeting-table">
          {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
        </div>
      </div>
    );
  }

  if (room === "Manager Office") {
    return (
      <div className="floor-furniture manager-furniture">
        <div className="desk-shape" />
        <div className="plant-shape" />
        <div className="chair-shape" />
      </div>
    );
  }

  if (room === "Support") {
    return (
      <div className="floor-furniture desk-grid support-furniture">
        {Array.from({ length: 4 }, (_, index) => <div key={index}><span /><b /></div>)}
      </div>
    );
  }

  if (room === "Finance") {
    return (
      <div className="floor-furniture desk-grid finance-furniture">
        {Array.from({ length: 3 }, (_, index) => <div key={index}><span /><b /></div>)}
      </div>
    );
  }

  if (room === "Design Studio" || room === "Open Office") {
    return (
      <div className="floor-furniture desk-grid studio-furniture">
        {Array.from({ length: 6 }, (_, index) => <div key={index}><span /><b /></div>)}
      </div>
    );
  }

  if (room === "Reception") {
    return (
      <div className="floor-furniture reception-furniture">
        <div className="reception-desk"><strong>WELCOME</strong><span>Great things happen here</span></div>
        <div className="lounge-seat one" />
        <div className="lounge-seat two" />
      </div>
    );
  }

  return (
    <div className="floor-furniture break-furniture">
      <div className="kitchen-counter" />
      <div className="coffee-table" />
      <div className="break-sofa" />
    </div>
  );
}

export default function OfficeView({ staff, running, onSelect, onRoomSelect, selectedRoom }: Props) {
  const online = staff.filter((person) => person.status !== "Away").length;
  const moving = staff.filter((person) => person.walking).length;

  return (
    <div className="office-view">
      <div className="office-view-head">
        <div>
          <span className="office-eyebrow"><i /> LIVE WORKSPACE</span>
          <h3>Everyone is in the office</h3>
          <p>Click a teammate for details, or choose a room to inspect activity.</p>
        </div>
        <div className="office-view-metrics">
          <span><b>{online}</b> online</span>
          <span><b>{moving}</b> moving</span>
          <span><b>{staff.length}</b> total</span>
        </div>
      </div>

      <div className="office-canvas-wrap">
        <div className="office-canvas">
          <div className="floor-grid-lines" aria-hidden="true" />

          <div className="office-entry entry-left">MAIN ENTRANCE</div>
          <div className="office-entry entry-bottom">TEAM LOUNGE</div>

          {rooms.map((config) => {
            const active = selectedRoom === config.room;
            const roomStaff = staff.filter((person) => roomForStaff(person) === config.room);
            return (
              <button
                type="button"
                className={`office-room office-room-${config.tone} ${active ? "is-selected" : ""}`}
                key={config.room}
                style={{
                  left: `${config.x}%`,
                  top: `${config.y}%`,
                  width: `${config.w}%`,
                  height: `${config.h}%`,
                }}
                onClick={() => onRoomSelect?.(config.room)}
              >
                <span className="room-title"><i>{config.icon}</i>{config.label}</span>
                <span className="room-count">{roomStaff.length} {roomStaff.length === 1 ? "person" : "people"}</span>
                <RoomFurniture room={config.room} />
              </button>
            );
          })}

          <div className="office-corridor corridor-one" />
          <div className="office-corridor corridor-two" />

          {staff.map((person) => (
            <button
              type="button"
              key={person.id}
              className={`staff-token staff-${person.status.toLowerCase()} ${person.walking ? "is-walking" : ""}`}
              style={{ left: `${person.x}%`, top: `${person.y}%` }}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(person);
              }}
              title={`${person.name} — ${person.role}`}
            >
              <span className="staff-avatar" style={{ background: person.color }}>{initials(person.name)}</span>
              <span className="staff-label">
                <strong>{person.name.split(" ")[0]}</strong>
                <small>{person.walking ? "Walking" : person.status}</small>
              </span>
              <span className="staff-pulse" />
            </button>
          ))}

          <div className="office-live-badge">
            <span className={running ? "pulse-on" : "pulse-off"} />
            {running ? "Simulation live" : "Simulation paused"}
          </div>

          <div className="office-controls-hint">
            <span>Drag-free workspace</span>
            <small>Staff positions update automatically</small>
          </div>
        </div>
      </div>

      <div className="office-legend">
        <div className="legend-statuses">
          <span><i className="dot-working" /> Working</span>
          <span><i className="dot-meeting" /> In meeting</span>
          <span><i className="dot-break" /> On break</span>
          <span><i className="dot-away" /> Away</span>
        </div>
        <div className="legend-help">Select any staff avatar to open their profile</div>
      </div>
    </div>
  );
}
